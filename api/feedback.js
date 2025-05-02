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
    typeof req.body === 'string'
      ? JSON.parse(req.body)
      : req.body;

  try {
    // Bygg prompt beroende på om det är första eller andra svaret
    const safeSource = source.slice(0, 9000);
    let prompt;

    if (!second) {
      // Initial feedback
      prompt = `
Du är en pedagogisk granskningsassistent. Använd endast KÄLLTEXTEN nedan.

────────────────────────────────────
KÄLLTEXT:
"""${safeSource}"""
────────────────────────────────────

Studentens svar:
"""${first}"""

Din uppgift:
1. Bedöm om svaret är korrekt.
2. Lista fel eller saknade aspekter enligt källtexten.
3. Ge tips på vad studenten bör fokusera på innan revision.

Svara på svenska, som punktlista.
`;
    } else {
      // Final feedback
      prompt = `
Du är en strikt granskningsassistent. Utgå ENDAST från KÄLLTEXTEN nedan.

────────────────────────────────────
KÄLLTEXT:
"""${safeSource}"""
────────────────────────────────────

Studentens första svar:
"""${first}"""

Studentens andra svar:
"""${second}"""

Tidsåtgång för revision: ${delta_seconds ?? 'okänt'} sekunder

Din uppgift:
1. Punktvis: vad har förbättrats i SVAR 2 jämfört med SVAR 1 – hänvisa till källtexten.
2. Punktvis: vad saknas eller misstolkas fortfarande i SVAR 2.
3. Två konkreta råd för hur SVAR 2 kan bli helt korrekt.

Svara på svenska, som punktlista.
`;
    }

    // Anropa OpenAI med en aktuell modell
    const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
    const feedback = completion.choices[0].message.content;

    // Spara logg om det är final feedback
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
