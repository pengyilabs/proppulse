import { schedule } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface PostRow {
  id: string
  org_id: string
  broker_id: string
  listing_id: string | null
  content: Record<string, unknown>
  platform: string
  language: string
  scheduled_date: string | null
}

async function publishToPlatform(post: PostRow): Promise<{ success: boolean; postId: string; error?: string }> {
  const caption = (post.content as Record<string, string>)?.caption || ''

  try {
    // Get the social account for this org and platform
    const { data: account } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('org_id', post.org_id)
      .eq('platform', post.platform)
      .eq('is_active', true)
      .maybeSingle()

    if (!account) {
      return { success: false, postId: '', error: `No active ${post.platform} account connected for org ${post.org_id}` }
    }

    // TODO: Real platform API calls would go here once Facebook/WeChat adapters are implemented.
    // For now, we simulate publishing (the mock adapters are browser-only, so we replicate the logic here).
    console.log(`[ScheduledPublish] Publishing post ${post.id} to ${post.platform} for org ${post.org_id}`)

    const mockPostId = `${post.platform}_${Date.now()}_${post.id.slice(0, 8)}`

    return { success: true, postId: mockPostId }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, postId: '', error: message }
  }
}

async function fetchAndStoreInsights(postId: string, platform: string, externalPostId: string): Promise<void> {
  try {
    // TODO: Real platform insights API calls would go here.
    // For now, generate mock insights (same as the mock adapters).
    const mockInsights = {
      views: Math.floor(Math.random() * 5000) + 500,
      likes: Math.floor(Math.random() * 200) + 20,
      comments: Math.floor(Math.random() * 30) + 2,
      shares: Math.floor(Math.random() * 50) + 5,
    }

    await supabase.from('post_insights').insert({
      post_id: postId,
      platform,
      metrics: mockInsights,
      fetched_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error(`[ScheduledPublish] Failed to fetch insights for post ${postId}:`, err)
  }
}

export const handler = schedule('*/15 * * * *', async () => {
  console.log('[ScheduledPublish] Starting scheduled publish check...')

  const now = new Date().toISOString()

  // Find all approved posts that are scheduled for now or earlier
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .eq('status', 'approved')
    .not('scheduled_date', 'is', null)
    .lte('scheduled_date', now)
    .order('scheduled_date', { ascending: true })
    .limit(10)

  if (error) {
    console.error('[ScheduledPublish] Error querying posts:', error.message)
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }

  if (!posts || posts.length === 0) {
    console.log('[ScheduledPublish] No approved posts due for publishing.')
    return { statusCode: 200, body: JSON.stringify({ message: 'No posts to publish' }) }
  }

  console.log(`[ScheduledPublish] Found ${posts.length} post(s) to publish.`)

  const results: { postId: string; success: boolean; error?: string }[] = []

  for (const post of posts as PostRow[]) {
    try {
      const result = await publishToPlatform(post)

      if (result.success) {
        // Update post status to published
        await supabase
          .from('posts')
          .update({
            status: 'published',
            published_at: now,
            updated_at: now,
          })
          .eq('id', post.id)

        // Fetch and store initial insights
        await fetchAndStoreInsights(post.id, post.platform, result.postId)

        console.log(`[ScheduledPublish] Published post ${post.id} to ${post.platform}`)
        results.push({ postId: post.id, success: true })
      } else {
        // Mark as failed
        await supabase
          .from('posts')
          .update({
            status: 'failed',
            updated_at: now,
          })
          .eq('id', post.id)

        console.error(`[ScheduledPublish] Failed to publish post ${post.id}: ${result.error}`)
        results.push({ postId: post.id, success: false, error: result.error })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error(`[ScheduledPublish] Error processing post ${post.id}:`, message)
      results.push({ postId: post.id, success: false, error: message })
    }
  }

  const published = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  console.log(`[ScheduledPublish] Done. Published: ${published}, Failed: ${failed}`)

  return {
    statusCode: 200,
    body: JSON.stringify({ published, failed, results }),
  }
})