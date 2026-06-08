export function TokenBadge({ balance }: { balance: number }) {
  return (
    <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-full px-3 py-1">
      <span className="text-yellow-400 text-sm">◈</span>
      <span className="text-white font-semibold text-sm">{balance}</span>
      <span className="text-gray-500 text-sm">tokens</span>
    </div>
  )
}
