import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system';

export async function uploadIdeaPhoto(localUri: string, userId: string): Promise<string> {
  const filename = `${userId}/${Date.now()}.jpg`;

  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const { error } = await supabase.storage
    .from('idea-photos')
    .upload(filename, bytes, { contentType: 'image/jpeg', upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('idea-photos').getPublicUrl(filename);
  return data.publicUrl;
}
