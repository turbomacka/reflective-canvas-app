import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supa } from '@/lib/supa';
import { getFeedback } from '@/lib/openai';

type Stage = 'initial' | 'initialFeedback' | 'review' | 'finalFeedback';

export default function Page() {
  const { slug } = useParams<{ slug: string }>();
  const [pageData, setPageData] = useState<{
    question: string;
    html: string;
    source: string;
  } | null>(null);

  const [stage, setStage] = useState<Stage>('initial');
  const [firstAnswer, setFirstAnswer] = useState('');
  const [secondAnswer, setSecondAnswer] = useState('');
  const [initialFeedback, setInitialFeedback] = useState<string>('');
  const [finalFeedback, setFinalFeedback] = useState<string>('');
  const [timerStart, setTimerStart] = useState<number>(0);
  const [loading, setLoading] = useState(false);

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

  if (!pageData) return <p>Laddar sidan…</p>;

  const submitFirst = async () => {
    if (!firstAnswer.trim()) return;
    setLoading(true);
    try {
      const { feedback } = await getFeedback({
        slug: slug!,
        first: firstAnswer,
        source: pageData.source,
      });
      setInitialFeedback(feedback);
      setStage('initialFeedback');
      setTimerStart(Date.now());
    } finally {
      setLoading(false);
    }
  };

  const submitSecond = async () => {
    if (!secondAnswer.trim()) return;
    setLoading(true);
    const delta_seconds = Math.round((Date.now() - timerStart) / 1000);
    try {
      const { feedback } = await getFeedback({
        slug: slug!,
        first: firstAnswer,
        second: secondAnswer,
        source: pageData.source,
        delta_seconds,
      });
      setFinalFeedback(feedback);
      setStage('finalFeedback');
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
            onChange={e => setFirstAnswer(e.target.value)}
          />
          <button
            onClick={submitFirst}
            disabled={loading}
            className={`mt-2 px-4 py-2 rounded text-white ${
              loading ? 'bg-gray-400' : 'bg-blue-600'
            }`}
          >
            {loading ? 'Analyserar…' : 'Skicka första svar'}
          </button>
        </>
      )}

      {stage === 'initialFeedback' && (
        <>
          <div className="p-4 bg-gray-100 rounded whitespace-pre-line">
            {initialFeedback}
          </div>
          <button
            onClick={() => setStage('review')}
            className="mt-2 px-4 py-2 bg-green-600 text-white rounded"
          >
            Jag vill justera mitt svar
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
            onChange={e => setSecondAnswer(e.target.value)}
          />
          <button
            onClick={submitSecond}
            disabled={loading}
            className={`mt-2 px-4 py-2 rounded text-white ${
              loading ? 'bg-gray-400' : 'bg-green-600'
            }`}
          >
            {loading ? 'Analyserar…' : 'Skicka reviderat svar'}
          </button>
        </>
      )}

      {stage === 'finalFeedback' && (
        <div className="mt-4 p-4 bg-gray-100 rounded whitespace-pre-line">
          {finalFeedback}
        </div>
      )}
    </main>
  );
}
