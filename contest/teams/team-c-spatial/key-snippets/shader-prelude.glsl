// shader-prelude.glsl
//
// Every fragment shader in SEKAI imports this prelude. Uniform names are
// shared across all scenes so that the lighting rig, mouse, scroll, and
// tier gates work identically everywhere.
//
// Embed in JS as a string via `import prelude from './shader-prelude.glsl?raw'`
// (webpack/Next.js supports ?raw out of the box).
//
// ── Uniforms (set by useThreeScene() host) ─────────────────────────────
uniform float uTime;         // seconds since mount, wraps at 10000
uniform vec2  uResolution;   // canvas px
uniform float uDPR;          // device pixel ratio, capped at 2.0
uniform vec2  uMouse;        // 0..1, lerped 0.12 damping
uniform float uScroll;       // 0..1 normalized page scroll
uniform float uThemeDark;    // 1.0 dark, 0.0 light
uniform float uGpuTier;      // 0.0 / 0.5 / 1.0 — quality gate
uniform float uReducedMot;   // 1.0 when prefers-reduced-motion: reduce

// Pass-line lighting rig positions (world space)
uniform vec3  uKeyPos;       // tungsten 3200K above-front
uniform vec3  uFillPos;      // cool bounce below-left
uniform vec3  uRimPos;       // sharp backlight

// ── Constants ────────────────────────────────────────────────────────────
const vec3 BRAND_TERRACOTTA = vec3(0.830, 0.440, 0.250);  // #D4703F
const vec3 BRAND_GOLD       = vec3(0.929, 0.820, 0.555);  // #EDD18E
const vec3 BRAND_BONE       = vec3(0.929, 0.910, 0.863);  // #EDE8DC
const vec3 BRAND_INK        = vec3(0.040, 0.042, 0.050);

// ── Hash + value noise (shared primitive) ──────────────────────────────
float hash11(float n){ return fract(sin(n) * 43758.5453); }
float hash21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2  hash22(vec2 p){
  p = vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
}

float noise2(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i),              hash21(i + vec2(1,0)), u.x),
             mix(hash21(i + vec2(0,1)),  hash21(i + vec2(1,1)), u.x), u.y);
}

float fbm(vec2 p){
  // 5 octaves on Tier 2, 3 on Tier 1 (quality-gated by host)
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++){
    v += a * noise2(p);
    p *= 2.02;
    a *= 0.5;
    if (uGpuTier < 0.5 && i >= 2) break;  // mid-GPU: stop early
  }
  return v;
}

// ── Curl noise — the thing that makes steam read as steam, not smoke ─
vec2 curl2(vec2 p){
  const float EPS = 0.01;
  float n1 = noise2(p + vec2(0.0, EPS));
  float n2 = noise2(p - vec2(0.0, EPS));
  float n3 = noise2(p + vec2(EPS, 0.0));
  float n4 = noise2(p - vec2(EPS, 0.0));
  return vec2((n1 - n2) / (2.0 * EPS), -(n3 - n4) / (2.0 * EPS));
}

// ── Anisotropic specular (gold leaf) ───────────────────────────────────
float anisoSpec(vec3 N, vec3 V, vec3 L, vec3 T, float rough, float aniso){
  vec3 H = normalize(L + V);
  float NdotH = max(dot(N, H), 0.0);
  float TdotH = dot(T, H);
  float sinT  = sqrt(1.0 - NdotH * NdotH);
  float power = 2.0 / (rough * rough) - 2.0;
  float aniso2 = 1.0 - aniso;
  return pow(NdotH, power) *
         pow(1.0 - abs(TdotH) * aniso2, 2.0) *
         sinT;
}

// ── Pass-line rig — diffuse + specular from 3 lights ──────────────────
struct RigResult { vec3 diffuse; vec3 specular; };
RigResult passLineRig(vec3 N, vec3 V, vec3 P, float rough, float metal){
  RigResult r;
  r.diffuse  = vec3(0.0);
  r.specular = vec3(0.0);

  // Key (warm tungsten)
  vec3 Lk = normalize(uKeyPos - P);
  float kd = max(dot(N, Lk), 0.0);
  r.diffuse += kd * vec3(1.00, 0.82, 0.60) * 1.4;

  // Fill (cool bounce)
  vec3 Lf = normalize(uFillPos - P);
  float fd = max(dot(N, Lf), 0.0);
  r.diffuse += fd * vec3(0.55, 0.68, 0.90) * 0.35;

  // Rim (sharp backlight)
  vec3 Lr = normalize(uRimPos - P);
  float rd = pow(1.0 - max(dot(N, V), 0.0), 3.0) *
             max(dot(N, Lr), 0.0);
  r.specular += rd * vec3(1.0, 0.95, 0.85) * 0.8;

  // Ambient — kill pure black without killing mood
  r.diffuse += vec3(0.04);

  return r;
}

// ── Vignette — soft desaturate at frame edge ──────────────────────────
float vignette(vec2 uv, float strength){
  vec2 p = uv - 0.5;
  float d = length(p);
  return 1.0 - d * strength;
}

// ── Grain (film-style) ────────────────────────────────────────────────
float grain(vec2 fragCoord, float amount){
  return (hash21(fragCoord + uTime) - 0.5) * amount;
}
