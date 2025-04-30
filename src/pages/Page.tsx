import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supa } from '../lib/supa';
import FeedbackBox from '../components/FeedbackBox';
import { getFeedback } from '../lib/openai';

/* motsvarar en rad i tabellen pages */
interface PageRow {
  slug: string;
  question: string;
  html: string;
  source: string;
}

export default function Page() {
  const { slug } = useParams();
  const [data, setData] = useState<PageRow | null>(null);
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  /* hämta raden från Supabase */
  useEffect(() => {
    if (!slug) return;
    supa.from('pages').select('*').eq('slug', slug).single()
        .then(({ data }) => setData(data));
  }, [slug]);

  /* skicka båda svaren + källtext till GPT */
  async function handleSubmit() {
    if (!data || !slug) return;
    setLoading(true);
    const fb = await getFeedback(slug, first, second, data.source);
    setFeedback(fb);
    setLoading(false);
  }

  if (!data) return <p className="p-4">Laddar…</p>;

  return (
    <main className="p-6 space-y-6 max-w-3xl mx-auto bg-white shadow rounded">
      <h1 className="text-xl font-bold">{data.question}</h1>

      <textarea className="w-full border p-2 rounded"
                placeholder="Första svar…" value={first}
                onChange={e => setFirst(e.target.value)} />

      <article className="prose prose-sm max-w-none"
               dangerouslySetInnerHTML={{ __html: data.html }} />

      <textarea className="w-full border p-2 rounded"
                placeholder="Andra svar…" value={second}
                onChange={e => setSecond(e.target.value)} />

      <button onClick={handleSubmit} disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
        {loading ? 'Analyserar…' : 'Skicka & få feedback'}
      </button>

      {feedback && <FeedbackBox text={feedback} />}
    </main>
  );
}
