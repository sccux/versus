import { supabase } from '@/lib/supabase';
import { DbCouple } from '@/types/database';

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit ambiguous chars
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function getOrCreateCouple(userAId: string, userARegion: string): Promise<DbCouple> {
  // Return existing unpaired couple row if one exists, to avoid orphaned rows
  const existing = await getMyUnpairedCouple(userAId);
  if (existing) return existing;

  const code = generateInviteCode();
  const { data, error } = await supabase
    .from('couples')
    .insert({ user_a_id: userAId, invite_code: code, location_region: userARegion })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Internal helper — finds an unpaired couple row started by this user
async function getMyUnpairedCouple(userAId: string): Promise<DbCouple | null> {
  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .eq('user_a_id', userAId)
    .is('user_b_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Kept for backward compat in tests — prefer getOrCreateCouple in UI
export async function createCouple(userAId: string, locationRegion = ''): Promise<DbCouple> {
  return getOrCreateCouple(userAId, locationRegion);
}

export async function joinCoupleByCode(userBId: string, code: string): Promise<DbCouple> {
  const { data: couple, error: findError } = await supabase
    .from('couples')
    .select('*')
    .eq('invite_code', code.toUpperCase())
    .is('user_b_id', null)
    .single();

  if (findError || !couple) throw new Error('Invalid invite code');
  if (couple.user_a_id === userBId) throw new Error('You cannot pair with yourself');

  const { data, error } = await supabase
    .from('couples')
    .update({ user_b_id: userBId })
    .eq('id', couple.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCoupleLocation(coupleId: string, locationRegion: string): Promise<void> {
  const { error } = await supabase
    .from('couples')
    .update({ location_region: locationRegion })
    .eq('id', coupleId);
  if (error) throw error;
}

export async function getMyCouple(userId: string): Promise<DbCouple | null> {
  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .not('user_b_id', 'is', null)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getCoupleByInviteCode(code: string): Promise<DbCouple | null> {
  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .eq('invite_code', code.toUpperCase())
    .is('user_b_id', null)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export function buildInviteLink(inviteCode: string): string {
  return `datenu://pair?code=${inviteCode}`;
}
