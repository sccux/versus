'use client'
import { useState } from 'react'

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-300 hover:border-gray-600 transition-colors w-full"
    >
      <span className="flex-1 truncate text-left font-mono text-xs">{url}</span>
      <span className="text-white font-medium shrink-0">{copied ? 'Copied!' : 'Copy'}</span>
    </button>
  )
}
