import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-5xl font-black text-white mb-4 tracking-tight">
        Pick a side.
      </h1>
      <p className="text-gray-400 text-lg mb-10 max-w-sm">
        Create an image comparison, share the link, and let the internet decide.
      </p>

      <div className="flex gap-3 flex-wrap justify-center">
        <Link
          href="/create"
          className="bg-white text-gray-900 font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors"
        >
          Create a comparison
        </Link>
        <Link
          href="/feed"
          className="bg-gray-900 text-white font-semibold px-6 py-3 rounded-xl border border-gray-800 hover:border-gray-600 transition-colors"
        >
          Browse feed
        </Link>
      </div>

      <div className="mt-20 grid grid-cols-3 gap-8 max-w-md text-sm text-gray-500">
        <div>
          <div className="text-2xl font-bold text-white mb-1">Free</div>
          <div>to create &amp; share</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-white mb-1">No</div>
          <div>account to vote</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-white mb-1">Tokens</div>
          <div>for engagement</div>
        </div>
      </div>
    </main>
  )
}
