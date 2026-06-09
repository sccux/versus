'use server';

import { createClient } from '@/lib/supabase/server';
import { assignColor, PLAYER_COLORS } from '@/lib/game/colors';

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createRoom(
  nickname: string
): Promise<{ code: string; playerId: string }> {
  const supabase = await createClient();
  const code = generateCode();

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({ code, status: 'lobby' })
    .select()
    .single();

  if (roomError) throw new Error(roomError.message);

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      nickname,
      color: PLAYER_COLORS[0],
      score: 0,
      is_connected: true,
    })
    .select()
    .single();

  if (playerError) throw new Error(playerError.message);

  await supabase
    .from('rooms')
    .update({ host_player_id: player.id })
    .eq('id', room.id);

  return { code, playerId: player.id };
}

export async function joinRoom(
  code: string,
  nickname: string
): Promise<{ roomId: string; playerId: string }> {
  const supabase = await createClient();

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, status')
    .eq('code', code.toUpperCase())
    .single();

  if (roomError || !room) throw new Error('Room not found');

  const { data: existingPlayers } = await supabase
    .from('players')
    .select('color')
    .eq('room_id', room.id);

  const usedColors = existingPlayers?.map((p) => p.color) ?? [];
  const color = assignColor(usedColors);

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      nickname,
      color,
      score: 0,
      is_connected: true,
    })
    .select()
    .single();

  if (playerError) throw new Error(playerError.message);

  return { roomId: room.id, playerId: player.id };
}

export async function markConnected(
  playerId: string,
  connected: boolean
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from('players')
    .update({ is_connected: connected })
    .eq('id', playerId);
}

export async function startGame(roomId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('rooms')
    .update({ status: 'playing' })
    .eq('id', roomId);
  if (error) throw new Error(error.message);
}
