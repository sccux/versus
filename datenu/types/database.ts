export type CostRange = '€' | '€€' | '€€€';
export type SwipeDirection = 'like' | 'pass';
export type MatchStatus = 'pending' | 'scheduled' | 'completed';
export type AuthProvider = 'google' | 'apple' | 'email';

export interface DbUser {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  location_region: string;
  auth_provider: AuthProvider;
  expo_push_token: string | null;
  created_at: string;
}

export interface DbCouple {
  id: string;
  user_a_id: string;
  user_b_id: string | null;
  invite_code: string;
  location_region: string;
  created_at: string;
}

export interface DbDateIdea {
  id: string;
  title: string;
  tagline: string;
  photo_url: string;
  cost_range: CostRange;
  duration_mins: number;
  vibe_tags: string[];
  location_region: string;
  booking_url: string | null;
  maps_url: string | null;
  submitted_by: string | null;
  is_approved: boolean;
  created_at: string;
}

export interface DbSwipe {
  id: string;
  couple_id: string;
  user_id: string;
  idea_id: string;
  direction: SwipeDirection;
  swiped_at: string;
}

export interface DbMatch {
  id: string;
  couple_id: string;
  idea_id: string;
  matched_at: string;
  status: MatchStatus;
}

export interface DbScheduledDate {
  id: string;
  match_id: string;
  scheduled_at: string;
  calendar_event_id: string | null;
}

export interface DbDateMemory {
  id: string;
  match_id: string;
  note: string | null;
  rating: number | null;
  completed_at: string;
}
