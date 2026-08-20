const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';

interface OpenRouterRequest {
  model: string;
  messages: { role: string; content: string }[];
  max_tokens?: number;
  temperature?: number;
}

export async function callOpenRouter(params: OpenRouterRequest) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'PropPulse',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export interface ImageGenerationResult {
  imageUrl: string
  prompt: string
}

export async function callOpenRouterImage(prompt: string): Promise<ImageGenerationResult> {
  const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'PropPulse',
    },
    body: JSON.stringify({
      model: 'black-forest-labs/flux-1.1-pro',
      prompt,
      n: 1,
      size: '1024x1024',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter image generation error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // The images endpoint returns { data: [{ url: string }] }
  const imageUrl = data.data?.[0]?.url;

  if (!imageUrl) {
    throw new Error('No image URL in response from OpenRouter image generation');
  }

  return { imageUrl, prompt };
}