export type RoomStatus = 'lobby' | 'playing' | 'finished';
export type RoundStatus = 'drawing' | 'voting' | 'finished';
export type PlayerRole = 'artist' | 'imposter';
export type RoundWinner = 'artists' | 'imposters';
export type VoteSessionStatus = 'active' | 'resolved';

export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  host_player_id: string | null;
  current_round_id: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  user_id: string | null;
  nickname: string;
  color: string;
  score: number;
  is_connected: boolean;
  created_at: string;
}

export interface Round {
  id: string;
  room_id: string;
  round_number: number;
  word: string;
  status: RoundStatus;
  winner: RoundWinner | null;
  current_turn_player_id: string | null;
  turn_started_at: string | null;
  can_vote: boolean;
  started_at: string;
  ended_at: string | null;
}

export interface RoundPlayer {
  id: string;
  round_id: string;
  player_id: string;
  role: PlayerRole;
  turn_order: number;
  has_drawn: boolean;
  is_alive: boolean;
}

export interface VoteSession {
  id: string;
  round_id: string;
  initiated_by: string;
  status: VoteSessionStatus;
  killed_player_id: string | null;
  created_at: string;
}

export interface Vote {
  id: string;
  vote_session_id: string;
  voter_id: string;
  target_id: string;
  created_at: string;
}
