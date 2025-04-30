import { useState } from 'react';

export default function Admin() {
  const [slug, setSlug] = useState('example');
  const [question, setQuestion] = useState('Vilka är doktorandens mål?');
  const [html, setHtml] = useState('<p>Läs detta stycke noga …</p>');

  function handleSave() {
    const data = { slug, question, htmlContent: html };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Admin – Skapa sida</h1>
      <input
        className="w-full border p-2"
        placeholder="slug"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
      />
      <textarea
        className="w-full border p-2"
        placeholder="Fråga"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <textarea
        className="w-full border p-2 h-40"
        placeholder="HTML-innehåll"
        value={html}
        onChange={(e) => setHtml(e.target.value)}
      />
      <button onClick={handleSave} className="px-4 py-2 bg-green-700 text-white rounded">
        Ladda ned JSON
      </button>
      <p className="text-sm text-gray-600">
        Ladda upp den sparade filen till <code>/content</code> i repo:t och deploya. Iframe-koden blir:
      </p>
      <pre>&lt;iframe src="https://ER_APP_URL/page/{slug}" width="100%" height="800" frameborder="0"&gt;&lt;/iframe&gt;</pre>
    </main>
  );
}
