export interface UserPreferences {
  user_id: string;
  space_name: string | null;
  tour_completed_at: string | null;
  tour_dismissed_until: string | null;
  preferred_font_size: 'sm' | 'md' | 'lg' | null;
  preferred_theme: 'system' | 'dark' | 'light' | null;
  preferred_language: 'en' | 'es' | null;
  created_at: string;
  updated_at: string;
}
