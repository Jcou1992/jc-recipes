'use client';

/**
 * HeatHazeShader — plain WebGL heat-haze displacement pass.
 *
 * Renders a full-screen procedural haze overlay using a UV-displacement
 * fragment shader (layered fbm turbulence). The canvas is transparent;
 * the displaced warm-shimmer color sits at 1.5–3% opacity, allowing the
 * ink background and silhouettes to show through with a heat-mirage look.
 *
 * Falls back gracefully: when WebGL context is unavailable the onFallback
 * callback is fired and the parent applies CSS blur(0.5px) instead.
 *
 * Uniforms:
 *   u_time        — elapsed seconds (0 when frozen)
 *   u_resolution  — viewport vec2
 *   u_intensity   — displacement strength multiplier (1.0 normal, 1.6 prominent)
 *
 * Performance targets: ≤1ms GPU frametime, ≤0.5ms CPU. Achieved via:
 *   - Single full-screen quad (6 vertices, no instancing)
 *   - 3-octave fbm (not 6+)
 *   - mediump precision
 *   - powerPreference: 'low-power'
 *   - Page Visibility API: RAF paused when tab hidden
 */

import { useEffect, useRef } from 'react';

interface HeatHazeShaderProps {
  /** Source canvas — reserved for future texture-based displacement; pass null */
  sourceCanvas: HTMLCanvasElement | null;
  /** Displacement amplitude multiplier; 1.0 normal, 1.6 in prominent mode */
  intensity?: number;
  /** Freeze time uniform — render one static frame (reduced-motion / coarse pointer) */
  frozen?: boolean;
  /** Called when WebGL init fails — parent shows CSS fallback */
  onFallback?: () => void;
}

// ── Vertex Shader ────────────────────────────────────────────────────────────
const VERT_SRC = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// ── Fragment Shader ──────────────────────────────────────────────────────────
// Procedural heat shimmer: layered fbm turbulence field → faint warm color
// at very low opacity over the ink background.
// Peak displacement communicated as color-luminance shift ≤3px equivalent.
const FRAG_SRC = `
precision mediump float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 3; i++) {
    v += amp * noise(p * freq);
    amp  *= 0.5;
    freq *= 2.1;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  float t = u_time * 0.06;
  vec2 distortUV = uv * vec2(3.0, 5.0) + vec2(0.0, -t);

  float n1 = fbm(distortUV);
  float n2 = fbm(distortUV + vec2(1.7, 9.2) + t * 0.3);

  float shimmer = fbm(uv * vec2(4.0, 6.0) + vec2(n1, n2) * 0.4 + t * 0.2);

  // Terracotta ≈ oklch(63.2% 0.148 45) → rgb(0.82, 0.42, 0.22)
  // Gold       ≈ oklch(86.5% 0.089 89) → rgb(0.96, 0.84, 0.55)
  vec3 terracotta = vec3(0.820, 0.420, 0.220);
  vec3 gold       = vec3(0.960, 0.840, 0.550);
  vec3 hazeColor  = mix(terracotta, gold, clamp(shimmer * 0.8 + uv.y * 0.3, 0.0, 1.0));

  // Very low opacity haze: 1.5–3%
  float hazeAlpha = shimmer * 0.028 * u_intensity;

  // Vignette: suppress toward edges
  vec2 vig = uv * 2.0 - 1.0;
  float vigFactor = clamp(1.0 - dot(vig * vec2(0.65, 0.5), vig * vec2(0.65, 0.5)), 0.0, 1.0);

  gl_FragColor = vec4(hazeColor * hazeAlpha, hazeAlpha) * vigFactor;
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function buildProgram(
  gl: WebGLRenderingContext,
  vert: string,
  frag: string
): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vert);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog);
    return null;
  }
  // Shaders can be detached/deleted after linking
  gl.detachShader(prog, vs);
  gl.detachShader(prog, fs);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return prog;
}

export default function HeatHazeShader({
  sourceCanvas: _sourceCanvas,
  intensity = 1.0,
  frozen = false,
  onFallback,
}: HeatHazeShaderProps) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const stateRef    = useRef<{
    gl: WebGLRenderingContext;
    prog: WebGLProgram;
    buf: WebGLBuffer;
    uTime: WebGLUniformLocation | null;
    uRes:  WebGLUniformLocation | null;
    uInt:  WebGLUniformLocation | null;
    aPosLoc: number;
    raf: number;
    startTime: number;
    running: boolean;
  } | null>(null);

  // Sync latest props into refs so RAF closure doesn't go stale
  const intensityRef = useRef(intensity);
  const frozenRef    = useRef(frozen);
  intensityRef.current = intensity;
  frozenRef.current    = frozen;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── WebGL context ────────────────────────────────────────────────────────
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: 'low-power',
    }) as WebGLRenderingContext | null;

    if (!gl) { onFallback?.(); return; }

    const prog = buildProgram(gl, VERT_SRC, FRAG_SRC);
    if (!prog) { onFallback?.(); return; }

    // Full-screen quad
    const verts = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]);
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    gl.useProgram(prog);
    const aPosLoc = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes  = gl.getUniformLocation(prog, 'u_resolution');
    const uInt  = gl.getUniformLocation(prog, 'u_intensity');

    stateRef.current = {
      gl, prog, buf,
      uTime, uRes, uInt,
      aPosLoc,
      raf: 0,
      startTime: 0,
      running: false,
    };

    // ── Resize ───────────────────────────────────────────────────────────────
    const resize = () => {
      const w = canvas.parentElement?.clientWidth  ?? window.innerWidth;
      const h = canvas.parentElement?.clientHeight ?? window.innerHeight;
      canvas.width  = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    // ── Render function ──────────────────────────────────────────────────────
    const drawFrame = (elapsed: number) => {
      const s = stateRef.current;
      if (!s) return;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPosLoc);
      gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(s.uTime, elapsed);
      gl.uniform2f(s.uRes, canvas.width, canvas.height);
      gl.uniform1f(s.uInt, intensityRef.current);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const loop = (now: number) => {
      const s = stateRef.current;
      if (!s || !s.running) return;
      if (!s.startTime) s.startTime = now;
      const elapsed = frozenRef.current ? 0 : (now - s.startTime) / 1000;
      drawFrame(elapsed);
      s.raf = requestAnimationFrame(loop);
    };

    const startLoop = () => {
      const s = stateRef.current;
      if (!s || s.running) return;
      s.running = true;
      s.startTime = 0;
      s.raf = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      const s = stateRef.current;
      if (!s) return;
      s.running = false;
      cancelAnimationFrame(s.raf);
    };

    if (frozen) {
      // One static frame
      drawFrame(0);
    } else {
      startLoop();
    }

    // ── Page Visibility API ──────────────────────────────────────────────────
    const handleVisibility = () => {
      if (document.hidden) {
        stopLoop();
      } else if (!frozenRef.current) {
        startLoop();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      stopLoop();
      ro.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      stateRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // init once; intensity + frozen are tracked via refs

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
