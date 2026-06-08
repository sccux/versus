'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { Comparison, VoteCounts } from '@/types'

type Props = {
  comparison: Comparison
  initialCounts: VoteCounts
  initialVote: 'a' | 'b' | null
}

export function FeedCard({ comparison, initialCounts, initialVote }: Props) {
  const [counts, setCounts] = useState(initialCounts)
  const [voted, setVoted] = useState<'a' | 'b' | null>(initialVote)
  const [loading, setLoading] = useState(false)

  const total = counts.a + counts.b
  const pctA = total === 0 ? 50 : Math.round((counts.a / total) * 100)
  const pctB = 100 - pctA

  async function vote(choice: 'a' | 'b') {
    if (voted || loading) return
    setLoading(true)
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comparisonId: comparison.id, choice }),
    })
    if (res.ok) {
      const data = await res.json()
      setCounts(data.counts)
      setVoted(choice)
    }
    setLoading(false)
  }

  const options = [
    { side: 'a' as const, url: comparison.image_a_url, pct: pctA },
    { side: 'b' as const, url: comparison.image_b_url, pct: pctB },
  ]

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
      <div className="p-4">
        <p className="text-white font-semibold">{comparison.question}</p>
      </div>
      <div className="grid grid-cols-2 gap-0.5">
        {options.map(({ side, url, pct }) => (
          <button
            key={side}
            onClick={() => vote(side)}
            disabled={!!voted || loading}
            className={`relative aspect-video overflow-hidden group focus:outline-none
              ${voted === side ? 'ring-2 ring-inset ring-white' : ''}
            `}
          >
            <img src={url} alt="" className="w-full h-full object-cover" />
            {voted ? (
              <div className="absolute inset-0 bg-black/40 flex items-end p-3">
                <span className="text-white text-2xl font-black">{pct}%</span>
              </div>
            ) : (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            )}
          </button>
        ))}
      </div>
      <div className="px-4 py-3 flex justify-between items-center">
        <span className="text-gray-500 text-xs">{total} vote{total !== 1 ? 's' : ''}</span>
        <Link href={`/c/${comparison.slug}`} className="text-gray-500 text-xs hover:text-gray-300 transition-colors">
          Share →
        </Link>
      </div>
    </div>
  )
}
