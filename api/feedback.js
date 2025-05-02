// api/feedback.js
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

// Initiera Supabase
const supabase = createClient(
  process.env.VITE_SUPA_URL.replace(/^https:\/\//, 'https://'),
  process.env.VITE_SUPA_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  // Läs body
  let { slug = '', first = '', second, source = '', delta_seconds } =
    typeof req.body === 'string'
      ? JSON.parse(req.body)
      : req.body;

  try {
    const safeSource = source.slice(0, 9000);

    // Bygg alltid tids-Info-punkt
    let timePoint = '';
    if (second && typeof delta_seconds === 'number') {
      // Punkt: redovisa tid
      timePoint = `4. **Tidsåtgång för din revidering:** ${delta_seconds} sekunder.`;
      // Lägg på påminnelse om <60s
      if (delta_seconds < 60) {
        timePoint += ` (Obs! Du använde mindre än 60 s – ta gärna några extra minuter för att reflektera över materialet och fördjupa ditt svar.)`;
      }
    }

    // Ton och struktur
    const toneInstruction = `
Var varm och uppmuntrande. Tala direkt till mottagaren (“du”/“din”) och visa att deras lärande uppmärksammas.`;

    let prompt;

    if (!second) {
      // --- Första återkopplingen ---
      prompt = `
${toneInstruction}
Utgå endast från följande källtext:

────────────────────────────────────
${safeSource}
────────────────────────────────────

**Ditt svar (#1):**
${first}

**Din uppgift:**
1. Bekräfta vad du gjorde bra och visa uppskattning.
2. Identifiera vad som saknas eller kan förbättras enligt källtexten.
3. Ge konkreta, vänliga tips inför din revidering.

Svara på svenska, med punktlista och en varm ton.`;
    } else {
      // --- Andra återkopplingen med tydlig tidspunkt ---
      prompt = `
${toneInstruction}
Utgå endast från följande källtext:

────────────────────────────────────
${safeSource}
────────────────────────────────────

**Ditt första svar:**
${first}

**Ditt reviderade svar:**
${second}

**Din uppgift:**
1. Beskriv vilka förbättringar du gjort i ditt andra svar jämfört med det första – hänvisa till källtexten och ge erkännande för dina framsteg.
2. Visa vilka delar som fortfarande kan utvecklas vidare enligt källtexten.
3. Ge två konkreta, vänliga råd för hur du kan göra ditt svar ännu mer komplett.
${timePoint}

Svara på svenska, med punktlista och en varm, uppmuntrande ton.`;
    }

    // Anropa OpenAI
    const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const feedback = completion.choices[0].message.content;

    // Spara logg för andra svar
    if (second) {
      await supabase.from('conversation_logs').insert({
        slug,
        first,
        second,
        feedback,
        delta_seconds
      });
    }

    return res.status(200).json({ feedback });
  } catch (err) {
    console.error('Error in /api/feedback:', err);
    return res.status(500).json({ error: err.message });
  }
};
