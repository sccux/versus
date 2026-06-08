export type User = {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  token_balance: number
  vote_count: number
  created_at: string
}

export type Comparison = {
  id: string
  slug: string
  creator_id: string
  question: string
  image_a_url: string
  image_b_url: string
  is_public: boolean
  status: 'active' | 'closed'
  created_at: string
}

export type Vote = {
  id: string
  comparison_id: string
  voter_id: string | null
  choice: 'a' | 'b'
  voted_at: string
}

export type TokenTransaction = {
  id: string
  user_id: string
  amount: number
  reason: 'signup_bonus' | 'voted' | 'post_to_feed'
  reference_id: string | null
  created_at: string
}

export type VoteCounts = { a: number; b: number }
