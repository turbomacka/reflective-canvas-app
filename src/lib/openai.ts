export async function getFeedback(first: string, second: string): Promise<string> {
  const res = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ first, second }),
  });
  if (!res.ok) throw new Error('LLM-error');
  return res.text();
}
