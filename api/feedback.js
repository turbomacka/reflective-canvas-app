const OpenAI = require('openai');

/** @type {(req, res) => Promise<void>} */
module.exports = async function handler(req, res) {
  // -- 1. Tillåt bara POST -----------------------------------------------
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  // -- 2. Läs och parsa body säkert ---------------------------------------
  let first = '';
  let second = '';

  try {
    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : req.body || {};

    first = body.first ?? '';
    second = body.second ?? '';
  } catch {
    res.status(400).send('Invalid JSON payload');
    return;
  }

  // -- 3. Bygg prompten ----------------------------------------------------
  const safeSource = source.slice(0, 9000);    // trunkera om texten är jättelång

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

1. Ange punktvis vad SVAR 2 har förbättrat jämfört med SVAR 1 – hänvisa till källtexten.
2. Lista fel eller saknade aspekter som fortfarande finns i SVAR 2, sett till källtexten.
3. Ge två konkreta råd på hur SVAR 2 kan bli helt korrekt.

Svar på svenska och gärna punktlistor för tydlighet.
`;


  // -- 4. Anropa OpenAI ----------------------------------------------------
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-0125', // alltid tillgänglig
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    res.status(200).send(completion.choices[0].message.content);
  } catch (err) {
    console.error('GPT-fel:', err);
    res.status(500).send('LLM-error');
  }
};
