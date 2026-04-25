// components/spatial/PassLineStage.tsx
//
// Cook mode — the restaurant pass. One cedar plank, N porcelain plates,
// one tungsten key light that TRAVELS to the current step. The light moves,
// not the camera, not the plates. This is the single most diegetic moment
// in the app: JC will recognise it from every kitchen he's ever worked in.
//
// Tier 2 — live WebGL. Tier 1 — CSS + transform on DOM plates.
// Tier 0 — existing step-slide animation (no plates at all).

'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useSpatialTier } from '@/lib/spatial/use-spatial-tier';
import { buildPassLineRig } from '@/lib/spatial/lighting-rig';

interface Props {
  steps: Array<{ text: string }>;
  currentStep: number;  // 0-indexed
  height?: number;      // px, default 240
}

export default function PassLineStage({ steps, currentStep, height = 240 }: Props) {
  const tier = useSpatialTier();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    plates?: THREE.Mesh[];
    keyLight?: THREE.SpotLight;
    targetKeyX?: number;
    raf?: number;
  }>({});

  // ── Initialise scene (Tier 2+) ─────────────────────────────────────
  useEffect(() => {
    if (tier < 2 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const w = canvas.clientWidth, h = canvas.clientHeight;

    const renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 40);
    camera.position.set(0, 2.2, 7.5);
    camera.lookAt(0, 0, 0);

    // Pass: a long cedar plank
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.25, 2.4),
      new THREE.MeshStandardMaterial({
        color: 0x7A5836, roughness: 0.55, metalness: 0.0,
      })
    );
    plank.receiveShadow = true;
    plank.position.y = -0.3;
    scene.add(plank);

    // Plates — one porcelain disc per step, spaced along X
    const N = steps.length;
    const spacing = 1.6;
    const plates: THREE.Mesh[] = [];
    for (let i = 0; i < N; i++) {
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.06, 48),
        new THREE.MeshPhysicalMaterial({
          color: 0xF4F1E8, roughness: 0.08, metalness: 0.0,
          clearcoat: 0.8, clearcoatRoughness: 0.1,
        })
      );
      plate.castShadow = true;
      plate.receiveShadow = true;
      plate.position.x = (i - (N - 1) / 2) * spacing;
      plate.position.y = -0.15;
      scene.add(plate);
      plates.push(plate);
    }

    // Lighting rig (shared)
    const rig = buildPassLineRig();
    scene.add(rig.key);
    scene.add(rig.keyTarget);
    scene.add(rig.fill);
    scene.add(rig.rim);
    scene.add(rig.ambient);

    stateRef.current = {
      renderer, scene, camera, plates,
      keyLight: rig.key,
      targetKeyX: 0,
    };

    // ── Animation loop
    let active = true;
    const render = () => {
      if (!active) return;
      stateRef.current.raf = requestAnimationFrame(render);
      // Smooth-lerp key light to target X
      const target = stateRef.current.targetKeyX ?? 0;
      rig.key.position.x += (target - rig.key.position.x) * 0.14;
      rig.keyTarget.position.x = rig.key.position.x;
      // Breathe fill slightly (restaurant air movement)
      rig.fill.intensity = 0.32 + Math.sin(performance.now() * 0.0004) * 0.03;
      renderer.render(scene, camera);
    };
    render();

    const onResize = () => {
      const w2 = canvas.clientWidth, h2 = canvas.clientHeight;
      renderer.setSize(w2, h2, false);
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
    };
    const onVis = () => {
      if (document.hidden) { active = false; cancelAnimationFrame(stateRef.current.raf!); }
      else if (!active) { active = true; render(); }
    };
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVis);

    return () => {
      active = false;
      cancelAnimationFrame(stateRef.current.raf!);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      scene.traverse(obj => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        const m = (obj as THREE.Mesh).material as THREE.Material | THREE.Material[];
        if (Array.isArray(m)) m.forEach(mat => mat.dispose());
        else if (m) m.dispose();
      });
      renderer.dispose();
    };
  }, [tier, steps.length]);

  // ── Relight: move the key when currentStep changes (the diegetic moment) ──
  useEffect(() => {
    if (tier < 2) return;
    const s = stateRef.current;
    if (!s.plates || !s.plates[currentStep]) return;
    s.targetKeyX = s.plates[currentStep].position.x;

    // Soft "dhink" pulse — brightness bump on arrival
    if (s.keyLight) {
      const target = 1.8;
      s.keyLight.intensity = 2.4;
      const id = setInterval(() => {
        s.keyLight!.intensity += (target - s.keyLight!.intensity) * 0.2;
        if (Math.abs(s.keyLight!.intensity - target) < 0.02) {
          s.keyLight!.intensity = target;
          clearInterval(id);
        }
      }, 16);
      return () => clearInterval(id);
    }
  }, [currentStep, tier]);

  // Tier 0 fallback — no stage at all, just the existing step card
  if (tier === 0) return null;

  // Tier 1 fallback — CSS-only plates + CSS-animated key light
  if (tier === 1) {
    return (
      <div
        className="relative rounded-xl overflow-hidden mb-6"
        style={{
          height,
          background: 'linear-gradient(180deg, oklch(14% 0.005 40) 0%, oklch(10% 0.005 40) 100%)',
        }}
        aria-hidden="true"
        data-spatial-canvas="cook"
      >
        <div
          className="absolute bottom-0 left-0 right-0 h-2/5"
          style={{
            background: 'var(--mat-cedar-2d)',
            opacity: 0.45,
            maskImage: 'linear-gradient(180deg, black 0%, black 60%, transparent 100%)',
          }}
        />
        <div
          className="absolute flex items-end gap-7 px-14 pb-7"
          style={{ inset: 0, overflowX: 'auto' }}
        >
          {steps.map((_, i) => {
            const active = i === currentStep;
            const prev = i < currentStep;
            return (
              <div
                key={i}
                className="flex-none rounded-full transition-all"
                style={{
                  width: 88, height: 88,
                  background: 'var(--mat-porcelain-2d)',
                  filter: active ? 'brightness(1.1)' : prev ? 'brightness(.25) sepia(.4)' : 'brightness(.45)',
                  transform: active ? 'translateY(-6px) scale(1.08)' : 'translateY(10px) scale(.82)',
                  boxShadow: active
                    ? '0 20px 50px color-mix(in oklch, var(--hdr-pass-lamp) 55%, transparent)'
                    : '0 2px 8px oklch(0 0 0 / 0.5)',
                  transitionDuration: 'var(--motion-pass-relight)',
                  transitionTimingFunction: 'var(--ease-camera)',
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Tier 2 live canvas
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-spatial-canvas="cook"
      className="w-full rounded-xl overflow-hidden mb-6"
      style={{ height }}
    />
  );
}
