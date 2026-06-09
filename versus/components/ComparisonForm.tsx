'use client'
import { useRef, useState } from 'react'
import { uploadComparisonImage } from '@/lib/upload'
import { createComparisonAction } from '@/app/create/actions'
import { isRedirectError } from 'next/dist/client/components/redirect'

export function ComparisonForm({ tokenBalance }: { tokenBalance: number }) {
  const [fileA, setFileA] = useState<File | null>(null)
  const [fileB, setFileB] = useState<File | null>(null)
  const [previewA, setPreviewA] = useState<string | null>(null)
  const [previewB, setPreviewB] = useState<string | null>(null)
  const [postToFeed, setPostToFeed] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const multiInputRef = useRef<HTMLInputElement>(null)
  const slotBInputRef = useRef<HTMLInputElement>(null)

  function applyFiles(files: File[]) {
    if (files[0]) {
      setFileA(files[0])
      setPreviewA(URL.createObjectURL(files[0]))
    }
    if (files[1]) {
      setFileB(files[1])
      setPreviewB(URL.createObjectURL(files[1]))
    }
  }

  function handleMultiSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 2)
    applyFiles(files)
  }

  function handleSlotReplace(side: 'a' | 'b', file: File) {
    const url = URL.createObjectURL(file)
    if (side === 'a') { setFileA(file); setPreviewA(url) }
    else { setFileB(file); setPreviewB(url) }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    if (!fileA || !fileB) { setError('Add both images to continue'); return }
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
      if (isRedirectError(err)) throw err
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setUploading(false)
    }
  }

  const bothSelected = fileA && fileB
  const oneSelected = (fileA || fileB) && !bothSelected

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-xl">

      {/* Step 1: no images selected — single upload prompt */}
      {!fileA && !fileB && (
        <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-700 hover:border-gray-500 transition-colors cursor-pointer bg-gray-900 py-12 px-6 text-center">
          <div className="text-4xl text-gray-600">↑</div>
          <div className="text-white font-medium">Select images to compare</div>
          <div className="text-gray-500 text-sm">Pick 2 at once, or start with 1</div>
          <input
            ref={multiInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleMultiSelect}
          />
        </label>
      )}

      {/* Step 2: previews once at least one image is selected */}
      {(fileA || fileB) && (
        <div className="grid grid-cols-2 gap-4">
          {/* Slot A */}
          <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-700 hover:border-gray-500 transition-colors cursor-pointer overflow-hidden flex items-center justify-center bg-gray-900">
            {previewA ? (
              <img src={previewA} alt="Option A" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-4">
                <div className="text-3xl mb-2 text-gray-600">+</div>
                <div className="text-gray-500 text-sm">Add second image</div>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleSlotReplace('a', e.target.files[0])}
            />
          </label>

          {/* Slot B */}
          <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-700 hover:border-gray-500 transition-colors cursor-pointer overflow-hidden flex items-center justify-center bg-gray-900">
            {previewB ? (
              <img src={previewB} alt="Option B" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-4">
                <div className="text-3xl mb-2 text-gray-600">+</div>
                <div className="text-gray-500 text-sm">Add second image</div>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleSlotReplace('b', e.target.files[0])}
            />
          </label>
        </div>
      )}

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
