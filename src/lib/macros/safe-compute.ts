import { computeRecipeMacros } from '@/lib/macros/compute';

export async function safeCompute(recipeId: string): Promise<void> {
  try {
    await computeRecipeMacros(recipeId);
  } catch (err) {
    console.error('macros compute failed', err);
  }
}
