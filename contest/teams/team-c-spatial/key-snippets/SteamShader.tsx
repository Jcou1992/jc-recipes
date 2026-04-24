// components/spatial/SteamShader.tsx
//
// Login hero. Volumetric terracotta light + steam plume from bottom-right.
// Fullscreen shader plane, one draw call per frame, zero geometry cost.
//
// Tier 2 only. Tier 0/1 render a poster WebP via <img> (see posters/).

'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useSpatialTier } from '@/lib/spatial/use-spatial-tier';
import preludeSrc from '@/lib/spatial/shader-prelude.glsl?raw';

const FRAG = `
${preludeSrc}

void main(){
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 p  = uv * 2.0 - 1.0;
  p.x *= uResolution.x / uResolution.y;

  float t = uTime * 0.08 * (1.0 - uReducedMot);

  // ── Volumetric terracotta pool (the hearth) ─────────────────────────
  vec2 lightPos = vec2(0.0, -0.15);
  float d = length(p - lightPos);
  float falloff = 1.0 / (1.0 + d * d * 2.2);
  float nmask = fbm(p * 1.6 + vec2(0.0, t * 2.0));
  float light = falloff * (0.85 + 0.3 * nmask);

  vec3 col = BRAND_INK;
  col = mix(col, BRAND_TERRACOTTA, light * 0.8);
  col = mix(col, BRAND_GOLD,       pow(light, 3.5) * 0.5);

  // ── Steam plume — curl-noise, bottom-right (the stockpot) ──────────
  vec2 sp = (p - vec2(0.8, -0.9)) * vec2(1.0, 0.7);
  float steamMask = smoothstep(0.7, 0.0, length(sp));
  vec2 warp = curl2(sp * 2.0 + vec2(0.0, -t * 1.5)) * 0.15;
  float steam = fbm(sp * 2.5 + warp + vec2(0.0, -t * 6.0)) *
                smoothstep(0.0, 1.0, -sp.y);
  steam *= steamMask;
  col += vec3(0.95, 0.88, 0.75) * steam * 0.18;

  // ── Edge vignette + grain ───────────────────────────────────────────
  col *= clamp(vignette(uv, 0.35) + 0.4, 0.4, 1.0);
  col += grain(gl_FragCoord.xy, 0.03);

  // Light theme — invert the luminance slightly (paper, not ink)
  col = mix(BRAND_BONE - col, col, uThemeDark);

  gl_FragColor = vec4(col, 1.0);
}
`;

const VERT = `void main() { gl_Position = vec4(position, 1.0); }`;

export default function SteamShader() {
  const tier = useSpatialTier();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (tier < 2 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
      premultipliedAlpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    const scene = new THREE.Scene();
    const camera = new THREE.Camera(); // fullscreen shader — no camera math

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:       { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uDPR:        { value: Math.min(window.devicePixelRatio, 2) },
        uMouse:      { value: new THREE.Vector2(0.5, 0.5) },
        uScroll:     { value: 0 },
        uThemeDark:  { value: document.documentElement.dataset.theme === 'light' ? 0 : 1 },
        uGpuTier:    { value: tier === 3 ? 1.0 : tier === 2 ? 0.8 : 0.5 },
        uReducedMot: { value: matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0 },
        // Unused by this shader but shared prelude requires them
        uKeyPos:     { value: new THREE.Vector3() },
        uFillPos:    { value: new THREE.Vector3() },
        uRimPos:     { value: new THREE.Vector3() },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    scene.add(quad);

    const clock = new THREE.Clock();
    let raf = 0;
    let active = true;

    const render = () => {
      if (!active) return;
      raf = requestAnimationFrame(render);
      mat.uniforms.uTime.value = clock.getElapsedTime() % 10000;
      renderer.render(scene, camera);
    };
    render();

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      mat.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    };
    const onVisibility = () => {
      if (document.hidden) {
        active = false;
        cancelAnimationFrame(raf);
      } else if (!active) {
        active = true;
        render();
      }
    };
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    // Context-loss recovery — Safari drops WebGL on tab switch sometimes
    const onContextLost = (e: Event) => { e.preventDefault(); active = false; };
    const onContextRestored = () => { active = true; render(); };
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    return () => {
      active = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      mat.dispose();
      (quad.geometry as THREE.BufferGeometry).dispose();
      renderer.dispose();
    };
  }, [tier]);

  // SSR + Tier 0/1 — no canvas, poster is shown by the parent instead.
  if (tier < 2) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-spatial-canvas="login"
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 0, animation: 'spatial-fade-in 620ms var(--ease-camera) forwards 80ms' }}
    />
  );
}
