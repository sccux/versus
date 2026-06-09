'use server';

import { createClient } from '@/lib/supabase/server';
import { assignRoles, shuffleTurnOrder } from '@/lib/game/roles';
import { pickWord } from '@/lib/game/words';
import { checkWinCondition } from '@/lib/game/winCondition';

export async function startRound(roomId: string): Promise<string> {
  const supabase = await createClient();

  const { data: existingRounds } = await supabase
    .from('rounds')
    .select('round_number')
    .eq('room_id', roomId)
    .order('round_number', { ascending: false })
    .limit(1);

  const roundNumber = (existingRounds?.[0]?.round_number ?? 0) + 1;

  const { data: players } = await supabase
    .from('players')
    .select('id')
    .eq('room_id', roomId)
    .eq('is_connected', true);

  if (!players || players.length < 3) throw new Error('Not enough players');

  const playerIds = players.map((p) => p.id);
  const roles = assignRoles(playerIds);
  const turnOrder = shuffleTurnOrder(playerIds);
  const word = pickWord();

  const firstPlayerId = turnOrder[0];
  const startsAt = new Date(Date.now() + 3000).toISOString();

  const { data: round, error } = await supabase
    .from('rounds')
    .insert({
      room_id: roomId,
      round_number: roundNumber,
      word,
      status: 'drawing',
      current_turn_player_id: firstPlayerId,
      turn_started_at: startsAt,
      can_vote: false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase.from('rooms').update({ current_round_id: round.id }).eq('id', roomId);

  const roundPlayers = playerIds.map((id) => ({
    round_id: round.id,
    player_id: id,
    role: roles[id],
    turn_order: turnOrder.indexOf(id),
    has_drawn: false,
    is_alive: true,
  }));

  await supabase.from('round_players').insert(roundPlayers);

  return round.id;
}

export async function advanceTurn(roundId: string, completedPlayerId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('round_players')
    .update({ has_drawn: true })
    .eq('round_id', roundId)
    .eq('player_id', completedPlayerId);

  const { data: roundPlayers } = await supabase
    .from('round_players')
    .select('player_id, turn_order, has_drawn, is_alive')
    .eq('round_id', roundId)
    .eq('is_alive', true)
    .order('turn_order');

  if (!roundPlayers || roundPlayers.length === 0) return;

  const currentIndex = roundPlayers.findIndex((rp) => rp.player_id === completedPlayerId);
  const nextIndex = (currentIndex + 1) % roundPlayers.length;
  const nextPlayer = roundPlayers[nextIndex];

  // Check if rotation just completed (all alive players have now drawn)
  const allDrewThisRotation = roundPlayers.every(
    (rp) => rp.has_drawn || rp.player_id === completedPlayerId
  );

  const startsAt = new Date(Date.now() + 3000).toISOString();

  if (allDrewThisRotation) {
    await supabase
      .from('round_players')
      .update({ has_drawn: false })
      .eq('round_id', roundId)
      .eq('is_alive', true);

    await supabase
      .from('rounds')
      .update({
        current_turn_player_id: nextPlayer.player_id,
        turn_started_at: startsAt,
        can_vote: true,
      })
      .eq('id', roundId);
  } else {
    await supabase
      .from('rounds')
      .update({
        current_turn_player_id: nextPlayer.player_id,
        turn_started_at: startsAt,
      })
      .eq('id', roundId);
  }
}

export async function endRound(
  roundId: string,
  roomId: string,
  winner: 'artists' | 'imposters'
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('rounds')
    .update({ status: 'finished', winner, ended_at: new Date().toISOString() })
    .eq('id', roundId);

  const { data: roundPlayers } = await supabase
    .from('round_players')
    .select('player_id, role')
    .eq('round_id', roundId);

  if (roundPlayers) {
    const winnerPlayerIds = roundPlayers
      .filter((rp) =>
        winner === 'artists' ? rp.role === 'artist' : rp.role === 'imposter'
      )
      .map((rp) => rp.player_id);

    for (const playerId of winnerPlayerIds) {
      await supabase.rpc('increment_score', { player_id: playerId });
    }
  }
}

export async function handlePlayerDrop(
  playerId: string,
  roundId: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('players')
    .update({ is_connected: false })
    .eq('id', playerId);

  await supabase
    .from('round_players')
    .update({ is_alive: false })
    .eq('round_id', roundId)
    .eq('player_id', playerId);

  const { data: roundPlayers } = await supabase
    .from('round_players')
    .select('role, is_alive')
    .eq('round_id', roundId)
    .eq('is_alive', true);

  if (!roundPlayers) return;

  const aliveArtists = roundPlayers.filter((rp) => rp.role === 'artist').length;
  const aliveImposters = roundPlayers.filter((rp) => rp.role === 'imposter').length;
  const totalAlive = aliveArtists + aliveImposters;

  const { data: round } = await supabase
    .from('rounds')
    .select('room_id')
    .eq('id', roundId)
    .single();

  if (!round) return;

  if (totalAlive < 3) {
    await supabase
      .from('rounds')
      .update({ status: 'finished', winner: null, ended_at: new Date().toISOString() })
      .eq('id', roundId);
    return;
  }

  const result = checkWinCondition(aliveArtists, aliveImposters);
  if (result) {
    await endRound(roundId, round.room_id, result);
  }
}
