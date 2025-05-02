import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supa } from '@/lib/supa';
import { getFeedback } from '@/lib/openai';

export default function Page() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<{ question: string; html: string; source: string } | null>(null);
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [showSecond, setShowSecond] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [firstTimestamp, setFirstTimestamp] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    supa
      .from('pages')
      .select('question,html,source')
      .eq('slug', slug)
      .single()
      .then(({ data }) => {
        if (data) setData(data);
      });
  }, [slug]);

  async function handleSubmit() {
    if (!showSecond) {
      setShowSecond(true);
      setFirstTimestamp(Date.now());
      return;
    }

    // Räkna seconds mellan första och andra
    const delta_seconds = firstTimestamp
      ? Math.round((Date.now() - firstTimestamp) / 1000)
      : null;

    const resp = await getFeedback({
      slug: slug!,
      first,
      second,
      source: data!.source,
      delta_seconds,
    });
    setFeedback(resp);
  }

  if (!data) return <p>Laddar sida…</p>;

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">{data.question}</h1>

      {!showSecond ? (
        <>
          <textarea
            className="w-full border p-2"
            rows={6}
            placeholder="Ditt första svar"
            value={first}
            onChange={e => setFirst(e.target.value)}
          />
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Skicka första svar
          </button>
        </>
      ) : (
        <>
          <div
            className="prose max-w-none border p-4 rounded"
            dangerouslySetInnerHTML={{ __html: data.html }}
          />
          <textarea
            className="w-full border p-2"
            rows={6}
            placeholder="Ditt reviderade svar"
            value={second}
            onChange={e => setSecond(e.target.value)}
          />
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Skicka reviderat svar
          </button>
        </>
      )}

      {feedback && (
        <div className="mt-6 p-4 bg-gray-100 rounded whitespace-pre-line">
          {feedback}
        </div>
      )}
    </main>
  );
}
