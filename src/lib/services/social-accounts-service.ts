import { supabase } from '../supabase'

export interface SocialAccount {
  id: string
  org_id: string
  platform: string
  page_id: string | null
  page_name: string | null
  credentials: Record<string, unknown>
  access_token: string | null
  token_expires_at: string | null
  is_active: boolean
  connected_by: string | null
  created_at: string
}

export async function getSocialAccounts(orgId: string): Promise<SocialAccount[]> {
  const { data, error } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as SocialAccount[]
}

export async function connectAccount(
  orgId: string,
  platform: string,
  credentials: Record<string, unknown>
): Promise<SocialAccount> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Check if an active account already exists for this org+platform
  const { data: existing } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('org_id', orgId)
    .eq('platform', platform)
    .eq('is_active', true)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('social_accounts')
      .update({
        page_id: (credentials.page_id as string) ?? null,
        page_name: (credentials.page_name as string) ?? null,
        credentials,
        access_token: (credentials.access_token as string) ?? null,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return data as SocialAccount
  }

  const { data, error } = await supabase
    .from('social_accounts')
    .insert({
      org_id: orgId,
      platform,
      page_id: (credentials.page_id as string) ?? null,
      page_name: (credentials.page_name as string) ?? null,
      credentials,
      access_token: (credentials.access_token as string) ?? null,
      is_active: true,
      connected_by: user.id,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as SocialAccount
}

export async function disconnectAccount(accountId: string): Promise<void> {
  const { error } = await supabase
    .from('social_accounts')
    .update({ is_active: false, access_token: null, token_expires_at: null })
    .eq('id', accountId)

  if (error) throw new Error(error.message)
}