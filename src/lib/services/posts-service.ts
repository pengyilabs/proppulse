import { supabase } from '../supabase'

export interface Post {
  id: string
  org_id: string
  broker_id: string
  listing_id: string | null
  template_id: string | null
  content: Record<string, unknown>
  status: 'draft' | 'pending_approval' | 'approved' | 'scheduled' | 'published' | 'failed' | 'rejected'
  scheduled_date: string | null
  platform: string
  language: string
  rejection_feedback: string | null
  approved_by: string | null
  approved_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface PostWithRelations extends Post {
  listings: { title: string } | null
  broker_email: string | null
}

export interface CreatePostData {
  org_id: string
  broker_id: string
  listing_id?: string | null
  template_id?: string | null
  content: Record<string, unknown>
  status?: Post['status']
  scheduled_date?: string | null
  platform: string
  language?: string
}

export async function getPosts(orgId: string): Promise<PostWithRelations[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*, listings(title)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const posts = data as PostWithRelations[]

  const brokerIds = [...new Set(posts.map((p) => p.broker_id))]
  if (brokerIds.length > 0) {
    const { data: members, error: memberError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('org_id', orgId)
      .in('user_id', brokerIds)

    if (!memberError && members) {
      const { data: users } = await supabase.auth.admin?.listUsers()
      const emailMap = new Map<string, string>()

      if (users?.users) {
        for (const u of users.users) {
          if (u.email) emailMap.set(u.id, u.email)
        }
      }

      for (const post of posts) {
        post.broker_email = emailMap.get(post.broker_id) || null
      }
    }
  }

  return posts
}

export async function getPost(id: string): Promise<PostWithRelations> {
  const { data, error } = await supabase
    .from('posts')
    .select('*, listings(title)')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)

  const post = data as PostWithRelations
  post.broker_email = null

  return post
}

export async function getPendingApprovals(orgId: string): Promise<PostWithRelations[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*, listings(title)')
    .eq('org_id', orgId)
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const posts = data as PostWithRelations[]

  const brokerIds = [...new Set(posts.map((p) => p.broker_id))]
  if (brokerIds.length > 0) {
    const { data: members, error: memberError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('org_id', orgId)
      .in('user_id', brokerIds)

    if (!memberError && members) {
      const { data: users } = await supabase.auth.admin?.listUsers()
      const emailMap = new Map<string, string>()

      if (users?.users) {
        for (const u of users.users) {
          if (u.email) emailMap.set(u.id, u.email)
        }
      }

      for (const post of posts) {
        post.broker_email = emailMap.get(post.broker_id) || null
      }
    }
  }

  return posts
}

export async function getBrokerPosts(
  orgId: string,
  brokerId: string
): Promise<PostWithRelations[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*, listings(title)')
    .eq('org_id', orgId)
    .eq('broker_id', brokerId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as PostWithRelations[]
}

export async function createPost(data: CreatePostData): Promise<Post> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      org_id: data.org_id,
      broker_id: data.broker_id,
      listing_id: data.listing_id ?? null,
      template_id: data.template_id ?? null,
      content: data.content,
      status: data.status ?? 'pending_approval',
      scheduled_date: data.scheduled_date ?? null,
      platform: data.platform,
      language: data.language ?? 'en',
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return post as Post
}

export async function approvePost(postId: string, approvedBy: string): Promise<Post> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('posts')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: now,
      updated_at: now,
    })
    .eq('id', postId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as Post
}

export async function rejectPost(
  postId: string,
  _rejectedBy: string,
  feedback: string
): Promise<Post> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('posts')
    .update({
      status: 'rejected',
      rejection_feedback: feedback,
      updated_at: now,
    })
    .eq('id', postId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as Post
}

export async function updatePostStatus(
  id: string,
  status: Post['status']
): Promise<Post> {
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { status, updated_at: now }

  if (status === 'published') {
    updates.published_at = now
  }

  const { data, error } = await supabase
    .from('posts')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as Post
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}