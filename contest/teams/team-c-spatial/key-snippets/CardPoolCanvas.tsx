// components/spatial/CardPoolCanvas.tsx
//
// One pooled canvas serving ALL visible recipe cards. On hover, we
// scissor-render the card's material sample into the 88×88 corner well
// of that specific card. No canvas-per-card — that would be ruinous.
//
// Desktop-only behaviour (hover + pointer: fine). On touch, we render
// the 2D poster fallback and skip this component entirely.

'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useSpatialTier } from '@/lib/spatial/use-spatial-tier';
import { getMaterial, type MaterialName } from '@/lib/spatial/material-library';
import { buildPassLineRig } from '@/lib/spatial/lighting-rig';

interface Recipe {
  id: string;
  material: MaterialName;
}

export default function CardPoolCanvas({ recipes }: { recipes: Recipe[] }) {
  const tier = useSpatialTier();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isTouch = useRef(false);

  useEffect(() => {
    isTouch.current = matchMedia('(hover: none) or (pointer: coarse)').matches;
  }, []);

  useEffect(() => {
    if (tier < 2 || isTouch.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: true,
      powerPreference: 'low-power',
      premultipliedAlpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setScissorTest(true);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0, 3.4);

    // Rig
    const rig = buildPassLineRig({ scale: 0.8 });
    scene.add(rig.key, rig.keyTarget, rig.fill, rig.rim, rig.ambient);

    // Pool: one mesh per material type, visible=false by default
    const pool: Record<MaterialName, THREE.Mesh> = {} as any;
    (['clay', 'cedar', 'iron', 'porcelain', 'gold', 'shoji'] as MaterialName[]).forEach(name => {
      const m = getMaterial(name);
      pool[name] = m;
      m.visible = false;
      scene.add(m);
    });

    type HoverState = {
      material: MaterialName;
      rect: { x: number; y: number; w: number; h: number };
      tiltX: number; tiltY: number;
    } | null;
    let hover: HoverState = null;
    let active = true;
    let raf = 0;

    const render = () => {
      if (!active) return;
      raf = requestAnimationFrame(render);
      if (!hover) return;
      const mesh = pool[hover.material];
      if (!mesh) return;
      mesh.rotation.y += 0.005;
      mesh.rotation.x += (hover.tiltY * 0.12 - mesh.rotation.x) * 0.14;

      const dpr = renderer.getPixelRatio();
      const r = hover.rect;
      renderer.setScissor(
        r.x * dpr,
        (window.innerHeight - r.y - r.h) * dpr,
        r.w * dpr,
        r.h * dpr,
      );
      renderer.setViewport(
        r.x * dpr,
        (window.innerHeight - r.y - r.h) * dpr,
        r.w * dpr,
        r.h * dpr,
      );
      renderer.clear();
      renderer.render(scene, camera);
    };
    render();

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const card = (e.target as HTMLElement).closest<HTMLElement>('[data-recipe-id]');
      if (!card) {
        hover = null;
        renderer.clear();
        return;
      }
      const id = card.dataset.recipeId!;
      const recipe = recipes.find(r => r.id === id);
      if (!recipe) return;
      // Hide all, show this one
      Object.values(pool).forEach(m => (m.visible = false));
      pool[recipe.material].visible = true;

      // The card's material "well" is always top-right, 88×88 (or 140×140 for featured)
      const featured = card.hasAttribute('data-featured');
      const size = featured ? 140 : 88;
      const inset = featured ? 24 : 14;
      const cr = card.getBoundingClientRect();
      hover = {
        material: recipe.material,
        rect: { x: cr.right - inset - size, y: cr.top + inset, w: size, h: size },
        tiltX: (e.clientX / window.innerWidth) * 2 - 1,
        tiltY: (e.clientY / window.innerHeight) * 2 - 1,
      };
    };
    const onLeave = () => {
      hover = null;
      renderer.clear();
    };

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    };
    const onVis = () => {
      if (document.hidden) { active = false; cancelAnimationFrame(raf); }
      else if (!active) { active = true; render(); }
    };
    const onScroll = () => { hover = null; renderer.clear(); };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVis);
    // Scroll invalidates card rects — drop hover cheaply
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      active = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('scroll', onScroll);
      Object.values(pool).forEach(m => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      renderer.dispose();
    };
  }, [tier, recipes]);

  if (tier < 2) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-spatial-canvas="card-pool"
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 5 }}  // above cards (z:0) but below chrome (z:10) + dialogs (z:50)
    />
  );
}
