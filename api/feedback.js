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

  // Hämta body
  let { slug = '', first = '', second, source = '', delta_seconds } =
    typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  try {
    const safeSource = source.slice(0, 9000);

    // Tidsbullet för punkt 4
    let timeBullet = '';
    if (second && typeof delta_seconds === 'number') {
      timeBullet = `4. Du lade ${delta_seconds} sekunder på din revidering.`;
      if (delta_seconds < 60) {
        timeBullet += ` (Under 60 s – ta gärna några extra minuter för att reflektera djupare över materialet och fördjupa ditt svar.)`;
      }
    }

    // System‐prompt med helt explicit språkinstruktion
    const systemPrompt = `
Du är en empatisk granskningsassistent.
– Använd alltid exakt samma språk som användaren skrev i sitt första svar.
  Om användaren skriver på svenska, svara på svenska.
  Om användaren skriver på engelska, svara på engelska.
– Tala varmt och uppmuntrande direkt till användaren med "du"/"din".
– Använd punktlista och följ denna struktur:
   1) Bekräfta förbättringar
   2) Identifiera kvarstående brister
   3) Ge två konkreta, vänliga råd
   4) Redovisa tidsåtgång.
`.trim();

    // Bygg user‐prompt
    let userPrompt;
    if (!second) {
      userPrompt = `
Här är den källa du ska utgå ifrån (RAG-data):

────────────────────────────────────
${safeSource}
────────────────────────────────────

**Ditt första svar:**
${first}

**Din uppgift:**
1. Du har gjort bra när du…
2. Du kan utveckla…
3. Tips inför din nästa omformulering:…

Följ systeminstruktionerna ovan.`;
    } else {
      userPrompt = `
Här är den källa du ska utgå ifrån (RAG-data):

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

Följ systeminstruktionerna ovan.`;
    }

    // Anropa OpenAI
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

    // Spara logg för reviderat svar
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
