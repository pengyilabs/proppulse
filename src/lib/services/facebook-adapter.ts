import type { PlatformAdapter, PlatformAccount, PublishPost, PublishResult, PostInsights } from './platform-adapter'
import { supabase } from '../supabase'

export class FacebookAdapter implements PlatformAdapter {
  private orgId: string
  private pageId: string | null = null
  private accessToken: string | null = null

  constructor(orgId: string) {
    this.orgId = orgId
  }

  async connect(): Promise<PlatformAccount> {
    // TODO: In production, redirect user through Facebook OAuth flow to obtain
    // a long-lived Page access token via the Facebook Graph API.
    // For now, credentials are stored via the settings page form and passed
    // through social-accounts-service. This method reads the stored credentials.

    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('org_id', this.orgId)
      .eq('platform', 'facebook')
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('No Facebook account connected')

    this.pageId = data.page_id
    this.accessToken = data.access_token

    return {
      platform: 'facebook',
      pageId: data.page_id ?? '',
      pageName: data.page_name ?? 'Facebook Page',
      connected: true,
    }
  }

  async disconnect(): Promise<void> {
    const { error } = await supabase
      .from('social_accounts')
      .update({ is_active: false, access_token: null, token_expires_at: null })
      .eq('org_id', this.orgId)
      .eq('platform', 'facebook')

    if (error) throw new Error(error.message)

    this.pageId = null
    this.accessToken = null
  }

  async publish(post: PublishPost): Promise<PublishResult> {
    if (!this.pageId || !this.accessToken) {
      throw new Error('Facebook account not connected. Call connect() first.')
    }

    // TODO: In production, use the Facebook Graph API to publish to the page:
    // POST https://graph.facebook.com/v18.0/{pageId}/feed
    // with body: { message: post.content, access_token: this.accessToken }
    // For photo posts:
    // POST https://graph.facebook.com/v18.0/{pageId}/photos
    // with body: { url: post.imageUrl, caption: post.content, access_token: this.accessToken }

    console.log('[FacebookAdapter] Simulating publish:', {
      pageId: this.pageId,
      content: post.content,
      imageUrl: post.imageUrl,
      videoUrl: post.videoUrl,
      language: post.language,
    })

    return {
      success: true,
      postId: `fb_mock_${Date.now()}`,
      url: `https://facebook.com/${this.pageId}/posts/mock`,
    }
  }

  async getInsights(_postId: string): Promise<PostInsights> {
    // TODO: In production, fetch from Facebook Insights API:
    // GET https://graph.facebook.com/v18.0/{postId}/insights
    // with params: metric=post_impressions,post_engaged_users,post_reactions_by_type_total
    // and access_token: this.accessToken

    return {
      views: Math.floor(Math.random() * 5000) + 500,
      likes: Math.floor(Math.random() * 200) + 20,
      comments: Math.floor(Math.random() * 30) + 2,
      shares: Math.floor(Math.random() * 50) + 5,
    }
  }
}