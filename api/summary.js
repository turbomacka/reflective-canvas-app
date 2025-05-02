const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

/**
 * API Route: /api/summary?slug=<slug>
 * Returns aggregated insights per slug:
 * - "Punkter att arbeta vidare med": vanligaste missar med exempel & andel
 * - "Typexempel på progression": typiska exempel som visar progression
 */
module.exports = async function handler(req, res) {
  // 1. Accept only GET
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // 2. Extract slug
  const { slug } = req.query;
  if (!slug) {
    res.status(400).send('Missing slug parameter');
    return;
  }

  // 3. Fetch all logs for this slug
  let logs = [];
  try {
    const supa = createClient(
      process.env.VITE_SUPA_URL,
      process.env.VITE_SUPA_KEY
    );
    const { data, error } = await supa
      .from('conversation_logs')
      .select('first, second, feedback, created_at')
      .eq('slug', slug);
    if (error) throw error;
    logs = data;
  } catch (err) {
    console.error('Supabase fetch error:', err);
    res.status(500).send('DB-error');
    return;
  }

  if (!logs.length) {
    return res.status(200).json({
      summary: 'Inga interaktioner hittades för angiven slug.'
    });
  }

  // 4. Build prompt for summarization
  const feedbackCollection = logs.map(l => l.feedback).join('\n---\n');
  const prompt = `Här är användar-återkoppling för sidan "${slug}":
${feedbackCollection}

Din uppgift:

Under rubriken "Punkter att arbeta vidare med":
- Lista de tre vanligaste missarna som fortfarande kvarstår efter andra svaret.
- Ge gärna ett konkret exempel ur loggarna (exakta fraser) och ange andel (%) av loggar som visar detta misstag.

Under rubriken "Typexempel på progression":
- Visa två typfall av hur ett andra svar förbättrade ett första svar.
- Ange både första och andra svar i kort form som exempel.

Svara på svenska, använd punktlistor, och dela upp med rubriker som ovan utan extra markdown.`;

  // 5. Call OpenAI
  let summary = '';
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });
    summary = resp.choices[0].message.content.trim();
  } catch (err) {
    console.error('OpenAI error:', err);
    res.status(500).send('LLM-error');
    return;
  }

  // 6. Return summary
  res.status(200).json({ summary });
};

