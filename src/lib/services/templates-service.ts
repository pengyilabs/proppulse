import { supabase } from '../supabase'

export interface Template {
  id: string
  org_id: string
  name: string
  image_url: string
  type: 'uploaded' | 'generated'
  design_data: Record<string, unknown>
  created_by: string | null
  created_at: string
}

export async function getOrgTemplates(orgId: string): Promise<Template[]> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Template[]
}

export async function uploadTemplate(
  file: File,
  orgId: string,
  name: string
): Promise<Template> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Upload the image
  const ext = file.name.split('.').pop()
  const fileName = `templates/${orgId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('templates')
    .upload(fileName, file)

  if (uploadError) throw new Error(`Failed to upload template: ${uploadError.message}`)

  const { data: urlData } = supabase.storage
    .from('templates')
    .getPublicUrl(fileName)

  // Save the template record
  const { data, error } = await supabase
    .from('templates')
    .insert({
      org_id: orgId,
      name,
      image_url: urlData.publicUrl,
      type: 'uploaded',
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as Template
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}