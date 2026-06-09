'use client'
import { useState } from 'react'
import { uploadComparisonImage } from '@/lib/upload'
import { createComparisonAction } from '@/app/create/actions'

export function ComparisonForm({ tokenBalance }: { tokenBalance: number }) {
  const [fileA, setFileA] = useState<File | null>(null)
  const [fileB, setFileB] = useState<File | null>(null)
  const [previewA, setPreviewA] = useState<string | null>(null)
  const [previewB, setPreviewB] = useState<string | null>(null)
  const [postToFeed, setPostToFeed] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function pickFile(side: 'a' | 'b', file: File) {
    const url = URL.createObjectURL(file)
    if (side === 'a') { setFileA(file); setPreviewA(url) }
    else { setFileB(file); setPreviewB(url) }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    if (!fileA || !fileB) { setError('Upload both images'); return }
    setUploading(true)
    setError(null)

    try {
      const uploadId = crypto.randomUUID()
      const [imageAUrl, imageBUrl] = await Promise.all([
        uploadComparisonImage(fileA, uploadId, 'a'),
        uploadComparisonImage(fileB, uploadId, 'b'),
      ])

      const formData = new FormData(form)
      formData.set('imageAUrl', imageAUrl)
      formData.set('imageBUrl', imageBUrl)
      formData.set('postToFeed', String(postToFeed))

      await createComparisonAction(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-xl">
      <div className="grid grid-cols-2 gap-4">
        {(['a', 'b'] as const).map(side => {
          const preview = side === 'a' ? previewA : previewB
          return (
            <label
              key={side}
              className="aspect-square rounded-2xl border-2 border-dashed border-gray-700 hover:border-gray-500 transition-colors cursor-pointer overflow-hidden flex items-center justify-center bg-gray-900"
            >
              {preview ? (
                <img src={preview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <div className="text-4xl mb-2 text-gray-600">+</div>
                  <div className="text-gray-500 text-sm">Option {side.toUpperCase()}</div>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && pickFile(side, e.target.files[0])}
              />
            </label>
          )
        })}
      </div>

      <input
        name="question"
        type="text"
        placeholder="Which looks better?"
        required
        className="bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-3 placeholder-gray-500 focus:outline-none focus:border-gray-600"
      />

      <label className={`flex items-center justify-between p-4 rounded-xl border ${tokenBalance > 0 ? 'border-gray-700 cursor-pointer' : 'border-gray-800 opacity-40 cursor-not-allowed'}`}>
        <div>
          <div className="text-white font-medium text-sm">Post to public feed</div>
          <div className="text-gray-500 text-xs mt-0.5">Costs 1 token · You have {tokenBalance}</div>
        </div>
        <input
          type="checkbox"
          checked={postToFeed}
          onChange={e => setPostToFeed(e.target.checked)}
          disabled={tokenBalance < 1}
          className="w-4 h-4 accent-white"
        />
      </label>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={uploading}
        className="bg-white text-gray-900 font-semibold py-3 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        {uploading ? 'Creating...' : 'Create comparison'}
      </button>
    </form>
  )
}
