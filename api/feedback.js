const OpenAI = require('openai');

/** @type {(req, res) => Promise<void>} */
module.exports = async function handler(req, res) {
  // ── 1. POST eller inget ───────────────────────────────────────────────
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  // ── 2. Hämta slug, first, second, source ──────────────────────────────
  let slug   = '';
  let first  = '';
  let second = '';
  let source = '';

  try {
    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : req.body || {};

    slug   = body.slug   ?? '';
    first  = body.first  ?? '';
    second = body.second ?? '';
    source = body.source ?? '';
  } catch {
    res.status(400).send('Invalid JSON payload');
    return;
  }

  // ── 3. Prompt (trunkera källtext om jätte­stor) ───────────────────────
  const safeSource = source.slice(0, 40000);

  const prompt =
    second.trim() === ''
      ? /* ─ snabbbedömning ─ */
        `
Du är en personlig granskningsassistent. Bedöm om **ditt svar** är
helt korrekt mot källtexten eller ofullständigt/fel.

KÄLLTEXT:
"""${safeSource}"""

Ditt svar:
"""${first}"""

Svara exakt en rad JSON där nyckelordet "perfect" är sant eller falskt, och ge
kort feedback i andra person, t.ex. "Bra fokus på X, men glöm inte att…":
{ "perfect": true/false, "fb": "…" }
`
      : /* ─ slutlig jämförelse ─ */
        `
Du är en personlig granskningsassistent. Använd endast källtexten nedan som facit.

KÄLLTEXT:
"""${safeSource}"""

När du beskrev ditt första svar:
"""${first}"""

Och när du utvecklade till ditt andra svar:
"""${second}"""

1. När du skriver visar du förbättringar i ditt andra svar jämfört med det första – 
   hänvisa till källtexten.
2. Fundera på vad du fortfarande saknar eller misstolkar i ditt andra svar i 
   förhållande till källtexten.
3. Ge två konkreta råd till dig själv om hur du kan göra det andra svaret helt korrekt.

Formulera feedbacken direkt till användaren (andra person) och gärna som punktlista.
`;

  // ── 4. Anropa GPT-4o-mini ─────────────────────────────────────────────
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    res.status(200).send(completion.choices[0].message.content.trim());
  } catch (err) {
    console.error('GPT-fel:', err);
    res.status(500).send('LLM-error');
  }
};
