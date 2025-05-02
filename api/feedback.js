const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

/**
 * API Route: /api/feedback
 * Handles POST requests with JSON: { slug, first, second, source }
 * Calls OpenAI for feedback and logs interaction in Supabase.
 */
module.exports = async function handler(req, res) {
  // 1. Only allow POST
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // 2. Parse request body
  let slug = '', first = '', second = '', source = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    slug   = body.slug   ?? '';
    first  = body.first  ?? '';
    second = body.second ?? '';
    source = body.source ?? '';
  } catch (err) {
    console.error('Failed to parse JSON:', err);
    res.status(400).send('Invalid JSON payload');
    return;
  }

  // 3. Prepare prompt (truncate source if very long)
  const safeSource = source.length > 9000 ? source.slice(0, 9000) : source;

  const prompt = second.trim() === ''
    ? /* quick assessment prompt */
      `Du är en personlig granskningsassistent. Bedöm om ditt svar är helt korrekt mot källtexten nedan eller ofullständigt/fel.

KÄLLTEXT:
"""${safeSource}"""

Ditt svar:
"""${first}"""

Returnera endast JSON utan kodblock eller markdown, t.ex. {"perfect": true, "fb": "Kort feedback utan markdown"}`
    : /* full feedback prompt */
      `Du är en personlig granskningsassistent. Använd endast källtexten nedan som facit.

KÄLLTEXT:
"""${safeSource}"""

När du beskrev ditt första svar:
"""${first}"""

När du utvecklade till ditt andra svar:
"""${second}"""

1. Punktvis: förbättringar i ditt andra svar jämfört med det första – hänvisa till källtexten.
2. Punktvis: saknade aspekter eller feltolkningar i ditt andra svar enligt källtexten.
3. Ge två konkreta råd för hur du kan göra det andra svaret helt korrekt.

Svara på svenska, använd punktlistor utan markdown eller kodblock.`;

  // 4. Call OpenAI
  let feedback = '';
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });
    feedback = resp.choices[0].message.content.trim();
  } catch (err) {
    console.error('OpenAI error:', err);
    res.status(500).send('LLM-error');
    return;
  }

  // 5. Log interaction to Supabase
  try {
    const supabase = createClient(
      process.env.VITE_SUPA_URL,
      process.env.VITE_SUPA_KEY
    );
    await supabase.from('conversation_logs').insert({
      slug,
      first,
      second,
      feedback
    });
  } catch (err) {
    console.error('Supabase log error:', err);
    // continue without blocking response
  }

  // 6. Send feedback
  res.status(200).send(feedback);
};
