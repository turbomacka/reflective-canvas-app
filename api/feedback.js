const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

// Initiera Supabase
const supabase = createClient(
  process.env.VITE_SUPA_URL.replace(/^https:\/\//, 'https://'),
  process.env.VITE_SUPA_KEY
);

/** @type {(req, res) => Promise<void>} */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  // Läs och parsa body
  let first = '', second = '', source = '', slug = '', delta_seconds = null;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    first         = body.first ?? '';
    second        = body.second ?? '';
    source        = body.source ?? '';
    slug          = body.slug ?? '';
    delta_seconds = body.delta_seconds ?? null;
  } catch {
    res.status(400).send('Invalid JSON payload');
    return;
  }

  // Bygg prompt
  const safeSource = source.slice(0, 9000);
  const prompt = `
Du är en strikt gransknings-assistent. Du får endast använda KÄLLTEXTEN nedan
som referens.

────────────────────────────────────
KÄLLTEXT:
"""${safeSource}"""
────────────────────────────────────

Studentens första svar:
"""${first}"""

Studentens andra svar:
"""${second}"""

Tidsåtgång mellan svar: ${delta_seconds ?? 'okänt'} sekunder

Din uppgift:
1. Punktvis: vad har förbättrats i SVAR 2 jämfört med SVAR 1 – hänvisa till källtexten.
2. Punktvis: vad saknas eller misstolkas fortfarande i SVAR 2 enligt källtexten.
3. Två konkreta råd för hur SVAR 2 kan bli helt korrekt.

Svara på svenska och gärna som punktlista för tydlighet.
`;

  // GPT-anrop
  let aiFeedback;
  try {
    const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-0613',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
    aiFeedback = completion.choices[0].message.content;
  } catch (err) {
    console.error('GPT-fel:', err);
    res.status(500).send('LLM-error');
    return;
  }

  // Spara logg i Supabase
  const { error } = await supabase
    .from('conversation_logs')
    .insert([{
      slug,
      first,
      second,
      feedback: aiFeedback,
      delta_seconds,
    }]);
  if (error) console.error('Supabase-log error:', error);

  // Svara klient
  res.status(200).json({ feedback: aiFeedback });
};
