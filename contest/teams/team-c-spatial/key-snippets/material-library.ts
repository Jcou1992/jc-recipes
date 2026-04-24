// lib/spatial/material-library.ts
//
// The six materials. Each is (geometry + MeshStandardMaterial|MeshPhysicalMaterial)
// built from the CSS custom properties in tokens-spatial.css. Reading from
// computed styles keeps the design-system source of truth in ONE place.

import * as THREE from 'three';

export type MaterialName = 'clay' | 'cedar' | 'iron' | 'porcelain' | 'gold' | 'shoji';

/**
 * Read a material uniform from CSS custom property, fall back to default.
 * Parses `--mat-{name}-{prop}` like "0.82" or "oklch(...)".
 */
function readMaterialUniform(name: MaterialName, prop: string, fallback: number): number {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(`--mat-${name}-${prop}`).trim();
  const n = parseFloat(v);
  return isFinite(n) ? n : fallback;
}

function readMaterialColor(name: MaterialName, fallbackHex: number): THREE.Color {
  if (typeof document === 'undefined') return new THREE.Color(fallbackHex);
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(`--mat-${name}-color`).trim();
  if (!v) return new THREE.Color(fallbackHex);
  try {
    // three accepts CSS colour strings including oklch via Color.setStyle
    const c = new THREE.Color();
    c.setStyle(v);
    return c;
  } catch {
    return new THREE.Color(fallbackHex);
  }
}

/**
 * Build a material + mesh pair for the pool canvas. One call per material.
 * Geometry is intentionally distinctive-but-neutral — the viewer reads it
 * as "a sample of the surface", not as an object.
 */
export function getMaterial(name: MaterialName): THREE.Mesh {
  switch (name) {
    case 'clay': {
      const mat = new THREE.MeshStandardMaterial({
        color: readMaterialColor('clay', 0xB27048),
        roughness: readMaterialUniform('clay', 'rough', 0.82),
        metalness: readMaterialUniform('clay', 'metal', 0.0),
        flatShading: true,
      });
      return new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 2), mat);
    }
    case 'cedar': {
      const mat = new THREE.MeshStandardMaterial({
        color: readMaterialColor('cedar', 0x7A5836),
        roughness: readMaterialUniform('cedar', 'rough', 0.55),
        metalness: readMaterialUniform('cedar', 'metal', 0.0),
      });
      return new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 1.1), mat);
    }
    case 'iron': {
      const mat = new THREE.MeshStandardMaterial({
        color: readMaterialColor('iron', 0x1F1F22),
        roughness: readMaterialUniform('iron', 'rough', 0.45),
        metalness: readMaterialUniform('iron', 'metal', 0.9),
      });
      return new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.0, 0.22, 48, 1, false), mat);
    }
    case 'porcelain': {
      const mat = new THREE.MeshPhysicalMaterial({
        color: readMaterialColor('porcelain', 0xF4F1E8),
        roughness: readMaterialUniform('porcelain', 'rough', 0.08),
        metalness: readMaterialUniform('porcelain', 'metal', 0.0),
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
      });
      return new THREE.Mesh(
        new THREE.SphereGeometry(0.92, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.55),
        mat,
      );
    }
    case 'gold': {
      const mat = new THREE.MeshStandardMaterial({
        color: readMaterialColor('gold', 0xE8C668),
        roughness: readMaterialUniform('gold', 'rough', 0.22),
        metalness: readMaterialUniform('gold', 'metal', 1.0),
      });
      return new THREE.Mesh(new THREE.TorusKnotGeometry(0.55, 0.17, 80, 12), mat);
    }
    case 'shoji': {
      const mat = new THREE.MeshPhysicalMaterial({
        color: readMaterialColor('shoji', 0xECE5D2),
        roughness: readMaterialUniform('shoji', 'rough', 1.0),
        metalness: 0.0,
        transmission: readMaterialUniform('shoji', 'transmit', 0.55),
        ior: readMaterialUniform('shoji', 'ior', 1.5),
        thickness: 0.5,
      });
      return new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0, 1, 1), mat);
    }
  }
}

/**
 * Map a recipe's tags to its best-fit material. Pure function, cheap.
 * Order matters — first match wins.
 */
const TAG_MATCHERS: Array<[RegExp, MaterialName]> = [
  [/\b(dessert|sweet|cake|bake|pastry|chocolate|ice cream)\b/i, 'porcelain'],
  [/\b(salad|raw|cold|fresh|vegetable|veg|herb|no[\s-]?cook)\b/i, 'cedar'],
  [/\b(meat|beef|burger|steak|grill|bbq|smoke|sear|chicken|pork|lamb)\b/i, 'iron'],
  [/\b(bread|dough|pasta|pizza|pie|ferment|slow)\b/i, 'clay'],
  [/\b(japanese|dashi|miso|shoyu|tea|zen|ryotei)\b/i, 'shoji'],
  [/\b(gold|leaf|gilded|celebrat|michelin)\b/i, 'gold'],
];

export function materialForRecipe(tags: string[] | null | undefined): MaterialName {
  if (!tags || tags.length === 0) return 'clay';
  const hay = tags.join(' ').toLowerCase();
  for (const [re, mat] of TAG_MATCHERS) {
    if (re.test(hay)) return mat;
  }
  return 'clay';
}
