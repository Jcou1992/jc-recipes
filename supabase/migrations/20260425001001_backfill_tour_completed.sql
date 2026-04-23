update user_preferences
  set tour_completed_at = coalesce(tour_completed_at, now());
