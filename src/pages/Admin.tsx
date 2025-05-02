import { useState, useEffect, useRef } from 'react';
import { supa } from '../lib/supa';

interface PageRow {
  slug: string;
  title: string | null;
  question: string;
  html: string;
  source: string;
}

interface LogEntry {
  first: string;
  second: string;
  feedback: string;
  created_at: string;
}

export default function Admin() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [html, setHtml] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [source, setSource] = useState('');
  const [msg, setMsg] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [iframeCode, setIframeCode] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  const htmlRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supa.from('pages').select('slug,title').then(({ data }) => setPages(data ?? []));
  }, []);

  const clear = () => {
    setSlug(''); setTitle(''); setQuestion('');
    setHtml(''); setLinkUrl(''); setLinkText('');
    setSource(''); setMsg(''); setPageUrl(''); setIframeCode('');
    setLogs([]); setSummary('');
  };

  const edit = async (s: string) => {
    clear();
    const { data } = await supa.from('pages').select('*').eq('slug', s).single();
    if (!data) return;
    setSlug(data.slug);
    setTitle(data.title ?? '');
    setQuestion(data.question);
    setHtml(data.html);
    setSource(data.source);
  };

  const loadLogs = async () => {
    if (!slug) return;
    const { data } = await supa
      .from('conversation_logs')
      .select('first,second,feedback,created_at')
      .eq('slug', slug)
      .order('created_at', { ascending: false });
    setLogs(data ?? []);
  };

  const downloadLogs = () => {
    const filename = `${slug}-logs.json`;
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const insertLink = () => {
    if (!htmlRef.current) return;
    const textarea = htmlRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const snippet = `<p><a href=\"${linkUrl}\" target=\"_blank\" rel=\"noopener noreferrer\">${linkText}</a></p>`;
    const before = html.slice(0, start);
    const after = html.slice(end);
    setHtml(before + snippet + after);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + snippet.length;
    }, 0);
    setLinkUrl('');
    setLinkText('');
  };

  const handleSave = async () => {
    if (!slug.trim()) {
      setMsg('Slug krävs');
      return;
    }
    const { error } = await supa.from('pages').upsert({ slug, title: title || null, question, html, source });
    if (error) {
      setMsg(`Fel: ${error.message}`);
      return;
    }
    setMsg('Sidan sparad!');
    const { data } = await supa.from('pages').select('slug,title');
    setPages(data ?? []);
    const origin = window.location.origin;
    const u = `${origin}/page/${slug}`;
    setPageUrl(u);
    setIframeCode(`<iframe src=\"${u}\" width=\"100%\" height=\"800\" frameborder=\"0\" scrolling=\"auto\"></iframe>`);
  };

  const loadSummary = async () => {
    if (!slug) return;
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/summary?slug=${encodeURIComponent(slug)}`);
      const json = await res.json();
      setSummary(json.summary);
    } catch (err) {
      console.error('Failed to load summary:', err);
      setSummary('Kunde inte hämta insikter.');
    }
    setSummaryLoading(false);
  };

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Admin – skapa / redigera sida</h1>
      <div className="border p-2 rounded bg-gray-50 flex flex-wrap gap-2">
        {pages.map(p => (
          <button key={p.slug} onClick={() => edit(p.slug)} className="px-2 py-1 bg-blue-100 rounded">
            {p.slug}
          </button>
        ))}
      </div>

      <input className="w-full border p-2" placeholder="slug (URL-del)" value={slug} onChange={e => setSlug(e.target.value)} />
      <input className="w-full border p-2" placeholder="Valfri titel" value={title} onChange={e => setTitle(e.target.value)} />
      <textarea ref={htmlRef} className="w-full border p-2 h-32" placeholder="Inläsningsmaterial (HTML/text)" value={html} onChange={e => setHtml(e.target.value)} />
      <div className="flex space-x-2">
        <button onClick={loadLogs} className="px-3 py-1 bg-gray-200 rounded">Visa loggar</button>
        <button onClick={downloadLogs} className="px-3 py-1 bg-indigo-600 text-white rounded">Ladda ner loggar</button>
        <button onClick={loadSummary} className="px-3 py-1 bg-purple-600 text-white rounded">Insikter och rekommendationer</button>
      </div>

      <textarea className="w-full border p-2 h-40" placeholder="RAG-data – källtext som GPT använder" value={source} onChange={e => setSource(e.target.value)} />
      <textarea className="w-full border p-2 h-32" placeholder="Reflektionsfråga" value={question} onChange={e => setQuestion(e.target.value)} />

      <div className="space-x-4">
        <button onClick={handleSave} className="px-4 py-2 bg-green-700 text-white rounded">Spara till Supabase</button>
        <button onClick={clear} className="px-4 py-2 bg-gray-300 rounded">Ny sida</button>
      </div>

      {msg && <p className="text-sm text-green-700">{msg}</p>}

      {pageUrl && (
        <div className="mt-4 p-4 border rounded bg-gray-50 space-y-4">
          <p className="font-semibold">Publik länk:</p>
          <input readOnly className="w-full border p-2" value={pageUrl} />
          <p className="font-semibold">iframe-kod för Canvas:</p>
          <textarea readOnly className="w-full border p-2 h-20" value={iframeCode} />

          <section className="mt-4">
            <h2 className="text-xl font-semibold">Loggar för {slug}</h2>
            <div className="max-h-64 overflow-auto border p-2 rounded space-y-4">
              {logs.map((l, i) => (
                <div key={i}>
                  <p className="text-sm text-gray-500">{new Date(l.created_at).toLocaleString()}</p>
                  <p><strong>Före:</strong> {l.first}</p>
                  <p><strong>Efter:</strong> {l.second}</p>
                  <p><strong>Feedback:</strong> {l.feedback}</p>
                  <hr className="my-2" />
                </div>
              ))}
            </div>

            <div className="flex space-x-2 mt-2">
              <button onClick={downloadLogs} className="px-3 py-1 bg-indigo-600 text-white rounded">Ladda ner loggar</button>
              <button onClick={loadSummary} className="px-3 py-1 bg-purple-600 text-white rounded">Insikter och rekommendationer</button>
            </div>

            <section className="mt-4">
              <h2 className="text-xl font-semibold">Insikter & rekommendationer</h2>
              {summaryLoading ? <p>Hämtar insikter…</p> : <div className="p-2 border rounded whitespace-pre-line">{summary}</div>}
            </section>
          </section>
        </div>
      )}
    </main>
  );
}
