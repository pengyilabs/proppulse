import { supabase } from '../supabase'

export interface Organization {
  id: string
  name: string
  slug: string
  brand_preferences: Record<string, unknown>
  approval_required: boolean
  logo_url: string | null
  tagline: string | null
  website: string | null
  default_language: string
  default_platform: string
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  org_id: string
  user_id: string
  role: 'admin' | 'broker'
  invited_by: string | null
  created_at: string
}

export async function getOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Organization[]
}

export async function getOrganization(id: string): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data as Organization
}

export async function createOrganization(
  name: string,
  slug: string
): Promise<Organization> {
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name, slug })
    .select('*')
    .single()

  if (orgError) throw new Error(orgError.message)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      org_id: org.id,
      user_id: user.id,
      role: 'admin',
    })

  if (memberError) throw new Error(memberError.message)

  return org as Organization
}

export async function updateOrganization(
  id: string,
  updates: Partial<Pick<Organization, 'name' | 'slug' | 'brand_preferences' | 'approval_required' | 'logo_url' | 'tagline' | 'website' | 'default_language' | 'default_platform'>>
): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as Organization
}

export async function getMembers(orgId: string): Promise<OrganizationMember[]> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data as OrganizationMember[]
}

export async function inviteMember(
  orgId: string,
  email: string,
  role: 'admin' | 'broker'
): Promise<OrganizationMember> {
  const { data: users, error: lookupError } = await supabase
    .rpc('lookup_user_by_email', { p_email: email })

  if (lookupError) throw new Error(`Failed to find user: ${lookupError.message}`)
  if (!users || users.length === 0) {
    throw new Error(`No user found with email: ${email}`)
  }

  const userId = users[0].id

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('organization_members')
    .insert({
      org_id: orgId,
      user_id: userId,
      role,
      invited_by: user.id,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as OrganizationMember
}

export async function removeMember(
  orgId: string,
  memberId: string
): Promise<void> {
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', memberId)
    .eq('org_id', orgId)

  if (error) throw new Error(error.message)
}

export async function uploadOrgLogo(
  file: File,
  orgId: string
): Promise<string> {
  const ext = file.name.split('.').pop()
  const fileName = `logos/${orgId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`

  const { error } = await supabase.storage
    .from('listings')
    .upload(fileName, file)

  if (error) throw new Error(error.message)

  const { data: urlData } = supabase.storage
    .from('listings')
    .getPublicUrl(fileName)

  return urlData.publicUrl
}