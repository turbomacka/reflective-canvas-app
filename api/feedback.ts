import { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  const { first, second } = req.body as { first: string; second: string };

  const prompt = `Du är en hjälpsam handledare. Jämför följande två svar och ge konkret feedback på förändringar i förståelse.\n\nFörsta svar:\n"""${first}"""\n\nAndra svar:\n"""${second}"""`;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  res.status(200).send(completion.choices[0].message.content);
}
