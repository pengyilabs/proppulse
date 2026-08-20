import { supabase } from '../supabase'

export interface Listing {
  id: string
  org_id: string
  title: string
  description: string | null
  price: number | null
  location: string | null
  property_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  square_footage: number | null
  images: string[]
  custom_fields: Record<string, unknown>
  language_variants: Record<string, unknown>
  status: 'active' | 'sold' | 'inactive'
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateListingData {
  title: string
  description?: string | null
  price?: number | null
  location?: string | null
  property_type?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  square_footage?: number | null
  images?: string[]
  custom_fields?: Record<string, unknown>
  language_variants?: Record<string, unknown>
  status?: 'active' | 'sold' | 'inactive'
}

export async function getListings(orgId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Listing[]
}

export async function getListing(id: string): Promise<Listing> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data as Listing
}

export async function createListing(
  orgId: string,
  data: CreateListingData
): Promise<Listing> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: listing, error } = await supabase
    .from('listings')
    .insert({
      org_id: orgId,
      title: data.title,
      description: data.description ?? null,
      price: data.price ?? null,
      location: data.location ?? null,
      property_type: data.property_type ?? null,
      bedrooms: data.bedrooms ?? null,
      bathrooms: data.bathrooms ?? null,
      square_footage: data.square_footage ?? null,
      images: data.images ?? [],
      custom_fields: data.custom_fields ?? {},
      language_variants: data.language_variants ?? {},
      status: data.status ?? 'active',
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return listing as Listing
}

export async function updateListing(
  id: string,
  updates: Partial<CreateListingData>
): Promise<Listing> {
  const { data, error } = await supabase
    .from('listings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as Listing
}

export async function deleteListing(id: string): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function uploadListingImage(
  file: File,
  orgId: string
): Promise<string> {
  const ext = file.name.split('.').pop()
  const fileName = `${orgId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`

  const { error, data } = await supabase.storage
    .from('listings')
    .upload(fileName, file)

  if (error) throw new Error(error.message)

  const { data: urlData } = supabase.storage
    .from('listings')
    .getPublicUrl(data.path)

  return urlData.publicUrl
}