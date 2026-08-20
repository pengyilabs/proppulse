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