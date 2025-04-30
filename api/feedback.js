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
      ? /* — snabbbedömning (bara svar 1) — */
        `
Du är en gransknings-assistent. Bedöm om STUDENTSVAR är
*helt korrekt* (alla relevanta aspekter i källtexten finns med)
eller *ofullständigt/fel*.

KÄLLTEXT:
"""${safeSource}"""

STUDENTSVAR:
"""${first}"""

Svara exakt en rad JSON:
{ "perfect": true/false, "fb": "kort feedback" }
`
      : /* — slutlig jämförelse (svar 1 vs svar 2) — */
        `
Du får endast använda källtexten nedan som facit.

KÄLLTEXT:
"""${safeSource}"""

SVAR 1:
"""${first}"""

SVAR 2:
"""${second}"""

1. Punktvis: förbättringar i SVAR 2 jämfört med SVAR 1 – hänvisa till källtext.
2. Punktvis: kvarvarande fel eller utelämnanden i SVAR 2 enligt källtexten.
3. Ett eller två råd för hur SVAR 2 kan bli helt korrekt om det inte redan är det.

Svara på samma språk som SVAR 1 ges på, gärna som punktlista.
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
