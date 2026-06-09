import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import GameRoom from './GameRoom';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function RoomPage({ params }: Props) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (!room) notFound();

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', room.id)
    .order('created_at');

  return (
    <GameRoom
      initialRoom={room}
      initialPlayers={players ?? []}
    />
  );
}
