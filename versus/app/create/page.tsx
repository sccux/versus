import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ComparisonForm } from '@/components/ComparisonForm'

export default async function CreatePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await createServiceClient()
    .from('users')
    .select('token_balance')
    .eq('id', user.id)
    .single()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold text-white mb-8">Create a comparison</h1>
      <ComparisonForm tokenBalance={profile?.token_balance ?? 0} />
    </main>
  )
}
