import { callOpenRouter, callOpenRouterImage } from '../openrouter'
import { getListing } from './listings-service'
import type { Listing } from './listings-service'

export interface GeneratedContent {
  caption: string
  hashtags: string[]
  imageUrl?: string
  imagePrompt?: string
  imageVariants?: { url: string; prompt: string; createdAt: string }[]
}

export interface GenerationParams {
  listingId: string
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

  return details
}

function buildTextPrompt(
  listing: Listing,
  platform: 'facebook' | 'wechat',
  language: string,
  targetAudience?: string
): string {
  const listingSummary = buildListingSummary(listing)

  const languageNames: Record<string, string> = {
    en: 'English',
    fr: 'French',
    zh: 'Chinese',
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

function buildImagePrompt(listing: Listing, language: string): string {
  const listingSummary = buildListingSummary(listing)

  return `You are a real estate visual marketing expert. Generate a single, detailed image generation prompt for a real estate marketing poster image.

PROPERTY DETAILS:
${listingSummary}

LANGUAGE CONTEXT: ${language}

Create a detailed, descriptive prompt for an AI image generation model (like Flux) that will produce a high-quality real estate marketing poster. The prompt should describe:

1. The visual composition — a professional real estate marketing poster layout
2. The property itself — the building, exterior, or interior based on the details
3. Color scheme and mood — professional, inviting, luxury feel
4. Text overlay suggestions — the title and price should be prominent
5. The overall aesthetic — modern, clean, professional real estate marketing style

The image should look like a professional real estate "SOLD" or "FOR SALE" sign poster with the property prominently featured.

Output ONLY the prompt text, nothing else. Make it detailed (50-100 words) and descriptive enough for an AI image generator to produce a beautiful, professional real estate marketing image.`
}

export async function generateCaption(
  params: GenerationParams
): Promise<Pick<GeneratedContent, 'caption' | 'hashtags'>> {
  const listing = await getListing(params.listingId)

  const prompt = buildTextPrompt(
    listing,
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

export async function generatePosterImage(
  params: GenerationParams
): Promise<{ imageUrl: string; imagePrompt: string }> {
  const listing = await getListing(params.listingId)

  const imagePrompt = buildImagePrompt(listing, params.language)

  const { imageUrl } = await callOpenRouterImage(imagePrompt)

  return { imageUrl, imagePrompt }
}