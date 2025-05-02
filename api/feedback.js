// api/feedback.js
const OpenAI = require('openai');
const franc  = require('franc');
const langs  = require('langs');
const { createClient } = require('@supabase/supabase-js');

// Initiera Supabase-klient
const supabase = createClient(
  process.env.VITE_SUPA_URL.replace(/^https:\/\//, 'https://'),
  process.env.VITE_SUPA_KEY
);

// Heuristik: franc ger 3-bokstavskod, vi vill ha 2-bokstavskod
function detectLangCode(text) {
  const code3 = franc(text, { minLength: 3 });
  const info  = langs.where('3', code3);
  return info && info['1'] ? info['1'] : 'en';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  // Läs in parametrar
  let { slug = '', first = '', second, source = '', delta_seconds } =
    typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  try {
    // 1) Säker text
    const safeSource = source.slice(0, 9000);

    // 2) Detektera språk baserat på first
    const langCode = detectLangCode(first); // t.ex. 'sv' eller 'en'

    // 3) Bygg tids-bullet
    let timeBullet = '';
    if (second && typeof delta_seconds === 'number') {
      timeBullet = `4. Du lade ${delta_seconds} sekunder på din revidering.`;
      if (delta_seconds < 60) {
        timeBullet += ` (Under 60 s – ta gärna några extra minuter för att reflektera och fördjupa ditt svar.)`;
      }
    }

    // 4) System-prompt med explicit språkval
    const systemPrompt = `
Du är en empatisk granskningsassistent. 
– Tala varmt och uppmuntrande direkt till användaren med "du"/"din". 
– Svara på språket som användaren använde i sitt första svar (ISO-kod: ${langCode}). 
– Använd punktlista och följ alltid denna struktur:
  1) Bekräfta förbättringar
  2) Identifiera kvarstående brister
  3) Ge konkreta råd
  4) Redovisa tidsåtgång.
`.trim();

    // 5) User-prompt beroende på fas
    let userPrompt;
    if (!second) {
      // Första återkopplingen
      userPrompt = `
Utgå ENDAST från följande källtext:

────────────────────────────────────
${safeSource}
────────────────────────────────────

**Ditt svar (#1):**
${first}

**Din uppgift:**
1. Du har gjort bra när du…  
2. Du kan utveckla…  
3. Tips inför din nästa omformulering:…

Svara enligt instruktionerna ovan.`;
    } else {
      // Andra återkopplingen
      userPrompt = `
Utgå ENDAST från följande källtext:

────────────────────────────────────
${safeSource}
────────────────────────────────────

**Ditt första svar:**
${first}

**Ditt reviderade svar:**
${second}

**Din uppgift:**
1. Du har förbättrat…  
2. Du kan fortfarande utveckla…  
3. Två konkreta, vänliga råd:…  
${timeBullet}

Svara enligt instruktionerna ovan.`;
    }

    // 6) Anropa OpenAI
    const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt }
      ],
      temperature: 0.7,
    });
    const feedback = completion.choices[0].message.content;

    // 7) Spara logg vid reviderat svar
    if (second) {
      await supabase.from('conversation_logs').insert({
        slug,
        first,
        second,
        feedback,
        delta_seconds,
      });
    }

    // 8) Returnera återkopplingen
    return res.status(200).json({ feedback });

  } catch (err) {
    console.error('Error in /api/feedback:', err);
    return res.status(500).json({ error: err.message });
  }
};
