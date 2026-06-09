'use server';

import { createClient } from '@/lib/supabase/server';
import { checkWinCondition } from '@/lib/game/winCondition';
import { endRound } from './round';

export async function initiateVote(
  roundId: string,
  initiatedBy: string
): Promise<string> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('vote_sessions')
    .select('id')
    .eq('round_id', roundId)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) return existing.id;

  await supabase
    .from('rounds')
    .update({ status: 'voting' })
    .eq('id', roundId);

  const { data, error } = await supabase
    .from('vote_sessions')
    .insert({ round_id: roundId, initiated_by: initiatedBy, status: 'active' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function castVote(
  voteSessionId: string,
  voterId: string,
  targetId: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('votes')
    .upsert(
      { vote_session_id: voteSessionId, voter_id: voterId, target_id: targetId },
      { onConflict: 'vote_session_id,voter_id' }
    );

  const { data: session } = await supabase
    .from('vote_sessions')
    .select('round_id')
    .eq('id', voteSessionId)
    .single();

  if (!session) return;

  const { data: alivePlayers } = await supabase
    .from('round_players')
    .select('player_id')
    .eq('round_id', session.round_id)
    .eq('is_alive', true);

  const { data: votes } = await supabase
    .from('votes')
    .select('voter_id, target_id')
    .eq('vote_session_id', voteSessionId);

  if (!alivePlayers || !votes) return;

  if (votes.length >= alivePlayers.length) {
    await resolveVote(voteSessionId, session.round_id, alivePlayers.length);
  }
}

async function resolveVote(
  voteSessionId: string,
  roundId: string,
  totalVoters: number
): Promise<void> {
  const supabase = await createClient();

  const { data: votes } = await supabase
    .from('votes')
    .select('target_id')
    .eq('vote_session_id', voteSessionId);

  if (!votes) return;

  const tally: Record<string, number> = {};
  for (const v of votes) {
    tally[v.target_id] = (tally[v.target_id] ?? 0) + 1;
  }

  const maxVotes = Math.max(...Object.values(tally));
  const topTargets = Object.entries(tally).filter(([, count]) => count === maxVotes);
  const majority = Math.floor(totalVoters / 2) + 1;

  let killedPlayerId: string | null = null;

  if (topTargets.length === 1 && maxVotes >= majority) {
    killedPlayerId = topTargets[0][0];

    await supabase
      .from('round_players')
      .update({ is_alive: false })
      .eq('round_id', roundId)
      .eq('player_id', killedPlayerId);
  }

  await supabase
    .from('vote_sessions')
    .update({ status: 'resolved', killed_player_id: killedPlayerId })
    .eq('id', voteSessionId);

  // Re-check win condition
  const { data: roundPlayers } = await supabase
    .from('round_players')
    .select('role, is_alive')
    .eq('round_id', roundId)
    .eq('is_alive', true);

  const { data: round } = await supabase
    .from('rounds')
    .select('room_id')
    .eq('id', roundId)
    .single();

  if (!roundPlayers || !round) return;

  const aliveArtists = roundPlayers.filter((rp) => rp.role === 'artist').length;
  const aliveImposters = roundPlayers.filter((rp) => rp.role === 'imposter').length;
  const result = checkWinCondition(aliveArtists, aliveImposters);

  if (result) {
    await endRound(roundId, round.room_id, result);
  } else {
    // Resume drawing
    const { data: alivePlayers } = await supabase
      .from('round_players')
      .select('player_id')
      .eq('round_id', roundId)
      .eq('is_alive', true)
      .order('turn_order');

    await supabase
      .from('rounds')
      .update({
        status: 'drawing',
        current_turn_player_id: alivePlayers?.[0]?.player_id ?? null,
        turn_started_at: new Date(Date.now() + 3000).toISOString(),
        can_vote: false,
      })
      .eq('id', roundId);
  }
}
