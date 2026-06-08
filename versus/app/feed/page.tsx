import { getPublicFeed } from '@/lib/comparisons'
import { getVoteCounts, getUserVote } from '@/lib/votes'
import { createClient } from '@/lib/supabase/server'
import { FeedCard } from '@/components/FeedCard'

export const revalidate = 30

export default async function FeedPage() {
  const comparisons = await getPublicFeed(20)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const enriched = await Promise.all(
    comparisons.map(async (c) => ({
      comparison: c,
      counts: await getVoteCounts(c.id),
      initialVote: user ? await getUserVote(c.id, user.id) : null,
    }))
  )

  return (
    <main className="min-h-screen p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-6">Feed</h1>

      {enriched.length === 0 ? (
        <p className="text-gray-500 text-center mt-20">
          No comparisons yet.{' '}
          <a href="/create" className="text-white underline">Be the first.</a>
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {enriched.map(({ comparison, counts, initialVote }) => (
            <FeedCard
              key={comparison.id}
              comparison={comparison}
              initialCounts={counts}
              initialVote={initialVote}
            />
          ))}
        </div>
      )}

      {!user && (
        <div className="fixed bottom-4 left-4 right-4 max-w-xl mx-auto bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
          <p className="text-gray-400 text-sm">
            <a href="/login" className="text-white underline">Log in</a> to earn tokens when you vote
          </p>
        </div>
      )}
    </main>
  )
}
