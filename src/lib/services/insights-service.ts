import { supabase } from '../supabase'
import { platformRegistry } from './platform-adapter'
import type { PostInsights as PlatformPostInsights } from './platform-adapter'

export interface PostInsights {
  id: string
  post_id: string
  platform: string
  metrics: {
    views: number
    likes: number
    comments: number
    shares: number
  }
  fetched_at: string
}

export async function getInsightsForPost(postId: string): Promise<PostInsights | null> {
  const { data, error } = await supabase
    .from('post_insights')
    .select('*')
    .eq('post_id', postId)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as PostInsights | null
}

export async function getInsightsForOrg(orgId: string): Promise<(PostInsights & { post_platform: string; post_status: string })[]> {
  const { data, error } = await supabase
    .from('post_insights')
    .select('*, posts!inner(platform, status)')
    .eq('posts.org_id', orgId)
    .order('fetched_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => {
    const posts = row.posts as { platform: string; status: string }
    return {
      id: row.id as string,
      post_id: row.post_id as string,
      platform: row.platform as string,
      metrics: row.metrics as PlatformPostInsights,
      fetched_at: row.fetched_at as string,
      post_platform: posts.platform,
      post_status: posts.status,
    }
  })
}

export async function fetchInsights(postId: string, platform: string): Promise<PostInsights> {
  const adapter = platformRegistry.getAdapter(platform)
  if (!adapter) {
    throw new Error(`No adapter registered for platform: ${platform}`)
  }

  const insights = await adapter.getInsights(postId)

  const { data, error } = await supabase
    .from('post_insights')
    .insert({
      post_id: postId,
      platform,
      metrics: insights,
      fetched_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as PostInsights
}