// lib/spatial/lighting-rig.ts
//
// The pass-line rig. Every WebGL surface that needs lighting reuses this
// function so materials read consistently across screens. Any change to
// the rig (e.g. time-of-day) lives here, nowhere else.

import * as THREE from 'three';

export interface RigOptions {
  /** Scale intensity globally (0.5–1.5). Default 1.0. */
  scale?: number;
  /** 'pass-line' (default), 'dawn', 'service'. */
  variant?: 'pass-line' | 'dawn' | 'service';
}

export interface PassLineRig {
  key: THREE.SpotLight;
  keyTarget: THREE.Object3D;
  fill: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
  ambient: THREE.AmbientLight;
}

const VARIANTS = {
  'pass-line': {
    keyColor: 0xffd9a0, keyIntensity: 1.8,  keyTemp: 3200,
    fillColor: 0x88aaff, fillIntensity: 0.32,
    rimColor: 0xffffff, rimIntensity: 0.9,
    ambient: 0.08,
  },
  'dawn': {
    keyColor: 0xffc88a, keyIntensity: 1.4,  keyTemp: 2800,
    fillColor: 0xa2b8ff, fillIntensity: 0.4,
    rimColor: 0xfff0e0, rimIntensity: 0.7,
    ambient: 0.1,
  },
  'service': {
    keyColor: 0xffd08a, keyIntensity: 2.1,  keyTemp: 3100,
    fillColor: 0x7088cc, fillIntensity: 0.26,
    rimColor: 0xfff8ea, rimIntensity: 0.72,
    ambient: 0.06,
  },
};

export function buildPassLineRig(opts: RigOptions = {}): PassLineRig {
  const scale = opts.scale ?? 1.0;
  const v = VARIANTS[opts.variant ?? 'pass-line'];

  // Key — tungsten spotlight, above-front, cone 35°
  const key = new THREE.SpotLight(
    v.keyColor,
    v.keyIntensity * scale,
    20,              // distance
    (35 * Math.PI) / 180,  // angle
    0.6,             // penumbra
    1.0              // decay
  );
  key.position.set(0, 4, 4);
  key.castShadow = true;
  key.shadow.mapSize.width = 512;
  key.shadow.mapSize.height = 512;
  key.shadow.bias = -0.0005;

  const keyTarget = new THREE.Object3D();
  keyTarget.position.set(0, 0, 0);
  key.target = keyTarget;

  // Fill — cool bounce from below-left, wide cone
  const fill = new THREE.DirectionalLight(v.fillColor, v.fillIntensity * scale);
  fill.position.set(-3, -1, 2);

  // Rim — sharp backlight, right side, cool
  const rim = new THREE.DirectionalLight(v.rimColor, v.rimIntensity * scale);
  rim.position.set(-1.5, 1, -2);

  // Ambient — kills pure black, keeps mood
  const ambient = new THREE.AmbientLight(0xffffff, v.ambient);

  return { key, keyTarget, fill, rim, ambient };
}

/**
 * Pick rig variant from local hour.
 * Dawn: 5–10. Service: 17–22. Pass-line: default.
 */
export function variantForHour(): 'pass-line' | 'dawn' | 'service' {
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return 'dawn';
  if (h >= 17 && h < 22) return 'service';
  return 'pass-line';
}
