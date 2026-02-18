// Helper: extract text from OpenAI Responses API payload
export function extractResponsesText(data) {
  const message = data?.output?.find((item) => item?.type === 'message' && item?.role === 'assistant');
  const parts = message?.content?.filter((c) => c?.type === 'output_text') ?? [];
  return parts.map((p) => p.text).join('').trim();
}

// Call OpenAI API for dream interpretation
export async function getDreamInterpretation(dreamText) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Server misconfigured: OPENAI_API_KEY is missing');
  }

  const apiUrl = 'https://api.openai.com/v1/responses';
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      instructions:
        'You are a thoughtful dream interpreter. Be insightful but gentle, and consider common dream symbolism. Keep your interpretation to 2-3 paragraphs.',
      input: `Dream: ${dreamText}`,
      max_output_tokens: 512
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return extractResponsesText(data);
}
