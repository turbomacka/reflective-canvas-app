// ── 4a. Spara loggen i Supabase ────────────────────────────────────
try {
  // dynamisk import av Supabase-klienten för serverless
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.VITE_SUPA_URL,
    process.env.VITE_SUPA_KEY
  );
  await supabase
    .from('conversation_logs')
    .insert({
      slug,
      first,
      second,
      feedback: completion.choices[0].message.content.trim()
    });
} catch (e) {
  console.error('Logg-fel:', e);
  // fortsätt ändå
}
