import { notFound } from 'next/navigation'
import { getComparisonBySlug } from '@/lib/comparisons'
import { getVoteCounts, getUserVote } from '@/lib/votes'
import { createClient } from '@/lib/supabase/server'
import { VoteCard } from '@/components/VoteCard'
import type { Metadata } from 'next'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const comparison = await getComparisonBySlug(slug)
  if (!comparison) return {}
  return {
    title: comparison.question,
    description: 'Vote now — no account needed',
    openGraph: {
      title: comparison.question,
      description: 'Vote now — no account needed',
      images: [{ url: comparison.image_a_url, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: comparison.question,
      images: [comparison.image_a_url],
    },
  }
}

export default async function VotePage({ params }: Props) {
  const { slug } = await params
  const comparison = await getComparisonBySlug(slug)
  if (!comparison) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [counts, initialVote] = await Promise.all([
    getVoteCounts(comparison.id),
    user ? getUserVote(comparison.id, user.id) : null,
  ])

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <VoteCard comparison={comparison} initialCounts={counts} initialVote={initialVote} />
    </main>
  )
}
