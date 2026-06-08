import { createServiceClient } from './supabase/server'
import { customAlphabet } from 'nanoid'
import type { Comparison } from '@/types'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

export async function getComparisonBySlug(slug: string): Promise<Comparison | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('comparisons')
    .select('*')
    .eq('slug', slug)
    .single()
  return data
}

export async function createComparison(params: {
  creatorId: string
  question: string
  imageAUrl: string
  imageBUrl: string
}): Promise<Comparison> {
  const supabase = createServiceClient()
  const slug = nanoid()

  const { data, error } = await supabase
    .from('comparisons')
    .insert({
      slug,
      creator_id: params.creatorId,
      question: params.question,
      image_a_url: params.imageAUrl,
      image_b_url: params.imageBUrl,
      is_public: false,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function publishComparison(comparisonId: string): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from('comparisons')
    .update({ is_public: true })
    .eq('id', comparisonId)
}

export async function getPublicFeed(limit = 20, offset = 0): Promise<Comparison[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('comparisons')
    .select('*')
    .eq('is_public', true)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  return data ?? []
}

export async function getUserComparisons(userId: string): Promise<Comparison[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('comparisons')
    .select('*')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false })
  return data ?? []
}
