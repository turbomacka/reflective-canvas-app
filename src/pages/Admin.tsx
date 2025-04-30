import { useState, useEffect } from 'react';
import { supa } from '../lib/supa';

/** Datatyper från tabellen */
interface PageRow {
  slug: string;
  title: string | null;
  question: string;
  html: string;
  source: string;
}

export default function Admin() {
  // form-state
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [html, setHtml] = useState('');
  const [source, setSource] = useState('');
  const [msg, setMsg] = useState('');

  // lista befintliga sidor
  const [pages, setPages] = useState<PageRow[]>([]);

  async function loadPages() {
    const { data } = await supa.from('pages').select('slug,title');
    setPages(data ?? []);
  }
  useEffect(() => { loadPages(); }, []);

  /** Spara eller uppdatera rad */
  async function handleSave() {
    if (!slug.trim()) return setMsg('Slug krävs');
    const { error } = await supa.from('pages').upsert({
      slug,
      title: title || null,
      question,
      html,
      source
    });
    setMsg(error ? `Fel: ${error.message}` : 'Sidan sparad!');
    if (!error) loadPages();
  }

  /** Fyll formuläret med vald sida för redigering */
  async function edit(s: string) {
    const { data } = await supa.from('pages').select('*').eq('slug', s).single();
    if (!data) return;
    setSlug(data.slug);
    setTitle(data.title ?? '');
    setQuestion(data.question);
    setHtml(data.html);
    setSource(data.source);
  }

  /** Rensa formuläret */
  function clear() {
    setSlug('');
    setTitle('');
    setQuestion('');
    setHtml('');
    setSource('');
    setMsg('');
  }

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Admin – skapa / redigera sida</h1>

      {/* lista befintliga sidor */}
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

      {/* formuläret */}
      <input className="w-full border p-2"
             placeholder="slug (unika URL-delen)"
             value={slug}
             onChange={e => setSlug(e.target.value)} />

      <input className="w-full border p-2"
             placeholder="Frivillig titel (visas inte för studenter)"
             value={title}
             onChange={e => setTitle(e.target.value)} />

      <textarea className="w-full border p-2"
                placeholder="Reflektionsfråga"
                value={question}
                onChange={e => setQuestion(e.target.value)} />

      <textarea className="w-full border p-2 h-32"
                placeholder="Inläsningsmaterial / länkar (HTML eller text)"
                value={html}
                onChange={e => setHtml(e.target.value)} />

      <textarea className="w-full border p-2 h-40"
                placeholder="RAG-data – källtext som GPT använder"
                value={source}
                onChange={e => setSource(e.target.value)} />

      <div className="space-x-4">
        <button onClick={handleSave}
                className="px-4 py-2 bg-green-700 text-white rounded">
          Spara
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
