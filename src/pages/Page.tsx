// src/pages/Page.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supa } from '@/lib/supa';
import { getFeedback } from '@/lib/openai';

export default function Page() {
  const { slug } = useParams<{ slug: string }>();
  const [pageData, setPageData] = useState<{
    question: string;
    html: string;
    source: string;
  } | null>(null);

  // stages: 'initial' = första svar, 'review' = visa material och andra svar, 'feedback' = visa återkoppling
  const [stage, setStage] = useState<'initial' | 'review' | 'feedback'>('initial');

  const [firstAnswer, setFirstAnswer] = useState('');
  const [secondAnswer, setSecondAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [timerStart, setTimerStart] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Hämta fråge- och materialdata
  useEffect(() => {
    if (!slug) return;
    supa
      .from('pages')
      .select('question,html,source')
      .eq('slug', slug)
      .single()
      .then(({ data }) => {
        if (data) setPageData(data);
      });
  }, [slug]);

  if (!pageData) {
    return <p>Laddar sidan…</p>;
  }

  // Användaren skickar första svaret
  const handleInitialSubmit = () => {
    if (!firstAnswer.trim()) return;
    setStage('review');
    setTimerStart(Date.now());
  };

  // Användaren skickar andra svaret → anropa GPT och få feedback
  const handleReviewSubmit = async () => {
    if (!secondAnswer.trim()) return;
    setLoading(true);
    const delta_seconds = Math.round((Date.now() - timerStart) / 1000);

    try {
      // getFeedback returnerar { feedback: string }
      const resp = await getFeedback({
        slug: slug!,
        first: firstAnswer,
        second: secondAnswer,
        source: pageData.source,
        delta_seconds,
      });

      setFeedback(resp.feedback);
      setStage('feedback');
    } catch (err) {
      console.error('Feedback-fel:', err);
      setFeedback('Ett fel uppstod vid hämtning av feedback.');
      setStage('feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">{pageData.question}</h1>

      {stage === 'initial' && (
        <>
          <textarea
            className="w-full border p-2 rounded"
            rows={5}
            placeholder="Ditt första svar"
            value={firstAnswer}
            onChange={(e) => setFirstAnswer(e.target.value)}
          />
          <button
            onClick={handleInitialSubmit}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Skicka första svar
          </button>
        </>
      )}

      {stage === 'review' && (
        <>
          <div
            className="prose border p-4 rounded bg-gray-50"
            dangerouslySetInnerHTML={{ __html: pageData.html }}
          />
          <textarea
            className="w-full border p-2 rounded"
            rows={5}
            placeholder="Ditt reviderade svar"
            value={secondAnswer}
            onChange={(e) => setSecondAnswer(e.target.value)}
          />
          <button
            onClick={handleReviewSubmit}
            disabled={loading}
            className={`mt-2 px-4 py-2 rounded text-white ${
              loading ? 'bg-gray-400' : 'bg-green-600'
            }`}
          >
            {loading ? 'Hämtar feedback…' : 'Skicka reviderat svar'}
          </button>
        </>
      )}

      {stage === 'feedback' && (
        <div className="mt-4 p-4 bg-gray-100 rounded whitespace-pre-line">
          {feedback}
        </div>
      )}
    </main>
  );
}
