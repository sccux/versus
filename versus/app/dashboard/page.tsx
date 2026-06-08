import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserComparisons } from '@/lib/comparisons'
import { getVoteCounts } from '@/lib/votes'
import { redirect } from 'next/navigation'
import { TokenBadge } from '@/components/TokenBadge'
import { CopyLink } from '@/components/CopyLink'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await createServiceClient()
    .from('users')
    .select('token_balance, vote_count')
    .eq('id', user.id)
    .single()

  const comparisons = await getUserComparisons(user.id)
  const withCounts = await Promise.all(
    comparisons.map(async (c) => ({ ...c, counts: await getVoteCounts(c.id) }))
  )

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const votesUntilToken = 20 - ((profile?.vote_count ?? 0) % 20)

  return (
    <main className="min-h-screen p-4 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <TokenBadge balance={profile?.token_balance ?? 0} />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
        <p className="text-gray-400 text-sm">
          Vote on{' '}
          <span className="text-white font-semibold">{votesUntilToken} more</span>{' '}
          comparison{votesUntilToken !== 1 ? 's' : ''} to earn your next token
        </p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold">Your comparisons</h2>
        <a href="/create" className="text-sm text-gray-400 hover:text-white transition-colors">+ Create</a>
      </div>

      {withCounts.length === 0 ? (
        <p className="text-gray-500 text-center mt-12">No comparisons yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {withCounts.map((c) => {
            const total = c.counts.a + c.counts.b
            const pctA = total === 0 ? 0 : Math.round((c.counts.a / total) * 100)
            const pctB = 100 - pctA
            return (
              <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <p className="text-white font-medium mb-3">{c.question}</p>
                <div className="flex gap-3 mb-3">
                  <img src={c.image_a_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  <img src={c.image_b_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-400 text-sm mb-2">{total} vote{total !== 1 ? 's' : ''}</div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full" style={{ width: `${pctA}%` }} />
                    </div>
                    <div className="text-gray-500 text-xs mt-1">{pctA}% A · {pctB}% B</div>
                  </div>
                </div>
                <CopyLink url={`${baseUrl}/c/${c.slug}`} />
                {!c.is_public && (
                  <p className="text-gray-600 text-xs mt-2">Link-only · not posted to feed</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
