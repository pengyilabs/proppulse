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
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'PropPulse',
    },
    body: JSON.stringify({
      model: 'black-forest-labs/flux-schnell',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter image generation error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  // Extract image URL from the response (Flux returns markdown image syntax or URL)
  const imageUrlMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
  const urlMatch = content.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|webp))/i);

  const imageUrl = imageUrlMatch?.[1] || urlMatch?.[0] || content.trim();

  if (!imageUrl || !imageUrl.startsWith('http')) {
    throw new Error('No valid image URL in Flux response');
  }

  return { imageUrl, prompt };
}