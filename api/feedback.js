// api/feedback.js
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

// Initiera Supabase‐klient
const supabase = createClient(
  process.env.VITE_SUPA_URL.replace(/^https:\/\//, 'https://'),
  process.env.VITE_SUPA_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  // Läs parametrar
  let { slug = '', first = '', second, source = '', delta_seconds } =
    typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  try {
    const safeSource = source.slice(0, 9000);

    // Tidsbullet för punkt 4
    let timeBullet = '';
    if (second && typeof delta_seconds === 'number') {
      timeBullet = `4. Du lade ${delta_seconds} sekunder på din revidering.`;
      if (delta_seconds < 60) {
        timeBullet += ` (Under 60 s – ta gärna några extra minuter för att reflektera över materialet och fördjupa ditt svar.)`;
      }
    }

    // System-prompt: styr språk och ton
    const systemPrompt = `
Du använder alltid samma språk som användaren skriver på.    
Du är en empatisk granskningsassisten som alltid svarar på samma språk som användaren skriver på. 
– Tala varmt och uppmuntrande, direkt till användaren med "du"/"din" och använd alltid samma språk som användaren. 
– Använd punkter och följ alltid denna struktur: 
  1) Bekräfta förbättringar om sådana skett, det är inte säkert och om inga förbättringar skett så påpeka gärna det 
  2) Identifiera kvarstående brister 
  3) Ge konkreta råd 
  4) Redovisa tidsåtgång.`;

    // Bygg prompt beroende på fas
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

Svara enligt systeminstruktionerna ovan.`;
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

Svara enligt systeminstruktionerna ovan.`;
    }

    // Anropa GPT med system + user
    const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt.trim() },
        { role: 'user', content: userPrompt.trim() }
      ],
      temperature: 0.7,
    });

    const feedback = completion.choices[0].message.content;

    // Spara endast final feedback i loggen
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
