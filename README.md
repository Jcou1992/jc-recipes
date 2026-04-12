# jc-recipes

Personal recipe manager. Save, organize and cook from your phone without distractions.

## What it does

- **Recipe list** — all your recipes in one place, with search and tag filters
- **Create & edit** — manual form or paste markdown and let the app parse it
- **Recipe detail** — ingredients, steps, notes, times and tags
- **Serving scaler** — adjust portions on the fly without modifying the base recipe
- **Cooking mode** — fullscreen, one step at a time, per-step countdown timer, screen stays on
- **Markdown import** — paste a recipe from your AI assistant and it auto-fills the form

## Stack

Next.js 15 App Router · Tailwind CSS · Supabase (auth + database + RLS)

---

## Markdown import format

The app parses a specific markdown structure. Use this format when asking your AI assistant to generate recipes.

### Full example

```markdown
# Pasta al pesto

> Pasta fresca con pesto genovés y parmesano.

**Prep time:** 10 min
**Cook time:** 15 min
**Servings:** 2

## Ingredients
- 200g spaghetti
- 2 cups hojas de albahaca fresca
- 3 cloves ajo
- 50g parmesano rallado
- 3 tbsp aceite de oliva
- 1 pinch sal

## Steps
1. Hervir agua con sal abundante.
2. Cocer la pasta según el paquete. [timer: 10min]
3. Mezclar albahaca, ajo, parmesano y aceite en procesadora hasta obtener pasta.
4. Escurrir la pasta reservando un poco del agua de cocción.
5. Mezclar pasta con pesto. Agregar agua de cocción si hace falta.
6. Servir con parmesano extra.

## Notes
El pesto no debe calentarse para no oxidar la albahaca. Agregar agua de cocción de a poco.

## Tags
pasta, italiano, rápido, vegetariano
```

### Format reference

| Element | Format | Notes |
|---|---|---|
| Title | `# Nombre` | H1, required |
| Description | `> texto` | Blockquote before sections, optional |
| Prep time | `**Prep time:** 20 min` | Also accepts `1h`, `1h 30min`, `1.5h` |
| Cook time | `**Cook time:** 45 min` | Same formats as prep time |
| Servings | `**Servings:** 4` | Integer |
| Ingredients | `## Ingredients` then `- cantidad unidad nombre` | List with `-` or `*` |
| Steps | `## Steps` then `1. texto` | Numbered list with `.` or `)` |
| Step timer | `[timer: 5min]` | Append to any step text |
| Notes | `## Notes` then free text | Optional section |
| Tags | `## Tags` then `tag1, tag2, tag3` | Comma-separated on one line |

**Supported units:** g, kg, mg, ml, l, dl, cup, tbsp, tsp, oz, lb, pinch, dash, clove, slice, piece, can, bunch, handful, sprig

**Ingredient format:** `cantidad unidad nombre` — e.g. `200g harina`, `2 tbsp aceite`, `3 cloves ajo`, `1 lemon`

---

## Prompt for your AI assistant

Copy and paste this when asking for a recipe:

```
Generate the recipe for [RECIPE NAME] in this exact markdown format:

# [Recipe name]

> [One-line description]

**Prep time:** X min
**Cook time:** X min
**Servings:** X

## Ingredients
- [amount][unit] [ingredient name]
- [amount][unit] [ingredient name]

## Steps
1. [Step text.] [timer: Xmin] (add timer only for steps that require waiting)
2. [Step text.]

## Notes
[Optional tips, variations, sourcing notes.]

## Tags
[tag1, tag2, tag3]

Rules:
- Use metric units (g, kg, ml, l) except for tablespoons (tbsp) and teaspoons (tsp)
- Each ingredient on its own line starting with -
- Steps numbered starting at 1 with a period after the number
- Add [timer: Xmin] at the end of any step that requires waiting (cooking, resting, marinating)
- Tags in lowercase, comma-separated
- No extra text outside the markdown block
```

---

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (Jest)
npx playwright test  # e2e tests (Desktop Chrome + Mobile Safari + Mobile Chrome)
```

Requires `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
TEST_USER_PASSWORD=
```
