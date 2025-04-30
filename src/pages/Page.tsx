import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import FeedbackBox from '../components/FeedbackBox';
import { getFeedback } from '../lib/openai';

interface PageContent {
  slug: string;
  question: string;
  htmlContent: string;
}

export default function Page() {
  const { slug } = useParams();
  const [content, setContent] = useState<PageContent | null>(null);
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/content/${slug}.json`)
      .then((res) => res.json())
      .then(setContent);
  }, [slug]);

  async function handleSubmit() {
    setLoading(true);
    const fb = await getFeedback(first, second);
    setFeedback(fb);
    setLoading(false);
  }

  if (!content) return <p className="p-4">Laddar...</p>;

  return (
    <main className="p-6 space-y-6 max-w-3xl mx-auto bg-white shadow rounded">
      <h1 className="text-xl font-bold">{content.question}</h1>

      <textarea
        className="w-full border p-2 rounded"
        placeholder="Skriv ditt första svar..."
        value={first}
        onChange={(e) => setFirst(e.target.value)}
      />

      <article
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: content.htmlContent }}
      />

      <textarea
        className="w-full border p-2 rounded"
        placeholder="Skriv ditt andra svar..."
        value={second}
        onChange={(e) => setSecond(e.target.value)}
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Analyserar...' : 'Skicka & få feedback'}
      </button>

      {feedback && <FeedbackBox text={feedback} />}
    </main>
  );
}
