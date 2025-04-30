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
  const prompt = `
Du är en hjälpsam handledare. Jämför följande två svar och ge konkret feedback på förändringar i förståelse.

Första svar:
"""${first}"""

Andra svar:
"""${second}"""
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
