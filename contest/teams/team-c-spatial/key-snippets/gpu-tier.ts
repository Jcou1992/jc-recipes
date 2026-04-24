// lib/spatial/gpu-tier.ts
//
// Single source of truth for "how much 3D can this device take?".
// Runs once per session, caches result in sessionStorage.
//
// Tiers:
//   0 — poster: CSS fallbacks only (reduced-motion, save-data, low-RAM, no WebGL)
//   1 — baked:  pre-rendered WebP poster images + CSS
//   2 — live:   full WebGL2 scenes w/ shaders
//   3 — webgpu: opt-in via NEXT_PUBLIC_SPATIAL_WEBGPU=1
//
// The gamble: GPU micro-bench on init. ~3ms cost, one time. Better than
// guessing from useragent.

export type Tier = 0 | 1 | 2 | 3;

const CACHE_KEY = 'sekai-spatial-tier';
const BENCH_THRESHOLD_HIGH_MS = 8;   // <8ms for one 256² frame → Tier 2
const BENCH_THRESHOLD_LOW_MS  = 16;  // >16ms → Tier 1

export function detectTier(): Tier {
  // Force override for QA
  const forced = typeof process !== 'undefined' &&
                 process.env.NEXT_PUBLIC_SPATIAL_FORCE_TIER;
  if (forced) {
    const t = parseInt(forced, 10);
    if (t >= 0 && t <= 3) return t as Tier;
  }

  // Kill switch
  if (typeof process !== 'undefined' &&
      process.env.NEXT_PUBLIC_SPATIAL_ENABLED === '0') return 0;

  if (typeof window === 'undefined') return 0; // SSR — always fallback

  // ── Cached result
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached !== null) {
      const t = parseInt(cached, 10);
      if (t >= 0 && t <= 3) return t as Tier;
    }
  } catch { /* storage blocked — fall through */ }

  const tier = runDetection();
  try { sessionStorage.setItem(CACHE_KEY, String(tier)); } catch {}
  return tier;
}

function runDetection(): Tier {
  // 1. Reduced motion — hard no
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;

  // 2. Save-Data — respect user preference
  const conn = (navigator as any).connection;
  if (conn?.saveData === true) return 0;

  // 3. Device memory / CPU
  const mem = (navigator as any).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (mem <= 2 || cores <= 2) return 1;

  // 4. WebGL context
  let gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;
  let canvas: HTMLCanvasElement | null = null;
  try {
    canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    gl = canvas.getContext('webgl2') ||
         canvas.getContext('webgl') as WebGLRenderingContext | null;
  } catch { return 0; }
  if (!gl) return 0;

  // 5. Software renderer detection
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  if (dbg) {
    const renderer = String(gl.getParameter((dbg as any).UNMASKED_RENDERER_WEBGL) || '');
    if (/SwiftShader|Microsoft Basic Render|llvmpipe|Software/i.test(renderer)) {
      return 0;
    }
  }

  // 6. Micro-bench: one ShaderMaterial frame, measure gl.finish() round-trip
  try {
    const start = performance.now();
    // Create a trivial program + draw call
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, `attribute vec2 p; void main(){ gl_Position = vec4(p,0,1); }`);
    gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, `
      precision mediump float;
      void main(){
        vec2 uv = gl_FragCoord.xy / 256.0;
        float v = 0.0;
        for(int i=0;i<16;i++){ v += sin(uv.x*float(i)) * cos(uv.y*float(i)); }
        gl_FragColor = vec4(vec3(v*0.1), 1.0);
      }
    `);
    gl.compileShader(fs);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]),
      gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, 256, 256);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.finish();
    const elapsed = performance.now() - start;

    // Clean up
    gl.deleteProgram(prog);
    gl.deleteShader(vs); gl.deleteShader(fs);
    gl.deleteBuffer(buf);
    canvas.remove();

    if (elapsed > BENCH_THRESHOLD_LOW_MS) return 1;

    // 7. WebGPU upgrade path
    if ((navigator as any).gpu &&
        typeof process !== 'undefined' &&
        process.env.NEXT_PUBLIC_SPATIAL_WEBGPU === '1') {
      // Don't await — best-effort. Tier 2 is the safe choice if WebGPU init stalls.
      return 2;
    }

    return elapsed < BENCH_THRESHOLD_HIGH_MS ? 2 : 1;
  } catch {
    return 1;
  }
}
