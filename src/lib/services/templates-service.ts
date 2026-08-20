import { supabase } from '../supabase'
import { callOpenRouter } from '../openrouter'

export interface Template {
  id: string
  org_id: string
  listing_id: string | null
  name: string | null
  design_data: Record<string, unknown>
  preview_url: string | null
  created_by: string | null
  created_at: string
}

export interface ListingData {
  id: string
  title: string
  description: string | null
  price: number | null
  location: string | null
  property_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  square_footage: number | null
  images: string[] | null
}

export async function getTemplates(orgId: string): Promise<Template[]> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Template[]
}

export async function getTemplatesForListing(listingId: string): Promise<Template[]> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Template[]
}

async function getListing(listingId: string): Promise<ListingData> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .single()

  if (error) throw new Error(`Failed to fetch listing: ${error.message}`)
  return data as ListingData
}

function buildTemplatePrompt(listing: ListingData): string {
  const details = [
    listing.title ? `Title: ${listing.title}` : null,
    listing.description ? `Description: ${listing.description}` : null,
    listing.price != null ? `Price: $${Number(listing.price).toLocaleString()}` : null,
    listing.location ? `Location: ${listing.location}` : null,
    listing.property_type ? `Type: ${listing.property_type}` : null,
    listing.bedrooms != null ? `Bedrooms: ${listing.bedrooms}` : null,
    listing.bathrooms != null ? `Bathrooms: ${listing.bathrooms}` : null,
    listing.square_footage != null ? `Square Footage: ${listing.square_footage}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return `You are a professional social media design assistant for real estate marketing. Create a social media post design template for the following property listing:

${details}

Generate a design template as a JSON object with the following structure:
{
  "layout": "one of: classic, modern, minimal, bold, elegant",
  "colorScheme": {
    "primary": "hex color",
    "secondary": "hex color",
    "accent": "hex color",
    "text": "hex color",
    "background": "hex color"
  },
  "typography": {
    "titleFont": "font family name",
    "bodyFont": "font family name",
    "titleSize": "size in px",
    "bodySize": "size in px"
  },
  "textPlacement": {
    "titlePosition": "top | middle | bottom",
    "titleAlignment": "left | center | right",
    "pricePosition": "top | middle | bottom",
    "priceAlignment": "left | center | right"
  },
  "style": {
    "borderRadius": "px value",
    "shadow": "none | small | medium | large",
    "overlay": true or false,
    "overlayColor": "hex color with opacity"
  },
  "imageTreatment": "full | contained | side-by-side",
  "callToAction": {
    "text": "short CTA text",
    "style": "button | text-link | pill"
  }
}

Respond ONLY with the JSON object, no other text.`
}

export async function generateTemplate(
  listingId: string,
  _orgId: string
): Promise<Pick<Template, 'design_data' | 'name'>> {
  const listing = await getListing(listingId)

  const prompt = buildTemplatePrompt(listing)

  const response = await callOpenRouter({
    model: 'deepseek/deepseek-chat',
    messages: [
      {
        role: 'system',
        content: 'You are a real estate social media design assistant. You output only valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 1024,
    temperature: 0.7,
  })

  const content = response.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('No content in OpenRouter response')
  }

  let designData: Record<string, unknown>
  try {
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    designData = JSON.parse(cleaned)
  } catch {
    throw new Error('Failed to parse AI-generated template design')
  }

  const name = `${listing.title || 'Property'} - ${designData.layout || 'Template'}`

  return { design_data: designData, name }
}

export async function saveTemplate(
  data: Pick<Template, 'org_id' | 'listing_id' | 'name' | 'design_data' | 'preview_url'>
): Promise<Template> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: template, error } = await supabase
    .from('templates')
    .insert({
      org_id: data.org_id,
      listing_id: data.listing_id,
      name: data.name,
      design_data: data.design_data,
      preview_url: data.preview_url,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return template as Template
}