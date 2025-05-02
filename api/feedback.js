// api/feedback.js
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

// Initiera Supabase-klient
const supabase = createClient(
  process.env.VITE_SUPA_URL.replace(/^https:\/\//, 'https://'),
  process.env.VITE_SUPA_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  // Läs in parametrar från request body
  let { slug = '', first = '', second, source = '', delta_seconds } =
    typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  try {
    const safeSource = source.slice(0, 9000);

    // Om du reviderade snabbt, lägg till en vänlig påminnelse
    let timeRemark = '';
    if (second && typeof delta_seconds === 'number' && delta_seconds < 60) {
      timeRemark = `\n\nObservera att du bara använde ${delta_seconds} sekunder på att revidera. Ta gärna några extra minuter för att reflektera djupare över materialet.`;
    }

    // Instruktion om uppmuntrande ton
    const toneInstruction = `
Var varm och uppmuntrande. Tala direkt till mottagaren ("du"/"din") och låt dem känna att deras lärande uppmärksammas.`;

    let prompt;

    if (!second) {
      // --- Första återkopplingen ---
      prompt = `
${toneInstruction}
Du är en empatisk granskningsassistent. Utgå ENDAST från följande KÄLLTEXT.

────────────────────────────────────
KÄLLTEXT:
"""${safeSource}"""
────────────────────────────────────

Ditt svar:
"""${first}"""

Din uppgift:
1. Bekräfta vad du gjorde bra och visa uppskattning för din insats.
2. Identifiera vilka viktiga aspekter som saknas eller kan förbättras enligt källtexten.
3. Ge konkreta, vänliga tips för hur du kan stärkta ditt svar innan du gör om det.

Svara på svenska, i punktform, med en varm och personlig ton.`;
    } else {
      // --- Andra återkopplingen ---
      prompt = `
${toneInstruction}
Du är en empatisk granskningsassistent. Utgå ENDAST från följande KÄLLTEXT.

────────────────────────────────────
KÄLLTEXT:
"""${safeSource}"""
────────────────────────────────────

Ditt första svar:
"""${first}"""

Ditt reviderade svar:
"""${second}"""

Tidsåtgång för revision: ${delta_seconds} sekunder.${timeRemark}

Din uppgift:
1. Punktvis: Beskriv vilka förbättringar du gjort i ditt andra svar jämfört med det första – hänvisa tydligt till källtexten och erkänn dina framsteg.
2. Punktvis: Visa vilka delar som fortfarande saknas eller kan utvecklas vidare enligt källtexten.
3. Två konkreta, vänliga råd för hur du kan göra ditt svar ännu mer komplett.

Svara på svenska, i punktform, med en varm och uppmuntrande ton.`;
    }

    // Anropa OpenAI
    const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const feedback = completion.choices[0].message.content;

    // Spara logg endast för det andra svaret
    if (second) {
      await supabase.from('conversation_logs').insert({
        slug,
        first,
        second,
        feedback,
        delta_seconds,
      });
    }

    // Returnera återkopplingen
    return res.status(200).json({ feedback });
  } catch (err) {
    console.error('Error in /api/feedback:', err);
    return res.status(500).json({ error: err.message });
  }
};
