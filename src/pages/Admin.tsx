import { useState, useEffect, useRef } from 'react';
import { supa } from '../lib/supa';

interface PageRow {
  slug: string;
  title: string | null;
  question: string;
  html: string;
  source: string;
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

  const htmlRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supa.from('pages')
      .select('slug,title')
      .then(({ data }) => setPages(data ?? []));
  }, []);

  const edit = async (s: string) => {
    const { data } = await supa.from('pages').select('*').eq('slug', s).single();
    if (!data) return;
    setSlug(data.slug);
    setTitle(data.title ?? '');
    setQuestion(data.question);
    setHtml(data.html);
    setSource(data.source);
  };

  const insertLink = () => {
    if (!htmlRef.current) return;
    const textarea = htmlRef.current;
    const start = textarea.selectionStart;
    const end   = textarea.selectionEnd;
    const snippet = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
    const before  = html.slice(0, start);
    const after   = html.slice(end);
    setHtml(before + snippet + after);
    // flytta markören efter insatt snippet
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + snippet.length;
    }, 0);
    setLinkUrl('');
    setLinkText('');
  };

  const handleSave = async () => {
    if (!slug.trim()) return setMsg('Slug krävs');
    const { error } = await supa.from('pages').upsert({
      slug,
      title: title || null,
      question,
      html,
      source
    });
    if (error) setMsg(`Fel: ${error.message}`);
    else {
      setMsg('Sidan sparad!');
      const { data } = await supa.from('pages').select('slug,title');
      setPages(data ?? []);
    }
  };

  const clear = () => {
    setSlug(''); setTitle(''); setQuestion('');
    setHtml(''); setLinkUrl(''); setLinkText('');
    setSource(''); setMsg('');
  };

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Admin – skapa / redigera sida</h1>

      <div className="border p-2 rounded bg-gray-50">
        <h2 className="font-semibold mb-2">Befintliga sidor</h2>
        {pages.map(p => (
          <button key={p.slug}
                  onClick={() => edit(p.slug)}
                  className="mr-2 mb-1 px-2 py-1 bg-blue-100 rounded">
            {p.slug}
          </button>
        ))}
      </div>

      <input
        className="w-full border p-2"
        placeholder="slug (unik URL)"
        value={slug}
        onChange={e => setSlug(e.target.value)}
      />

      <input
        className="w-full border p-2"
        placeholder="Valfri titel"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />

      <textarea
        ref={htmlRef}
        className="w-full border p-2 h-32"
        placeholder="Inläsningsmaterial (HTML eller text)"
        value={html}
        onChange={e => setHtml(e.target.value)}
      />

      {/* LÄNK-INSÄTTNING */}
      <div className="flex space-x-2">
        <input
          className="flex-1 border p-2"
          placeholder="Länktext (visas)"
          value={linkText}
          onChange={e => setLinkText(e.target.value)}
        />
        <input
          className="flex-1 border p-2"
          placeholder="URL (https://...)"
          value={linkUrl}
          onChange={e => setLinkUrl(e.target.value)}
        />
        <button
          onClick={insertLink}
          className="px-4 py-2 bg-blue-600 text-white rounded">
          Infoga länk
        </button>
      </div>

      <textarea
        className="w-full border p-2 h-40"
        placeholder="RAG-data – källtext som GPT använder"
        value={source}
        onChange={e => setSource(e.target.value)}
      />

      <textarea
        className="w-full border p-2 h-32"
        placeholder="Reflektionsfråga"
        value={question}
        onChange={e => setQuestion(e.target.value)}
      />

      <div className="space-x-4">
        <button onClick={handleSave}
                className="px-4 py-2 bg-green-700 text-white rounded">
          Spara till Supabase
        </button>
        <button onClick={clear}
                className="px-4 py-2 bg-gray-300 rounded">
          Ny sida
        </button>
      </div>

      {msg && <p className="text-sm mt-2">{msg}</p>}
    </main>
  );
}
