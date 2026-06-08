'use client'
import { useState } from 'react'
import type { Comparison, VoteCounts } from '@/types'

type Props = {
  comparison: Comparison
  initialCounts: VoteCounts
  initialVote?: 'a' | 'b' | null
  isLoggedIn?: boolean
}

export function VoteCard({ comparison, initialCounts, initialVote = null, isLoggedIn = false }: Props) {
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
    <div className="w-full max-w-3xl">
      <h1 className="text-2xl font-bold text-white text-center mb-8">
        {comparison.question}
      </h1>

      <div className="grid grid-cols-2 gap-4">
        {options.map(({ side, url, pct }) => (
          <button
            key={side}
            onClick={() => vote(side)}
            disabled={!!voted || loading}
            className={`relative overflow-hidden rounded-2xl aspect-square group focus:outline-none
              ${voted === side ? 'ring-4 ring-white' : ''}
              ${voted && voted !== side ? 'opacity-60' : ''}
            `}
          >
            <img src={url} alt={`Option ${side.toUpperCase()}`} className="w-full h-full object-cover" />
            {voted ? (
              <div className="absolute inset-0 bg-black/40 flex items-end p-4">
                <span className="text-white text-4xl font-black">{pct}%</span>
              </div>
            ) : (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            )}
          </button>
        ))}
      </div>

      {voted && !isLoggedIn && (
        <div className="mt-6 p-4 rounded-2xl bg-gray-900 text-center">
          <p className="text-gray-400 text-sm">
            Earn tokens when you vote —{' '}
            <a href="/login" className="text-white underline hover:text-gray-200">
              create a free account
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
