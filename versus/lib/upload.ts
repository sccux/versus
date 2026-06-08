import { createClient } from './supabase/client'

// uploadId is a client-generated UUID used only for the storage path.
// The shareable slug is generated server-side in createComparison.
export async function uploadComparisonImage(
  file: File,
  uploadId: string,
  side: 'a' | 'b'
): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `comparisons/${uploadId}/${side}.${ext}`

  const { error } = await supabase.storage
    .from('comparison-images')
    .upload(path, file, { upsert: true })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('comparison-images').getPublicUrl(path)
  return data.publicUrl
}
