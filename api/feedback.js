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

  // Läs in parametrar från body
  let { slug = '', first = '', second, source = '', delta_seconds } =
    typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  try {
    const safeSource = source.slice(0, 9000);

    // Bygg tidstext alltid med!
    let timeInfo = '';
    if (second && typeof delta_seconds === 'number') {
      timeInfo = `**Tidsåtgång för din revidering:** ${delta_seconds} sekunder.`;
      if (delta_seconds < 60) {
        timeInfo += ` Observera att du bara ägnade ${delta_seconds} sekunder åt revisionen – ta gärna några extra minuter för att reflektera över materialet och fördjupa ditt svar.`;
      }
    }

    // Toninstruktion
    const toneInstruction = `
Var varm och uppmuntrande. Tala direkt till användaren ("du"/"din") och visa att deras lärande uppmärksammas.`;

    let prompt;

    if (!second) {
      // Första återkopplingen
      prompt = `
${toneInstruction}
Utgå ENDAST från följande källtext och ge feedback på första svaret.

────────────────────────────────────
KÄLLTEXT:
"""${safeSource}"""
────────────────────────────────────

**Ditt svar:**
${first}

**Din uppgift:**
1. Bekräfta vad du gjorde bra och visa uppskattning.
2. Identifiera vad som saknas eller kan förbättras enligt källtexten.
3. Ge konkreta, vänliga tips inför din revision.

Svara på svenska, i punktform, med en varm och personlig ton.`;
    } else {
      // Andra återkopplingen
      prompt = `
${toneInstruction}
Utgå ENDAST från följande källtext och ge feedback på ditt reviderade svar.

────────────────────────────────────
KÄLLTEXT:
"""${safeSource}"""
────────────────────────────────────

**Ditt första svar:**
${first}

**Ditt reviderade svar:**
${second}

${timeInfo}

**Din uppgift:**
1. Beskriv vilka förbättringar du gjort i ditt andra svar jämfört med det första – hänvisa till källtexten och erkänn dina framsteg.
2. Visa vilka delar som fortfarande kan utvecklas vidare enligt källtexten.
3. Ge två konkreta, vänliga råd för hur du kan göra ditt svar ännu mer komplett.

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

    // Spara logg om det är det andra svaret
    if (second) {
      await supabase.from('conversation_logs').insert({
        slug,
        first,
        second,
        feedback,
        delta_seconds,
      });
    }

    return res.status(200).json({ feedback });
  } catch (err) {
    console.error('Error in /api/feedback:', err);
    return res.status(500).json({ error: err.message });
  }
};
