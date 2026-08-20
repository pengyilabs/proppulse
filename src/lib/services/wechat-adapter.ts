import type { PlatformAdapter, PlatformAccount, PublishPost, PublishResult, PostInsights } from './platform-adapter'
import { supabase } from '../supabase'

export class WeChatAdapter implements PlatformAdapter {
  private orgId: string
  private appId: string | null = null
  private appSecret: string | null = null

  constructor(orgId: string) {
    this.orgId = orgId
  }

  async connect(): Promise<PlatformAccount> {
    // TODO: In production, use the WeChat Official Account API to obtain an
    // access token via the client_credential grant:
    // GET https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={appId}&secret={appSecret}
    // For now, credentials are stored via the settings page form and passed
    // through social-accounts-service. This method reads the stored credentials.

    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('org_id', this.orgId)
      .eq('platform', 'wechat')
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('No WeChat account connected')

    this.appId = data.credentials?.app_id ?? null
    this.appSecret = data.credentials?.app_secret ?? null

    return {
      platform: 'wechat',
      pageId: data.page_id ?? '',
      pageName: data.page_name ?? 'WeChat Official Account',
      connected: true,
    }
  }

  async disconnect(): Promise<void> {
    const { error } = await supabase
      .from('social_accounts')
      .update({ is_active: false, access_token: null, token_expires_at: null })
      .eq('org_id', this.orgId)
      .eq('platform', 'wechat')

    if (error) throw new Error(error.message)

    this.appId = null
    this.appSecret = null
  }

  async publish(post: PublishPost): Promise<PublishResult> {
    if (!this.appId || !this.appSecret) {
      throw new Error('WeChat account not connected. Call connect() first.')
    }

    // TODO: In production, use the WeChat Official Account API to publish articles:
    // 1. Obtain access_token via client_credential grant
    // 2. POST https://api.weixin.qq.com/cgi-bin/material/add_news
    //    with body: { articles: [{ title, content, ... }] }
    // 3. POST https://api.weixin.qq.com/cgi-bin/message/mass/sendall
    //    to broadcast the article to followers

    console.log('[WeChatAdapter] Simulating publish:', {
      appId: this.appId,
      content: post.content,
      imageUrl: post.imageUrl,
      videoUrl: post.videoUrl,
      language: post.language,
    })

    return {
      success: true,
      postId: `wx_mock_${Date.now()}`,
      url: `https://mp.weixin.qq.com/s/mock`,
    }
  }

  async getInsights(_postId: string): Promise<PostInsights> {
    // TODO: In production, fetch from WeChat Analytics API:
    // POST https://api.weixin.qq.com/datacube/getarticletotal
    // with body: { begin_date, end_date }
    // and access_token from the client_credential grant

    return {
      views: Math.floor(Math.random() * 8000) + 1000,
      likes: Math.floor(Math.random() * 300) + 30,
      comments: Math.floor(Math.random() * 50) + 5,
      shares: Math.floor(Math.random() * 100) + 10,
    }
  }
}