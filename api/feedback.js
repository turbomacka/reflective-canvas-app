// api/feedback.js
const OpenAI = require('openai');
let franc, langs;
try {
  franc = require('franc');
  langs = require('langs');
} catch (e) {
  // Om packages inte finns, så ignorerar vi och fallbackar till engelska
  franc = null;
  langs = null;
}
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPA_URL.replace(/^https:\/\//, 'https://'),
  process.env.VITE_SUPA_KEY
);

// Robust språkdetektion med fallbacks
function detectLangCode(text) {
  if (franc && langs) {
    try {
      const code3 = franc(text, { minLength: 3 });
      const info = langs.where('3', code3);
      if (info && info['1']) return info['1'];
    } catch (err) {
      console.warn('Språkdetektion misslyckades, fallbackar till "en":', err);
    }
  }
  // Enkelt fallback baserat på åäö
  return /[åäöÅÄÖ]/.test(text) ? 'sv' : 'en';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  // Logga inkommande body för felsökning
  console.log('📥 /api/feedback body:', req.body);

  // Hämta parametrar
  let { slug = '', first = '', second, source = '', delta_seconds } =
    typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  try {
    const safeSource = source.slice(0, 9000);

    // Detektera språk
    const langCode = detectLangCode(first);
    console.log('🈶 Detekterat språk:', langCode);

    // Skapa tidsbullet
    let timeBullet = '';
    if (second && typeof delta_seconds === 'number') {
      timeBullet = `4. Du lade ${delta_seconds} sekunder på din revidering.`;
      if (delta_seconds < 60) {
        timeBullet += ` (Under 60 s – ta gärna några extra minuter för att reflektera och fördjupa ditt svar.)`;
      }
    }

    // Systemprompt som styr språk och ton
    const systemPrompt = `
Du är en empatisk granskningsassistent.
– Tala varmt och uppmuntrande till användaren med "du"/"din".
– Svara på språket med ISO-kod "${langCode}".
– Använd punktlista och följ denna struktur:
  1) Bekräfta förbättringar
  2) Identifiera kvarstående brister
  3) Ge konkreta råd
  4) Redovisa tidsåtgång.
`.trim();

    // User-prompt
    let userPrompt;
    if (!second) {
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

    // Anropa OpenAI
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

    // Spara logg om det är reviderat svar
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
    console.error('❌ Fel i /api/feedback:', err);
    return res.status(500).json({ error: err.message });
  }
};
