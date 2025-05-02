// api/feedback.js
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

// Initiera Supabase-klienten
const supabase = createClient(
  process.env.VITE_SUPA_URL.replace(/^https:\/\//, 'https://'),
  process.env.VITE_SUPA_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  // Hämta parametrar
  let { slug = '', first = '', second, source = '', delta_seconds } =
    typeof req.body === 'string'
      ? JSON.parse(req.body)
      : req.body;

  try {
    const safeSource = source.slice(0, 9000);

    // Tidskommentar om revisionen var snabb
    let timeRemark = '';
    if (second && typeof delta_seconds === 'number' && delta_seconds < 60) {
      timeRemark = `\n\nObservera att du lade endast ${delta_seconds} sekunder på revideringen. Ta gärna lite mer tid att fundera över materialet för att fördjupa ditt svar.`;
    }

    // Gemensam uppmaning om ton
    const toneInstruction = `
Var varm och uppmuntrande i din återkoppling. Syftet är att studenten ska känna att deras lärande uppmärksammas och att de får konstruktiv vägledning.`;

    let prompt;

    if (!second) {
      // --- Initial feedback
      prompt = `
${toneInstruction}
Du är en pedagogisk granskningsassistent. Använd endast KÄLLTEXTEN nedan.

────────────────────────────────────
KÄLLTEXT:
"""${safeSource}"""
────────────────────────────────────

Studentens svar:
"""${first}"""

Din uppgift:
1. Bekräfta de delar av svaret som är korrekta och visa uppskattning för studentens insats.
2. Lista tydligt vilka aspekter som saknas eller kan förbättras enligt källtexten.
3. Ge konkreta, vänliga råd om vad studenten kan fokusera på innan nästa omformulering.

Svara på svenska, i punktlista, med en varm ton.`;
    } else {
      // --- Final feedback
      prompt = `
${toneInstruction}
Du är en empatisk granskningsassistent. Utgå ENDAST från KÄLLTEXTEN nedan.

────────────────────────────────────
KÄLLTEXT:
"""${safeSource}"""
────────────────────────────────────

Studentens första svar:
"""${first}"""

Studentens andra svar:
"""${second}"""

Tidsåtgång för revision: ${delta_seconds} sekunder.${timeRemark}

Din uppgift:
1. Punktvis: Vad har förbättrats i SVAR 2 jämfört med SVAR 1 – referera till källtexten och ge erkännande för studentens framsteg.
2. Punktvis: Vilka aspekter saknas eller kan ytterligare utvecklas i SVAR 2 enligt källtexten.
3. Två konkreta, vänliga råd för hur SVAR 2 kan bli ännu mer komplett.

Svara på svenska, i punktlista, med en varm och uppmuntrande ton.`;
    }

    // Anropa OpenAI
    const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const feedback = completion.choices[0].message.content;

    // Spara logg endast för final feedback
    if (second) {
      await supabase.from('conversation_logs').insert({
        slug,
        first,
        second,
        feedback,
        delta_seconds,
      });
    }

    res.status(200).json({ feedback });
  } catch (err) {
    console.error('Error in /api/feedback:', err);
    res.status(500).json({ error: err.message });
  }
};
