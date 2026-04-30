#!/usr/bin/env node
// Idempotent: creates jc@, demo@, test@ Supabase users and resets demo/test
// recipe content to a curated sample set.
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

const CURATED_RECIPES = [
  {
    name: 'Classic Smash Burger',
    description: 'Thin, crispy-edged beef patties smashed on a hot griddle with American cheese and sharp pickle.',
    servings: 4,
    serving_size_label: '1 burger',
    prep_time: 10,
    cook_time: 8,
    tags: ['beef', 'service', 'classic'],
    notes: 'Use 80/20 chuck for flavor. Press once; after that, leave the crust alone.',
    ingredients: [
      { amount: 454, unit: 'g', name: 'ground beef chuck (80/20)' },
      { amount: 4, unit: null, name: 'brioche buns, split' },
      { amount: 4, unit: null, name: 'American cheese slices' },
      { amount: 8, unit: null, name: 'pickle rounds' },
      { amount: 1, unit: null, name: 'white onion, thinly sliced' },
      { amount: 2, unit: 'tbsp', name: 'burger sauce' },
    ],
    steps: [
      { order: 1, content: 'Divide beef into 4 loose balls. Salt all sides.', timer_seconds: null },
      { order: 2, content: 'Heat cast iron over high heat until nearly smoking.', timer_seconds: null },
      { order: 3, content: 'Smash each ball hard for 10 seconds. Sear without moving.', timer_seconds: 90 },
      { order: 4, content: 'Flip, add cheese, and cook until melted.', timer_seconds: 45 },
      { order: 5, content: 'Toast buns, sauce both sides, stack with onion and pickle.', timer_seconds: 60 },
    ],
  },
  {
    name: 'Miso Butter Salmon',
    description: 'Weeknight salmon with a lacquered miso butter glaze, scallions, and rice.',
    servings: 2,
    serving_size_label: '1 fillet',
    prep_time: 8,
    cook_time: 12,
    tags: ['fish', 'weeknight', 'japanese'],
    notes: 'Pull the salmon when the center is still glossy; carryover finishes it.',
    ingredients: [
      { amount: 2, unit: null, name: 'salmon fillets' },
      { amount: 2, unit: 'tbsp', name: 'white miso' },
      { amount: 1, unit: 'tbsp', name: 'unsalted butter, softened' },
      { amount: 1, unit: 'tbsp', name: 'mirin' },
      { amount: 1, unit: 'tsp', name: 'soy sauce' },
      { amount: 2, unit: null, name: 'scallions, sliced' },
    ],
    steps: [
      { order: 1, content: 'Mix miso, butter, mirin, and soy into a paste.', timer_seconds: null },
      { order: 2, content: 'Pat salmon dry and spread glaze over the top.', timer_seconds: null },
      { order: 3, content: 'Roast at 425°F until the glaze darkens at the edges.', timer_seconds: 720 },
      { order: 4, content: 'Rest 2 minutes, then finish with scallions.', timer_seconds: 120 },
    ],
  },
  {
    name: 'Charred Broccolini With Lemon',
    description: 'Fast green side with blistered stems, lemon, garlic, and toasted sesame.',
    servings: 3,
    prep_time: 5,
    cook_time: 7,
    tags: ['vegetable', 'side', 'fast'],
    notes: 'The pan must be hot enough to char before the stems steam.',
    ingredients: [
      { amount: 340, unit: 'g', name: 'broccolini' },
      { amount: 1, unit: 'tbsp', name: 'olive oil' },
      { amount: 1, unit: null, name: 'garlic clove, grated' },
      { amount: 1, unit: null, name: 'lemon, zested and juiced' },
      { amount: 1, unit: 'tbsp', name: 'toasted sesame seeds' },
    ],
    steps: [
      { order: 1, content: 'Trim broccolini ends and dry the stems well.', timer_seconds: null },
      { order: 2, content: 'Sear in oil over high heat until spotted and tender-crisp.', timer_seconds: 300 },
      { order: 3, content: 'Add garlic for the final 30 seconds.', timer_seconds: 30 },
      { order: 4, content: 'Finish with lemon zest, lemon juice, sesame, and salt.', timer_seconds: null },
    ],
  },
  {
    name: 'Late-Night Tomato Eggs',
    description: 'Soft eggs folded through jammy tomatoes for a quick rice bowl.',
    servings: 2,
    prep_time: 6,
    cook_time: 10,
    tags: ['eggs', 'rice bowl', 'comfort'],
    notes: 'Cook the eggs first and pull them soft; they return to the pan at the end.',
    ingredients: [
      { amount: 4, unit: null, name: 'eggs' },
      { amount: 3, unit: null, name: 'ripe tomatoes, chopped' },
      { amount: 1, unit: null, name: 'scallion, sliced' },
      { amount: 1, unit: 'tsp', name: 'soy sauce' },
      { amount: 1, unit: 'tsp', name: 'sugar' },
      { amount: 2, unit: null, name: 'bowls cooked rice' },
    ],
    steps: [
      { order: 1, content: 'Beat eggs with a pinch of salt. Scramble softly, then remove.', timer_seconds: 90 },
      { order: 2, content: 'Cook tomatoes with sugar and soy until saucy.', timer_seconds: 420 },
      { order: 3, content: 'Fold eggs back in just until glossy.', timer_seconds: 45 },
      { order: 4, content: 'Spoon over rice and finish with scallion.', timer_seconds: null },
    ],
  },
];

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

async function resetRecipesForUser(userId, label) {
  const { error: deleteError, count } = await admin
    .from('recipes')
    .delete({ count: 'exact' })
    .eq('user_id', userId);
  if (deleteError) throw new Error(`Failed to clear ${label} recipes: ${deleteError.message}`);

  const rows = CURATED_RECIPES.map(recipe => ({ user_id: userId, ...recipe }));
  const { error: insertError } = await admin.from('recipes').insert(rows);
  if (insertError) throw new Error(`Failed to insert ${label} recipes: ${insertError.message}`);
  console.log(`  + Reset ${label} recipes: deleted ${count ?? 0}, inserted ${rows.length}`);
}

async function main() {
  console.log('Seeding users + demo content...\n');
  const created = [];
  for (const u of users) {
    created.push(await upsertUser(u));
  }
  const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@sakai.app';
  const demo = created.find(u => u.email === demoEmail);
  const testUser = created.find(u => u.email === 'test@jc-recipes.local');
  if (!demo || !testUser) throw new Error('Demo/test users missing after upsert');
  await resetRecipesForUser(demo.id, demo.email ?? demoEmail);
  await resetRecipesForUser(testUser.id, testUser.email ?? 'test@jc-recipes.local');
  console.log('\nDone.');
}

main().catch(err => { console.error('\n✗', err.message); process.exit(1); });
