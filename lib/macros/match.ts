import { createClient } from '@/lib/supabase/server';

export interface FdcCandidate {
  fdc_id: number;
  name: string;
  similarity: number;
}

const AUTO_MATCH_TOP_MIN = 0.75;
const AUTO_MATCH_GAP_MIN = 0.15;
const AUTO_MATCH_TOKEN_MIN = 3;

export async function searchFdc(query: string, limit = 5): Promise<FdcCandidate[]> {
  const normalized = query.trim();
  if (normalized.length < 2) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('search_nutrition_facts', {
    query: normalized,
    max_results: limit,
  });

  if (error || !data) return [];
  return data as FdcCandidate[];
}

export async function autoMatch(ingredientName: string): Promise<number | null> {
  const tokenCount = ingredientName.trim().split(/\s+/).filter(Boolean).length;
  if (tokenCount < AUTO_MATCH_TOKEN_MIN) return null;

  const candidates = await searchFdc(ingredientName, 2);
  if (candidates.length === 0) return null;
  const top = candidates[0];
  if (top.similarity < AUTO_MATCH_TOP_MIN) return null;

  if (candidates.length >= 2) {
    const gap = top.similarity - candidates[1].similarity;
    if (gap < AUTO_MATCH_GAP_MIN) return null;
  }

  return top.fdc_id;
}
