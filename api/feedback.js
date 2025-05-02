// api/feedback.js
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPA_URL.replace(/^https:\/\//, 'https://'),
  process.env.VITE_SUPA_KEY
);

// Heuristik för svenska vs engelska
function detectLanguage(firstText) {
  return /[åäöÅÄÖ]/.test(firstText) ? 'svenska' : 'engelska';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  // 1) Läs in
  let { slug = '', first = '', second, source = '', delta_seconds } =
    typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  try {
    const safeSource = source.slice(0, 9000);
    const lang = detectLanguage(first);         // 'svenska' eller 'engelska'

    // 2) Tidsbullet alltid
    let timeBullet = '';
    if (second && typeof delta_seconds === 'number') {
      timeBullet = `4. Du lade ${delta_seconds} sekunder på din revidering.`;
      if (delta_seconds < 60) {
        timeBullet += ` (Under 60 s – ta gärna några extra minuter för att läsa materialet noggrant och fördjupa ditt svar.)`;
      }
    }

    // 3) System-prompt med språkinstruktion
    const systemPrompt = `
Du är en empatisk granskningsassistent. 
– Tala varmt och uppmuntrande direkt till användaren med "du"/"din". 
– Svara på ${lang} (användarens eget språk). 
– Använd punktlista och följ alltid strukturen:
  1) Bekräfta förbättringar
  2) Identifiera kvarstående brister
  3) Ge konkreta råd
  4) Redovisa tidsåtgång.
    `.trim();

    // 4) User-prompt för första vs andra svar
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

Svara enligt systeminstruktionerna ovan.
      `.trim();
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

Svara enligt systeminstruktionerna ovan.
      `.trim();
    }

    // 5) Anropa OpenAI
    const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY });
    const { choices } = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt }
      ],
      temperature: 0.7,
    });
    const feedback = choices[0].message.content;

    // 6) Spara logg för det reviderade svaret
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
