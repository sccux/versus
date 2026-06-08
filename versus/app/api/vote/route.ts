import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { castVote, getVoteCounts } from '@/lib/votes'
import { recordVoteAndMaybeAwardToken } from '@/lib/tokens'

export async function POST(request: NextRequest) {
  const { comparisonId, choice } = await request.json()

  if (!comparisonId || !['a', 'b'].includes(choice)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { voteId, alreadyVoted } = await castVote(
    comparisonId,
    choice as 'a' | 'b',
    user?.id ?? null
  )

  if (!alreadyVoted && user) {
    await recordVoteAndMaybeAwardToken(user.id, voteId)
  }

  const counts = await getVoteCounts(comparisonId)
  return NextResponse.json({ counts, alreadyVoted })
}
