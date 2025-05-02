import { useState, useEffect, useRef } from 'react';
import { supa } from '../lib/supa';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CircleSpinner } from '@/components/ui/spinner';
import { Eye, Download, Trash2, Sparkle, Save, PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface PageRow {
  slug: string;
  title: string | null;
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
  const [html, setHtml] = useState('');
  const [source, setSource] = useState('');
  const [question, setQuestion] = useState('');
  const [msg, setMsg] = useState('');

  const [pageUrl, setPageUrl] = useState('');
  const [iframeCode, setIframeCode] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'insights'>('logs');

  const htmlRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supa.from('pages').select('slug,title').then(({ data }) => setPages(data || []));
  }, []);

  const clearForm = () => {
    setSlug(''); setTitle(''); setHtml(''); setSource(''); setQuestion('');
    setMsg(''); setPageUrl(''); setIframeCode('');
    setLogs([]); setSummary(''); setLogsLoading(false); setSummaryLoading(false);
    setActiveTab('logs');
  };

  const edit = async (s: string) => {
    clearForm();
    const { data } = await supa.from('pages').select('*').eq('slug', s).single();
    if (data) {
      setSlug(data.slug);
      setTitle(data.title ?? '');
      setHtml(data.html);
      setSource(data.source);
      setQuestion(data.question);
      const origin = window.location.origin;
      setPageUrl(`${origin}/page/${data.slug}`);
      setIframeCode(`<iframe src="${origin}/page/${data.slug}" width="100%" height="800" frameborder="0" scrolling="auto"></iframe>`);
    }
  };

  const handleSave = async () => {
    if (!slug.trim()) { setMsg('Slug krävs'); return; }
    const { error } = await supa.from('pages').upsert({ slug, title: title||null, html, source, question });
    if (error) { setMsg(`Fel: ${error.message}`); return; }
    setMsg('Sidan sparad!');
    const { data } = await supa.from('pages').select('slug,title');
    setPages(data || []);
    const origin = window.location.origin;
    setPageUrl(`${origin}/page/${slug}`);
    setIframeCode(`<iframe src="${origin}/page/${slug}" width="100%" height="800" frameborder="0" scrolling="auto"></iframe>`);
  };

  const handleDeleteSlug = async (s: string) => {
    if (!confirm(`Radera sidan '${s}'? Detta kan inte ångras.`)) return;
    const { error } = await supa.from('pages').delete().eq('slug', s);
    if (error) { alert(`Kunde ej radera: ${error.message}`); return; }
    const { data } = await supa.from('pages').select('slug,title');
    setPages(data || []);
    if (slug === s) clearForm();
    setMsg(`Sidan '${s}' raderad.`);
  };

  const loadLogs = async () => {
    if (!slug) return;
    setLogsLoading(true);
    const { data } = await supa.from('conversation_logs')
      .select('first,second,feedback,created_at')
      .eq('slug', slug)
      .order('created_at', { ascending: false });
    setLogs(data || []);
    setLogsLoading(false);
  };

  const downloadLogs = () => {
    const blob = new Blob([JSON.stringify(logs,null,2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`${slug}-logs.json`; a.click(); URL.revokeObjectURL(url);
  };

  const handleDeleteLogs = async () => {
    if (!slug || !confirm(`Radera ALLA loggar för '${slug}'?`)) return;
    const { error } = await supa.from('conversation_logs').delete().eq('slug', slug);
    if (error) { alert(`Kunde ej radera loggar: ${error.message}`); return; }
    setLogs([]);
    setMsg('Loggar raderade.');
  };

  const loadSummary = async () => {
    if (!slug) return;
    setSummaryLoading(true);
    const res = await fetch(`/api/summary?slug=${encodeURIComponent(slug)}`);
    const { summary: sum } = await res.json();
    setSummary(sum);
    setSummaryLoading(false);
  };

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-10 font-sans">

      <h1 className="text-4xl font-semibold">Admin – Skapa / Redigera Sida</h1>

      <Card className="shadow-lg rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3">
          {pages.map(p => (
            <div key={p.slug} className="flex items-center gap-2">
              <Button onClick={() => edit(p.slug)}>
                {p.slug}
              </Button>
              <Button variant="destructive" onClick={() => handleDeleteSlug(p.slug)}>
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="shadow-lg rounded-2xl border border-gray-100 p-6 space-y-4">
        <input className="w-full border p-3 rounded-lg" placeholder="slug (URL-del)" value={slug} onChange={e=>setSlug(e.target.value)} />
        <input className="w-full border p-3 rounded-lg" placeholder="Valfri titel" value={title} onChange={e=>setTitle(e.target.value)} />
        <textarea ref={htmlRef} className="w-full border p-3 rounded-lg h-32" placeholder="Inläsningsmaterial" value={html} onChange={e=>setHtml(e.target.value)} />
        <textarea className="w-full border p-3 rounded-lg h-32" placeholder="RAG-data" value={source} onChange={e=>setSource(e.target.value)} />
        <textarea className="w-full border p-3 rounded-lg h-32" placeholder="Reflektionsfråga" value={question} onChange={e=>setQuestion(e.target.value)} />
        <div className="flex gap-4">
          <Button onClick={handleSave} className="flex items-center space-x-2">
            <Save size={18} /> <span>Spara</span>
          </Button>
          <Button variant="outline" onClick={clearForm} className="flex items-center space-x-2">
            <PlusCircle size={18} /> <span>Ny sida</span>
          </Button>
        </div>
        {msg && <p className="text-green-600 mt-2">{msg}</p>}
      </Card>

      {pageUrl && (
        <Card className="shadow-lg rounded-2xl border border-gray-100 p-6 space-y-6 relative">
          <CardHeader>
            <CardTitle className="text-2xl">Inställningar & Loggar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">Publik sida:</p>
              <input readOnly className="w-full border p-3 rounded-lg mt-1" value={pageUrl} />
            </div>
            <div>
              <p className="font-medium">Iframe-kod:</p>
              <textarea readOnly className="w-full border p-3 rounded-lg h-24 mt-1" value={iframeCode} />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="border-b">
              <TabsList>
                <TabsTrigger value="logs">Loggar</TabsTrigger>
                <TabsTrigger value="insights">Insikter</TabsTrigger>
              </TabsList>
              <TabsContent value="logs">
                <div className="flex gap-3 my-4">
                  <Button onClick={loadLogs} className="flex items-center space-x-2">
                    <Eye size={16} /> <span>Visa loggar</span>
                  </Button>
                  <Button onClick={downloadLogs} disabled={logs.length===0} className="flex items-center space-x-2">
                    <Download size={16} /> <span>Ladda ner</span>
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteLogs} disabled={logs.length===0} className="flex items-center space-x-2">
                    <Trash2 size={16} /> <span>Radera</span>
                  </Button>
                </div>
                {logsLoading && (
                  <div className="absolute inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center rounded-2xl">
                    <CircleSpinner size={50} />
                    <p className="mt-4 text-xl font-medium">Hämtar loggar…</p>
                  </div>
                )}
                {!logsLoading && logs.map((l,i)=>(
                  <Card key={i} className="mb-4">
                    <CardContent>
                      <p className="text-sm text-gray-500">{new Date(l.created_at).toLocaleString()}</p>
                      <p><strong>Före:</strong> {l.first}</p>
                      <p><strong>Efter:</strong> {l.second}</p>
                      <p><strong>Feedback:</strong> {l.feedback}</p>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="insights">
                <div className="flex gap-3 my-4">
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={loadSummary}
                    className="flex items-center space-x-2 bg-gradient-to-r from-[#005eb8] to-[#0073e6] text-white px-4 py-2 rounded-lg shadow-md"
                  >
                    <Sparkle size={16} /> <span>Hämta insikter</span>
                  </motion.button>
                </div>
                {summaryLoading && (
                  <div className="absolute inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center rounded-2xl">
                    <CircleSpinner size={50} />
                    <p className="mt-4 text-xl font-medium">Analyserar…</p>
                  </div>
                )}
                {!summaryLoading && summary && (
                  <div className="prose max-w-none">
                    {summary.split('\n').map((line,i)=><p key={i}>{line}</p>)}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
