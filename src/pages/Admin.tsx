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
  // SIDHANTERING
  const [pages, setPages]               = useState<PageRow[]>([]);
  const [slug, setSlug]                 = useState('');
  const [title, setTitle]               = useState('');
  const [question, setQuestion]         = useState('');
  const [html, setHtml]                 = useState('');
  const [linkUrl, setLinkUrl]           = useState('');
  const [linkText, setLinkText]         = useState('');
  const [source, setSource]             = useState('');
  const [msg, setMsg]                   = useState('');

  // EMBED & LOGGAR & INSIKTER
  const [pageUrl, setPageUrl]               = useState('');
  const [iframeCode, setIframeCode]         = useState('');
  const [logs, setLogs]                     = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading]       = useState(false);
  const [summary, setSummary]               = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [activeTab, setActiveTab]           = useState<'logs'|'insights'>('logs');

  const htmlRef = useRef<HTMLTextAreaElement>(null);

  // Hämta alla slugs på mount
  useEffect(() => {
    supa.from('pages').select('slug,title')
      .then(({ data }) => setPages(data ?? []));
  }, []);

  const clearForm = () => {
    setSlug(''); setTitle(''); setQuestion(''); setHtml('');
    setLinkUrl(''); setLinkText(''); setSource(''); setMsg('');
    setPageUrl(''); setIframeCode('');
    setLogs([]); setSummary('');
    setLogsLoading(false); setSummaryLoading(false);
    setActiveTab('logs');
  };

  // Redigera en sida
  const edit = async (s: string) => {
    clearForm();
    const { data } = await supa.from('pages').select('*').eq('slug', s).single();
    if (!data) return;
    setSlug(data.slug);
    setTitle(data.title ?? '');
    setQuestion(data.question);
    setHtml(data.html);
    setSource(data.source);
    const origin = window.location.origin;
    setPageUrl(`${origin}/page/${data.slug}`);
    setIframeCode(
      `<iframe src="${origin}/page/${data.slug}" width="100%" height="800" frameborder="0" scrolling="auto"></iframe>`
    );
  };

  // Spara/uppdatera sida
  const handleSave = async () => {
    if (!slug.trim()) { setMsg('Slug krävs'); return; }
    const { error } = await supa.from('pages')
      .upsert({ slug, title: title||null, question, html, source });
    if (error) { setMsg(`Fel: ${error.message}`); return; }
    setMsg('Sidan sparad!');
    const { data } = await supa.from('pages').select('slug,title');
    setPages(data ?? []);
    const origin = window.location.origin;
    setPageUrl(`${origin}/page/${slug}`);
    setIframeCode(
      `<iframe src="${origin}/page/${slug}" width="100%" height="800" frameborder="0" scrolling="auto"></iframe>`
    );
  };

  // Radera en slug
  const handleDeleteSlug = async (s: string) => {
    if (!confirm(`Radera sidan '${s}'? Detta går ej att ångra.`)) return;
    const { error } = await supa.from('pages').delete().eq('slug', s);
    if (error) alert(`Kunde ej radera: ${error.message}`);
    else {
      const { data } = await supa.from('pages').select('slug,title');
      setPages(data ?? []);
      if (slug===s) clearForm();
      setMsg(`Sidan '${s}' raderad.`);
    }
  };

  // Infoga länk
  const insertLink = () => {
    if (!htmlRef.current) return;
    const ta = htmlRef.current;
    const { selectionStart: start, selectionEnd: end } = ta;
    const snippet = `<p><a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a></p>`;
    setHtml(prev => prev.slice(0,start) + snippet + prev.slice(end));
    setTimeout(()=>{
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + snippet.length;
    },0);
    setLinkUrl(''); setLinkText('');
  };

  // Hämta loggar
  const loadLogs = async () => {
    if (!slug) return;
    setLogsLoading(true);
    const { data } = await supa.from('conversation_logs')
      .select('first,second,feedback,created_at')
      .eq('slug', slug)
      .order('created_at', { ascending: false });
    setLogs(data ?? []);
    setLogsLoading(false);
  };

  // Ladda ner loggar
  const downloadLogs = () => {
    const filename = `${slug}-logs.json`;
    const blob = new Blob([JSON.stringify(logs,null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
  };

  // Radera loggar
  const handleDeleteLogs = async () => {
    if (!slug || !confirm(`Radera ALLA loggar för '${slug}'?`)) return;
    const { error } = await supa.from('conversation_logs').delete().eq('slug', slug);
    if (error) alert(`Kunde ej radera loggar: ${error.message}`);
    else { setLogs([]); setMsg(`Loggar raderade.`); }
  };

  // Hämta insikter
  const loadSummary = async () => {
    if (!slug) return;
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/summary?slug=${encodeURIComponent(slug)}`);
      const { summary: sum } = await res.json();
      setSummary(sum);
    } catch {
      setSummary('Kunde inte hämta insikter.');
    }
    setSummaryLoading(false);
  };

  // LTU-färger
  const primary = 'bg-[#005eb8] hover:bg-[#004a96] text-white';
  const danger  = 'bg-[#d60000] hover:bg-[#a00000] text-white';

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-8 font-sans">
      <h1 className="text-3xl font-bold">Admin – Skapa / Redigera Sida</h1>

      {/* Slug-lista */}
      <div className="flex flex-wrap gap-2 bg-gray-50 p-3 rounded shadow-sm">
        {pages.map(p=>(
          <div key={p.slug} className="flex items-center gap-2">
            <button
              onClick={()=>edit(p.slug)}
              className={`${primary} px-3 py-1 rounded-md shadow`}>
              {p.slug}
            </button>
            <button
              onClick={()=>handleDeleteSlug(p.slug)}
              className={`${danger} px-2 py-1 rounded-md shadow`}>
              🗑️
            </button>
          </div>
        ))}
      </div>

      {/* Formulär */}
      <div className="space-y-4">
        <input className="w-full border p-2 rounded" placeholder="slug (URL-del)" value={slug} onChange={e=>setSlug(e.target.value)}/>
        <input className="w-full border p-2 rounded" placeholder="Valfri titel"     value={title} onChange={e=>setTitle(e.target.value)}/>
        <textarea ref={htmlRef} className="w-full border p-2 rounded h-32" placeholder="Inläsningsmaterial" value={html} onChange={e=>setHtml(e.target.value)}/>
        <div className="flex gap-2">
          <input className="flex-1 border p-2 rounded" placeholder="Länktext" value={linkText} onChange={e=>setLinkText(e.target.value)}/>
          <input className="flex-1 border p-2 rounded" placeholder="URL (https://…)" value={linkUrl} onChange={e=>setLinkUrl(e.target.value)}/>
          <button onClick={insertLink} className={`${primary} px-4 py-2 rounded`}>🔗 Infoga</button>
        </div>
        <textarea className="w-full border p-2 rounded h-40" placeholder="RAG-data" value={source} onChange={e=>setSource(e.target.value)}/>
        <textarea className="w-full border p-2 rounded h-32" placeholder="Reflektionsfråga" value={question} onChange={e=>setQuestion(e.target.value)}/>
      </div>

      {/* Spara / Ny */}
      <div className="flex gap-4">
        <button onClick={handleSave} className={`${primary} px-6 py-2 rounded-md shadow`}>
          💾 Spara
        </button>
        <button onClick={clearForm} className="bg-gray-300 hover:bg-gray-400 px-6 py-2 rounded-md shadow">
          ✨ Ny sida
        </button>
      </div>
      {msg && <p className="text-green-700">{msg}</p>}

      {/* Embed + Tabs */}
      {pageUrl && (
        <div className="mt-8 p-6 bg-white rounded shadow">
          <p className="font-semibold">Publik sida:</p>
          <input readOnly className="w-full border p-2 rounded mb-4" value={pageUrl}/>
          <p className="font-semibold">Iframe-kod:</p>
          <textarea readOnly className="w-full border p-2 rounded h-20 mb-6" value={iframeCode}/>

          {/* Tab-bar */}
          <div className="flex border-b mb-4">
            <button
              onClick={()=>setActiveTab('logs')}
              className={`px-4 py-2 -mb-px ${ activeTab==='logs' ? 'border-b-2 border-[#005eb8]' : '' }`}
            >
              Loggar
            </button>
            <button
              onClick={()=>setActiveTab('insights')}
              className={`px-4 py-2 -mb-px ${ activeTab==='insights' ? 'border-b-2 border-[#005eb8]' : '' }`}
            >
              Insikter
            </button>
          </div>

          {/* Buttons under tabs */}
          <div className="flex gap-2 mb-4">
            <button onClick={loadLogs} className={`${primary} px-3 py-1 rounded`}>👁️ Visa</button>
            <button onClick={downloadLogs} disabled={logs.length===0} className={`${primary} px-3 py-1 rounded ${logs.length===0? 'opacity-50 cursor-not-allowed':''}`}>
              ⬇️ Ladda ner
            </button>
            <button onClick={handleDeleteLogs} disabled={logs.length===0} className={`${danger} px-3 py-1 rounded ${logs.length===0? 'opacity-50 cursor-not-allowed':''}`}>
              🗑️ Radera
            </button>
            <button onClick={loadSummary} className={`${primary} px-3 py-1 rounded`}>
              🔮 Insikter
            </button>
          </div>

          {/* Content */}
          <div className="relative min-h-[200px]">
            {/* Overlay spinner */}
            {(activeTab==='logs' ? logsLoading : summaryLoading) && (
              <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10 rounded">
                <div className="animate-spin h-10 w-10 border-4 border-gray-200 border-t-[#005eb8] rounded-full"></div>
                <span className="ml-3 text-[#005eb8] font-medium">
                  {activeTab==='logs' ? 'Hämtar loggar…' : 'Analyserar…'}
                </span>
              </div>
            )}

            {/* Logs */}
            {activeTab==='logs' && logs.length>0 && !logsLoading && (
              <div className="space-y-4">
                {logs.map((l,i)=>(
                  <div key={i} className="p-3 border rounded">
                    <p className="text-sm text-gray-500">{new Date(l.created_at).toLocaleString()}</p>
                    <p><strong>Före:</strong> {l.first}</p>
                    <p><strong>Efter:</strong> {l.second}</p>
                    <p><strong>Feedback:</strong> {l.feedback}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Insights */}
            {activeTab==='insights' && !summaryLoading && summary && (
              <div className="prose max-w-none">
                {summary.split('\n').map((row,i)=><p key={i}>{row}</p>)}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
