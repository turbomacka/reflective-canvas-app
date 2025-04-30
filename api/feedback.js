const OpenAI = require('openai');

/** @type {(req, res) => Promise<void>} */
module.exports = async function handler(req, res) {
  // ── 1. Tillåt bara POST ───────────────────────────────────────────────
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  // ── 2. Läs och parsa body säkert ──────────────────────────────────────
  let first = '';
  let second = '';
  let source = '';

  try {
    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : req.body || {};

    first  = body.first  ?? '';
    second = body.second ?? '';
    source = body.source ?? '';
  } catch {
    res.status(400).send('Invalid JSON payload');
    return;
  }

  // ── 3. Bygg prompten ──────────────────────────────────────────────────
  const safeSource = source.slice(0, 9000); // trunkera om texten är jättelång

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

Din uppgift:

1. Punktvis: vad har förbättrats i SVAR 2 jämfört med SVAR 1 – hänvisa till källtexten.
2. Punktvis: vad saknas eller misstolkas fortfarande i SVAR 2 enligt källtexten.
3. Två konkreta råd för hur SVAR 2 kan bli helt korrekt.

Svara på svenska och gärna som punktlista för tydlighet.
`;

  // ── 4. Anropa OpenAI ──────────────────────────────────────────────────
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-0125',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    res.status(200).send(completion.choices[0].message.content);
  } catch (err) {
    console.error('GPT-fel:', err);
    res.status(500).send('LLM-error');
  }
};
