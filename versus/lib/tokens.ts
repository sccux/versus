import { createServiceClient } from './supabase/server'

// Pure function — testable without DB
export function shouldAwardToken(newVoteCount: number): boolean {
  return newVoteCount > 0 && newVoteCount % 20 === 0
}

// Call after a logged-in user casts a vote. Returns true if a token was awarded.
export async function recordVoteAndMaybeAwardToken(
  userId: string,
  voteId: string
): Promise<boolean> {
  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users')
    .select('vote_count, token_balance')
    .eq('id', userId)
    .single()

  if (!user) return false

  const newVoteCount = user.vote_count + 1
  const award = shouldAwardToken(newVoteCount)

  await supabase
    .from('users')
    .update({
      vote_count: newVoteCount,
      ...(award ? { token_balance: user.token_balance + 1 } : {}),
    })
    .eq('id', userId)

  if (award) {
    await supabase.from('token_transactions').insert({
      user_id: userId,
      amount: 1,
      reason: 'voted',
      reference_id: voteId,
    })
  }

  return award
}

// Deduct 1 token to post a comparison to the public feed.
// Returns false if the user has insufficient balance.
export async function spendTokenForFeedPost(
  userId: string,
  comparisonId: string
): Promise<boolean> {
  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users')
    .select('token_balance')
    .eq('id', userId)
    .single()

  if (!user || user.token_balance < 1) return false

  await supabase
    .from('users')
    .update({ token_balance: user.token_balance - 1 })
    .eq('id', userId)

  await supabase.from('token_transactions').insert({
    user_id: userId,
    amount: -1,
    reason: 'post_to_feed',
    reference_id: comparisonId,
  })

  return true
}
