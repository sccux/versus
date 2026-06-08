import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Versus — Pick a side',
  description: 'Create image comparisons and let the internet decide',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.className} bg-gray-950 text-white min-h-screen`}>
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-900 bg-gray-950/80 backdrop-blur-sm">
          <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-black text-white tracking-tight">versus</Link>
            <div className="flex items-center gap-4">
              <Link href="/feed" className="text-gray-400 hover:text-white text-sm transition-colors">Feed</Link>
              <Link href="/create" className="bg-white text-gray-900 font-semibold text-sm px-4 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">Create</Link>
              <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm transition-colors">Dashboard</Link>
            </div>
          </div>
        </nav>
        <div className="pt-14">{children}</div>
      </body>
    </html>
  )
}
