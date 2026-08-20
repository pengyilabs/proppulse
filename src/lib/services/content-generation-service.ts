import { callOpenRouter } from '../openrouter'
import { getListing } from './listings-service'
import type { Listing } from './listings-service'
import type { Template } from './templates-service'

export interface GeneratedContent {
  caption: string
  imagePrompt?: string
  videoPrompt?: string
  hashtags: string[]
}

export interface GenerationParams {
  listingId: string
  templateId: string
  platform: 'facebook' | 'wechat'
  language: string
  targetAudience?: string
}

function buildListingSummary(listing: Listing): string {
  const details = [
    listing.title ? `Title: ${listing.title}` : null,
    listing.description ? `Description: ${listing.description}` : null,
    listing.price != null ? `Price: $${Number(listing.price).toLocaleString()}` : null,
    listing.location ? `Location: ${listing.location}` : null,
    listing.property_type ? `Property Type: ${listing.property_type}` : null,
    listing.bedrooms != null ? `Bedrooms: ${listing.bedrooms}` : null,
    listing.bathrooms != null ? `Bathrooms: ${listing.bathrooms}` : null,
    listing.square_footage != null ? `Square Footage: ${listing.square_footage}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const imageCount = listing.images?.length ?? 0
  const imageNote = imageCount > 0 ? `\nAvailable images: ${imageCount} image(s)` : ''

  return details + imageNote
}

function buildTextPrompt(
  listing: Listing,
  template: Template,
  platform: 'facebook' | 'wechat',
  language: string,
  targetAudience?: string
): string {
  const listingSummary = buildListingSummary(listing)
  const designData = template.design_data ? JSON.stringify(template.design_data, null, 2) : 'No design data available'

  const languageNames: Record<string, string> = {
    en: 'English',
    fr: 'French',
    zh: 'Chinese',
    es: 'Spanish',
    ar: 'Arabic',
    ja: 'Japanese',
    ko: 'Korean',
    de: 'German',
  }

  const langName = languageNames[language] || language

  const platformGuides: Record<string, string> = {
    facebook:
      'For Facebook: Write an engaging, conversational post. Keep it between 80-200 words. Use emojis sparingly. Include a strong call to action. Optimize for the Facebook algorithm by encouraging comments and shares.',
    wechat:
      'For WeChat Official Account: Write a professional, article-style post. Use a formal yet warm tone. Include a compelling headline. Structure the content with clear sections. Keep paragraphs short for mobile reading.',
  }

  const audienceLine = targetAudience ? `\nTarget audience: ${targetAudience}` : ''

  return `You are a professional real estate social media marketing specialist. Generate a social media post for the following property listing.

PROPERTY DETAILS:
${listingSummary}

DESIGN TEMPLATE:
${designData}

PLATFORM: ${platform}
LANGUAGE: Write the entire post in ${langName}.
${audienceLine}

${platformGuides[platform] || ''}

Generate a JSON response with the following structure:
{
  "caption": "The full post caption text written in ${langName}",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]
}

Important requirements:
- The caption MUST be written entirely in ${langName}.
- Use 5-8 relevant hashtags that are popular in real estate markets.
- Include emojis naturally where appropriate for the ${platform} platform.
- Make the content engaging, informative, and marketable.
- Highlight the property's unique selling points.

Respond ONLY with the JSON object, no other text.`
}

function buildImagePromptContent(
  listing: Listing,
  template: Template,
  language: string
): string {
  const listingSummary = buildListingSummary(listing)
  const designData = template.design_data ? JSON.stringify(template.design_data, null, 2) : 'No design data available'

  return `You are a real estate visual marketing expert. Generate an image generation prompt for a social media post about this property.

PROPERTY DETAILS:
${listingSummary}

DESIGN TEMPLATE:
${designData}

LANGUAGE CONTEXT: ${language}

Create a detailed, descriptive prompt for a text-to-image AI model (like Flux) that will generate a high-quality real estate marketing image. The prompt should describe:

1. The visual composition and layout
2. Color scheme and mood
3. Key visual elements to include
4. Any text overlay suggestions (if applicable)
5. The overall aesthetic style

Output a JSON object:
{
  "imagePrompt": "A detailed, descriptive image generation prompt text"
}

Make the prompt detailed enough for an AI image generator to produce a beautiful, professional real estate marketing image.

Respond ONLY with the JSON object, no other text.`
}

function buildVideoPromptContent(listing: Listing, language: string): string {
  const listingSummary = buildListingSummary(listing)

  return `You are a real estate video marketing expert. Generate a video production prompt for a property showcase video.

PROPERTY DETAILS:
${listingSummary}

LANGUAGE CONTEXT: ${language}

Create a detailed shot-by-shot prompt for a video generation AI that describes a short (15-30 second) real estate property showcase video. Describe:

1. Opening shot and establishing visuals
2. Key property features to highlight in sequence
3. Camera movements and transitions
4. Text overlay timing and placement
5. Overall mood and pacing

Output a JSON object:
{
  "videoPrompt": "A detailed, shot-by-shot video generation prompt text"
}

Respond ONLY with the JSON object, no other text.`
}

export async function generateTextContent(
  params: GenerationParams
): Promise<Pick<GeneratedContent, 'caption' | 'hashtags'>> {
  const listing = await getListing(params.listingId)

  const { getTemplatesForListing } = await import('./templates-service')
  const templates = await getTemplatesForListing(params.listingId)
  const template = templates.find((t) => t.id === params.templateId)
  if (!template) {
    throw new Error(`Template not found: ${params.templateId}`)
  }

  const prompt = buildTextPrompt(
    listing,
    template,
    params.platform,
    params.language,
    params.targetAudience
  )

  const response = await callOpenRouter({
    model: 'deepseek/deepseek-chat',
    messages: [
      {
        role: 'system',
        content: 'You are a real estate social media marketing specialist. You output only valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 2048,
    temperature: 0.7,
  })

  const content = response.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('No content in OpenRouter response for text generation')
  }

  let result: { caption: string; hashtags: string[] }
  try {
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    result = JSON.parse(cleaned)
  } catch {
    throw new Error('Failed to parse AI-generated text content')
  }

  if (!result.caption || !Array.isArray(result.hashtags)) {
    throw new Error('AI response missing required fields: caption or hashtags')
  }

  return { caption: result.caption, hashtags: result.hashtags }
}

export async function generateImagePrompt(
  params: GenerationParams
): Promise<Pick<GeneratedContent, 'imagePrompt'>> {
  const listing = await getListing(params.listingId)

  const { getTemplatesForListing } = await import('./templates-service')
  const templates = await getTemplatesForListing(params.listingId)
  const template = templates.find((t) => t.id === params.templateId)
  if (!template) {
    throw new Error(`Template not found: ${params.templateId}`)
  }

  const prompt = buildImagePromptContent(listing, template, params.language)

  const response = await callOpenRouter({
    model: 'black-forest-labs/flux-schnell',
    messages: [
      {
        role: 'system',
        content: 'You are a visual marketing expert. You output only valid JSON.',
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
    throw new Error('No content in OpenRouter response for image prompt generation')
  }

  let result: { imagePrompt: string }
  try {
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    result = JSON.parse(cleaned)
  } catch {
    throw new Error('Failed to parse AI-generated image prompt')
  }

  return { imagePrompt: result.imagePrompt }
}

export async function generateVideoPrompt(
  params: GenerationParams
): Promise<Pick<GeneratedContent, 'videoPrompt'>> {
  const listing = await getListing(params.listingId)

  const prompt = buildVideoPromptContent(listing, params.language)

  const response = await callOpenRouter({
    model: 'deepseek/deepseek-chat',
    messages: [
      {
        role: 'system',
        content: 'You are a video production expert. You output only valid JSON.',
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
    throw new Error('No content in OpenRouter response for video prompt generation')
  }

  let result: { videoPrompt: string }
  try {
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    result = JSON.parse(cleaned)
  } catch {
    throw new Error('Failed to parse AI-generated video prompt')
  }

  return { videoPrompt: result.videoPrompt }
}

export async function generateFullContent(
  params: GenerationParams
): Promise<GeneratedContent> {
  const [textResult, imageResult, videoResult] = await Promise.allSettled([
    generateTextContent(params),
    generateImagePrompt(params),
    generateVideoPrompt(params),
  ])

  const result: GeneratedContent = {
    caption: '',
    hashtags: [],
  }

  if (textResult.status === 'fulfilled') {
    result.caption = textResult.value.caption
    result.hashtags = textResult.value.hashtags
  } else {
    throw new Error(`Text generation failed: ${textResult.reason?.message || 'Unknown error'}`)
  }

  if (imageResult.status === 'fulfilled') {
    result.imagePrompt = imageResult.value.imagePrompt
  }

  if (videoResult.status === 'fulfilled') {
    result.videoPrompt = videoResult.value.videoPrompt
  }

  return result
}