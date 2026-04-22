#!/usr/bin/env node
// Idempotent: creates jc@, demo@, test@ Supabase users + seeds demo@ with one recipe.
// Usage: node scripts/seed-users.mjs
// Requires env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//               JC_USER_EMAIL, JC_USER_PASSWORD,
//               DEMO_USER_EMAIL, DEMO_USER_PASSWORD,
//               TEST_USER_PASSWORD (existing)

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env.local manually (no dotenv dep required).
// Tolerant parser: skips comments + blank lines, trims whitespace around key
// and value, strips matching surrounding quotes. Key charset allows uppercase,
// underscore, digits, and dots (Supabase/Next conventions).
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');
const loaded = [];
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip surrounding matching quotes.
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) continue;
    if (!process.env[key]) process.env[key] = value;
    loaded.push(key);
  }
}

const REQUIRED = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JC_USER_PASSWORD', 'DEMO_USER_PASSWORD', 'TEST_USER_PASSWORD'];
const missing = REQUIRED.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error('ERROR: missing env vars:');
  for (const k of missing) console.error(`  - ${k}`);
  console.error('\nKeys loaded from .env.local:', loaded.length ? loaded.join(', ') : '(none)');
  console.error('Check .env.local for exact key names + non-empty values.');
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const users = [
  { email: process.env.JC_USER_EMAIL   || 'jc@sakai.app',       password: process.env.JC_USER_PASSWORD,   role: 'JC (primary)' },
  { email: process.env.DEMO_USER_EMAIL || 'demo@sakai.app',     password: process.env.DEMO_USER_PASSWORD, role: 'Demo (showcase)' },
  { email: 'test@jc-recipes.local',                             password: process.env.TEST_USER_PASSWORD, role: 'QA (e2e tests)' },
];

const HAMBURGER = {
  name: 'Classic Smash Burger',
  description: 'Thin, crispy-edged beef patties smashed on a hot griddle. Melted American, brioche bun, classic garnish.',
  servings: 4,
  prep_time: 10,
  cook_time: 8,
  tags: ['beef', 'classic', 'american'],
  notes: 'Use 80/20 chuck for flavor. Press only once — the sear locks in on contact.',
  ingredients: [
    { amount: 454, unit: 'g',    name: 'ground beef chuck (80/20)' },
    { amount: 4,   unit: null,   name: 'brioche buns, split' },
    { amount: 4,   unit: null,   name: 'American cheese slices' },
    { amount: 4,   unit: null,   name: 'iceberg lettuce leaves' },
    { amount: 2,   unit: null,   name: 'ripe tomatoes, sliced' },
    { amount: 1,   unit: null,   name: 'white onion, thinly sliced' },
    { amount: 8,   unit: null,   name: 'pickle rounds' },
    { amount: 1,   unit: 'tbsp', name: 'ketchup + yellow mustard mix' },
  ],
  steps: [
    { order: 1, content: 'Divide beef into 4 equal loose balls. Salt generously on all sides.', timer_seconds: null },
    { order: 2, content: 'Heat cast-iron griddle or skillet over high heat until smoking.', timer_seconds: null },
    { order: 3, content: 'Place beef ball on griddle, press hard with spatula for 10 seconds. Sear without moving.', timer_seconds: 90 },
    { order: 4, content: 'Flip patty, top with cheese. Cook 45 seconds until cheese melts.', timer_seconds: 45 },
    { order: 5, content: 'Toast bun halves on griddle, cut-side down, until golden.', timer_seconds: 60 },
    { order: 6, content: 'Stack: bottom bun, sauce, patty, onion, pickle, tomato, lettuce, top bun. Serve immediately.', timer_seconds: null },
  ],
};

async function upsertUser({ email, password, role }) {
  // Check if exists
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users?.find(u => u.email === email);
  if (existing) {
    console.log(`  ✓ User exists: ${email} (${role})`);
    return existing;
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`Failed to create ${email}: ${error.message}`);
  console.log(`  + Created user: ${email} (${role})`);
  return data.user;
}

async function seedDemoRecipe(demoUserId) {
  const { data: existing } = await admin
    .from('recipes')
    .select('id')
    .eq('user_id', demoUserId)
    .eq('name', HAMBURGER.name)
    .maybeSingle();
  if (existing) {
    console.log(`  ✓ Demo recipe exists: ${HAMBURGER.name}`);
    return;
  }
  const { error } = await admin.from('recipes').insert({ user_id: demoUserId, ...HAMBURGER });
  if (error) throw new Error(`Failed to insert demo recipe: ${error.message}`);
  console.log(`  + Seeded demo recipe: ${HAMBURGER.name}`);
}

async function main() {
  console.log('Seeding users + demo content...\n');
  const created = [];
  for (const u of users) {
    created.push(await upsertUser(u));
  }
  const demo = created.find(u => u.email === (process.env.DEMO_USER_EMAIL || 'demo@sakai.app'));
  if (!demo) throw new Error('Demo user missing after upsert');
  await seedDemoRecipe(demo.id);
  console.log('\nDone.');
}

main().catch(err => { console.error('\n✗', err.message); process.exit(1); });
