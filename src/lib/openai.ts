export interface FeedbackResponse {
  feedback: string;
}

export async function getFeedback(params: {
  slug: string;
  first: string;
  source: string;
  second?: string;
  delta_seconds?: number | null;
}): Promise<FeedbackResponse> {
  const res = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Feedback API error: ${res.status}`);
  return res.json();
}
