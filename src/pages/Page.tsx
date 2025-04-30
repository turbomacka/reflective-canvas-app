import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supa } from '../lib/supa';
import { getFeedback } from '../lib/openai';
import FeedbackBox from '../components/FeedbackBox';

interface PageRow {
  slug: string;
  question: string;
  html: string;
  source: string;
}

export default function Page() {
  const { slug } = useParams();
  const [data, setData] = useState<PageRow | null>(null);

  const [first,  setFirst]  = useState('');
  const [second, setSecond] = useState('');
  const [showSecond, setShowSecond] = useState(false);

  const [feedback, setFeedback] = useState('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (!slug) return;
    supa.from('pages').select('*').eq('slug', slug).single()
        .then(({ data }) => setData(data));
  }, [slug]);

  // ── A. Skicka endast first om showSecond är false ────────────────────
  async function handleSubmit() {
    if (!data) return;
    setLoading(true);
    const fb = await getFeedback(
      data.slug,
      first,
      showSecond ? second : '',   // tomt => snabbbedömning
      data.source
    );
    setFeedback(fb);
    setLoading(false);

    // om snabbbedömningen säger "perfect": dölj knapp
    if (!showSecond) {
      try {
        const obj = JSON.parse(fb);
        if (obj.perfect) setShowSecond(false); // inget mer att göra
        else             setShowSecond(true);  // lås upp steg 2
      } catch {/* ignore json parse fail */}
    }
  }

  if (!data) return <p className="p-4">Laddar…</p>;

  return (
    <main className="p-6 space-y-6 max-w-3xl mx-auto bg-white shadow rounded">
      <h1 className="text-xl font-bold">{data.question}</h1>

      {/* Svar 1 */}
      <textarea className="w-full border p-2 rounded"
                placeholder="Skriv ditt första svar…" value={first}
                onChange={e => setFirst(e.target.value)} />

      <button onClick={handleSubmit} disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
        {loading ? 'Analyserar…' : 'Skicka & få snabb feedback'}
      </button>

      {/* Inläsningsmaterial visas alltid */}
      <article className="prose prose-sm max-w-none"
               dangerouslySetInnerHTML={{ __html: data.html }} />

      {showSecond && (
        <>
          <textarea className="w-full border p-2 rounded"
                    placeholder="Utveckla ditt svar…" value={second}
                    onChange={e => setSecond(e.target.value)} />

          <button onClick={handleSubmit} disabled={loading}
                  className="px-4 py-2 bg-green-700 text-white rounded disabled:opacity-50">
            {loading ? 'Analyserar…' : 'Skicka & få slutlig feedback'}
          </button>
        </>
      )}

      {feedback && <FeedbackBox text={
        feedback.startsWith('{') ? JSON.parse(feedback).fb : feedback
      } />}
    </main>
  );
}
