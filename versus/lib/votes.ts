import { createServiceClient } from './supabase/server'
import type { VoteCounts } from '@/types'

export async function castVote(
  comparisonId: string,
  choice: 'a' | 'b',
  voterId: string | null
): Promise<{ voteId: string; alreadyVoted: boolean }> {
  const supabase = createServiceClient()

  if (voterId) {
    const { data: existing } = await supabase
      .from('votes')
      .select('id')
      .eq('comparison_id', comparisonId)
      .eq('voter_id', voterId)
      .maybeSingle()

    if (existing) return { voteId: existing.id, alreadyVoted: true }
  }

  const { data, error } = await supabase
    .from('votes')
    .insert({ comparison_id: comparisonId, voter_id: voterId, choice })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return { voteId: data.id, alreadyVoted: false }
}

export async function getVoteCounts(comparisonId: string): Promise<VoteCounts> {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('votes')
    .select('choice')
    .eq('comparison_id', comparisonId)

  if (!data) return { a: 0, b: 0 }
  return {
    a: data.filter(v => v.choice === 'a').length,
    b: data.filter(v => v.choice === 'b').length,
  }
}

export async function getUserVote(
  comparisonId: string,
  voterId: string
): Promise<'a' | 'b' | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('votes')
    .select('choice')
    .eq('comparison_id', comparisonId)
    .eq('voter_id', voterId)
    .maybeSingle()
  return (data?.choice as 'a' | 'b') ?? null
}
