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

  // 1) Läs in parametrar
  let { slug = '', first = '', second, source = '', delta_seconds } =
    typeof req.body === 'string'
      ? JSON.parse(req.body)
      : req.body;

  // 2) Begränsa källtextens längd
  const safeSource = source.slice(0, 9000);

  // 3) Bygg tidsbullet (#4)
  let timeBullet = '';
  if (second != null && typeof delta_seconds === 'number') {
    timeBullet = `4. Du lade ${delta_seconds} sekunder på din omformulering.`;
    if (delta_seconds < 60) {
      timeBullet += ` (Under 60 s – överväg att ta några extra minuter för att fördjupa ditt svar.)`;
    }
  }

  // 4) System-prompt som tvingar språk­spegling och struktur
  const systemPrompt = `
Du är en empatisk granskningsassistent.  
– Läs av språket i användarens första svar exakt och svar på **samma språk**.  
– Använd direkt tilltal (“du”/”din”).  
– Ge feedback i punktform med exakt denna ordning:
  1) Bekräfta förbättringar – om inga tydliga förbättringar finns, säg det.
  2) Identifiera kvarstående brister.
  3) Ge två konkreta, vänliga råd för att göra svaret ännu bättre.
  4) Redovisa tidsåtgång (punkt 4).`;

  // 5) Bygg user-prompt beroende på om det är initial eller final feedback
  let userPrompt;
  if (!second) {
    userPrompt = `
Här är den text du ska utgå från:

────────────────────────────────────
${safeSource}
────────────────────────────────────

**Användarens första svar:**
${first}

Din uppgift:  
1) Bekräfta vad som är bra i svaret.  
2) Peka ut vad som saknas eller kan förbättras enligt texten.  
3) Ge konkreta, vänliga tips inför nästa version.  

Följ systeminstruktionerna.`;
  } else {
    userPrompt = `
Här är den text du ska utgå från:

────────────────────────────────────
${safeSource}
────────────────────────────────────

**Första svaret:**
${first}

**Reviderat svar:**
${second}

**Din uppgift:**
1) Beskriv vilka förbättringar som faktiskt skett jämfört med första svaret.  
2) Peka ut vilka delar som fortfarande behöver utvecklas enligt texten.  
3) Ge två konkreta, vänliga råd för att göra det reviderade svaret ännu bättre.  
${timeBullet}

Följ systeminstruktionerna.`;
  }

  try {
    // 6) Anropa OpenAI
    const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt.trim() },
        { role: 'user',   content: userPrompt.trim() }
      ],
      temperature: 0.7,
    });

    const feedback = completion.choices[0].message.content;

    // 7) Spara logg om det är det reviderade svaret
    if (second != null) {
      await supabase.from('conversation_logs').insert({
        slug,
        first,
        second,
        feedback,
        delta_seconds,
      });
    }

    // 8) Returnera feedback
    return res.status(200).json({ feedback });
  } catch (err) {
    console.error('Error in /api/feedback:', err);
    return res.status(500).json({ error: err.message });
  }
};
