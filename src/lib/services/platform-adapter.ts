export interface PlatformAccount {
  platform: string
  pageId: string
  pageName: string
  connected: boolean
}

export interface PublishPost {
  content: string
  imageUrl?: string
  videoUrl?: string
  platform: string
  language: string
}

export interface PublishResult {
  success: boolean
  postId: string
  url?: string
  error?: string
}

export interface PostInsights {
  views: number
  likes: number
  comments: number
  shares: number
}

export interface PlatformAdapter {
  connect(): Promise<PlatformAccount>
  disconnect(): Promise<void>
  publish(post: PublishPost): Promise<PublishResult>
  getInsights(postId: string): Promise<PostInsights>
}

export class PlatformRegistry {
  private adapters = new Map<string, PlatformAdapter>()

  registerAdapter(platform: string, adapter: PlatformAdapter): void {
    this.adapters.set(platform, adapter)
  }

  getAdapter(platform: string): PlatformAdapter | undefined {
    return this.adapters.get(platform)
  }
}

export const platformRegistry = new PlatformRegistry()