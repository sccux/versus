import { supabase } from '@/lib/supabase';
import { AuthProvider, DbUser } from '@/types/database';

export interface CreateProfileParams {
  id: string;
  email: string;
  displayName: string;
  authProvider: AuthProvider;
  avatarUrl?: string;
}

export async function createUserProfile(params: CreateProfileParams): Promise<void> {
  const { error } = await supabase.from('users').upsert(
    {
      id: params.id,
      email: params.email,
      display_name: params.displayName,
      auth_provider: params.authProvider,
      avatar_url: params.avatarUrl ?? null,
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getUserProfile(userId: string): Promise<DbUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<DbUser, 'display_name' | 'avatar_url' | 'location_region' | 'expo_push_token'>>
): Promise<void> {
  const { error } = await supabase.from('users').update(updates).eq('id', userId);
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
