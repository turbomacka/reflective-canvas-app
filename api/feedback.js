// api/feedback.js
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPA_URL.replace(/^https:\/\//, 'https://'),
  process.env.VITE_SUPA_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  let { slug = '', first = '', second, source = '', delta_seconds } =
    typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  try {
    const safeSource = source.slice(0, 9000);

    // Build time bullet
    let timeBullet = '';
    if (second && typeof delta_seconds === 'number') {
      timeBullet = `4. You spent ${delta_seconds} seconds on your revision.`;
      if (delta_seconds < 60) {
        timeBullet += ` (Under 60 s – consider taking a few more minutes to reflect deeply on the material.)`;
      }
    }

    // System prompt in English, language-neutral
    const systemPrompt = `
You are an empathetic feedback assistant. Always respond in the exact same language the user used in their first answer. Do not translate or default to any other language. Address the user directly using "you"/"your". Use a bullet list with this structure:
1) Recognize improvements
2) Identify remaining issues
3) Provide two concrete, friendly suggestions
4) Report time spent (see bullet 4).
`;

    // User prompt depends on whether it's first or second feedback
    let userPrompt;
    if (!second) {
      userPrompt = `
Here is the source text you must refer to:

────────────────────────────────────
${safeSource}
────────────────────────────────────

User's first answer:
\"\"\"${first}\"\"\"

Your task:
1. Recognize what you did well.
2. Identify what is missing or needs improvement according to the source.
3. Give friendly, concrete tips for how to improve before the next revision.

Please follow the system instructions above.`;
    } else {
      userPrompt = `
Here is the source text you must refer to:

────────────────────────────────────
${safeSource}
────────────────────────────────────

User's first answer:
\"\"\"${first}\"\"\"

User's revised answer:
\"\"\"${second}\"\"\"

Your task:
1. Recognize what improvements have been made compared to the first answer.
2. Identify what still needs development according to the source.
3. Provide two concrete, friendly suggestions to make the revised answer fully correct.
${timeBullet}

Please follow the system instructions above.`;
    }

    // Call OpenAI
    const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt.trim() },
        { role: 'user',   content: userPrompt.trim() }
      ],
      temperature: 0.7,
    });

    const feedback = completion.choices[0].message.content;

    // Save log for second answer
    if (second) {
      await supabase.from('conversation_logs').insert({
        slug,
        first,
        second,
        feedback,
        delta_seconds,
      });
    }

    return res.status(200).json({ feedback });
  } catch (err) {
    console.error('Error in /api/feedback:', err);
    return res.status(500).json({ error: err.message });
  }
};
