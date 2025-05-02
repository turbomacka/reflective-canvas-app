// api/feedback.js
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPA_URL.replace(/^https:\/\//, 'https://'),
  process.env.VITE_SUPA_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  // Läs in parametrar
  let { slug = '', first = '', second, source = '', delta_seconds } =
    typeof req.body === 'string'
      ? JSON.parse(req.body)
      : req.body;

  try {
    const safeSource = source.slice(0, 9000);

    // Förbered tidsuppgift för bullet 4
    let timeInstruction = `4. **Tidsåtgång:** Du lade ${delta_seconds ?? 'okänt'} sekunder på revideringen.`;
    if (second && typeof delta_seconds === 'number' && delta_seconds < 60) {
      timeInstruction += ` (Obs! Det är under 60 s – ta gärna några extra minuter för att reflektera och fördjupa ditt svar.)`;
    }

    // Toninstruktion
    const tone = `
Var varm och uppmuntrande. Tala direkt till användaren ("du"/"din") och visa att deras lärande uppmärksammas.`;

    let prompt;

    if (!second) {
      //--- Första återkopplingen ---
      prompt = `
${tone}
Utgå ENDAST från följande källtext:

────────────────────────────────────
${safeSource}
────────────────────────────────────

**Ditt svar (#1):**
${first}

**Din uppgift:**
1. Bekräfta vad du gjorde bra och visa uppskattning för din insats.
2. Identifiera vilka aspekter som saknas eller kan förbättras enligt källtexten.
3. Ge konkreta, vänliga tips inför din nästa omformulering.

Svara på svenska, i punktform, med en varm och personlig ton.`;
    } else {
      //--- Andra återkopplingen ---
      prompt = `
${tone}
Utgå ENDAST från följande källtext:

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
${timeInstruction}

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

    // Spara logg vid andra svar
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
