'use server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createComparison, publishComparison } from '@/lib/comparisons'
import { spendTokenForFeedPost } from '@/lib/tokens'
import { redirect } from 'next/navigation'

export async function createComparisonAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const question = formData.get('question') as string
  const imageAUrl = formData.get('imageAUrl') as string
  const imageBUrl = formData.get('imageBUrl') as string
  const postToFeed = formData.get('postToFeed') === 'true'

  if (!question?.trim() || !imageAUrl || !imageBUrl) {
    throw new Error('Missing required fields')
  }

  const comparison = await createComparison({
    creatorId: user.id,
    question: question.trim(),
    imageAUrl,
    imageBUrl,
  })

  if (postToFeed) {
    const spent = await spendTokenForFeedPost(user.id, comparison.id)
    if (spent) await publishComparison(comparison.id)
  }

  redirect(`/c/${comparison.slug}?created=true`)
}
