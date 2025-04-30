const OpenAI = require('openai');

/** @type {(req, res) => Promise<void>} */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  let { slug = '', first = '', second = '', source = '' } =
    typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  const safeSource = source.slice(0, 9000);

  // ── A. Om second är tomt: bara snabb­bedöm Svar 1 ─────────────────────
  const prompt =
    second.trim() === ''
      ? `
Du är en gransknings-assistent. Bedöm om STUDENTSVAR är
*helt korrekt* (alla relevanta aspekter från källtexten finns med)
eller *ofullständigt/fel*.

KÄLLTEXT:
"""${safeSource}"""

STUDENTSVAR:
"""${first}"""

Svara exakt en rad JSON:
{ "perfect": true/false, "fb": "kort feedback på svenska" }
`
      : `
Du är en gransknings-assistent. Du får endast använda källtexten nedan.

KÄLLTEXT:
"""${safeSource}"""

SVAR 1:
"""${first}"""

SVAR 2:
"""${second}"""

1. Punktvis: förbättringar i SVAR 2 jämfört med SVAR 1 (hänvisa till källtext).
2. Punktvis: kvarvarande fel/utelämnanden i SVAR 2.
3. Två konkreta råd för att göra SVAR 2 helt korrekt.

Svara på svenska och använd punktlistor.
`;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const out = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-0125',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });
    res.status(200).send(out.choices[0].message.content.trim());
  } catch (e) {
    console.error(e);
    res.status(500).send('LLM-error');
  }
};
