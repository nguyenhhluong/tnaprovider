import { useState, useEffect, useCallback } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/shared/PageHeader";
import { SEO } from "../../components/SEO";
import { cn } from "../../utils/cn";
import { Plus, FileText, Trash2, ChevronDown, ChevronUp, Save, Send, CheckCircle2, Ban, Repeat, ExternalLink, Printer, Download, Eye, RotateCcw, Archive, X, AlertCircle, Loader2 } from "lucide-react";

type Tab = "quotes" | "builder" | "templates" | "sent-accepted";
type BuilderStep = "client" | "project" | "scope" | "items" | "terms" | "review" | "pdf";

const STATUS_LABELS: Record<string, string> = { draft: "Draft", in_review: "In Review", approved: "Approved", sent: "Sent", accepted: "Accepted", rejected: "Rejected", expired: "Expired", converted: "Converted" };
const STATUS_COLORS: Record<string, string> = { draft: "bg-gray-100 text-gray-600", in_review: "bg-blue-100 text-blue-600", approved: "bg-green-100 text-green-600", sent: "bg-purple-100 text-purple-600", accepted: "bg-emerald-100 text-emerald-600", rejected: "bg-red-100 text-red-600", expired: "bg-amber-100 text-amber-600", converted: "bg-cyan-100 text-cyan-600" };
const ITEM_TYPES = ["labour", "material", "subcontractor", "equipment", "travel", "allowance", "other"];
const BUILDER_STEPS: { key: BuilderStep; label: string }[] = [
  { key: "client", label: "Client" }, { key: "project", label: "Project" }, { key: "scope", label: "Scope" },
  { key: "items", label: "Line Items" }, { key: "terms", label: "Terms" }, { key: "review", label: "Review" }, { key: "pdf", label: "Final PDF" },
];

interface Quote { id: string; quote_number: string; title: string; client_name: string; client_email: string; client_phone: string; client_company: string; client_address: string; project_name: string; project_location: string; scope: string; status: string; subtotal: number; gst: number; total: number; discount_total: number; quote_date: string; valid_until: string; revision_number: number; currency: string; tax_rate: number; discount_type: string; discount_value: number; terms: string; payment_terms: string; inclusions: string; exclusions: string; warranty: string; notes: string; internal_notes: string; sections: any[]; items: any[]; reviewEvents: any[]; documents: any[]; created_at: string; }
interface Section { id?: string; title: string; description?: string; sort_order: number; items: Item[]; }
interface Item { id?: string; section_id?: string; name: string; description: string; quantity: number; unit: string; item_type: string; unit_cost: number; unit_price: number; markup_percent: number; discount_percent: number; taxable: boolean; tax_rate: number; sort_order: number; notes: string; }

function fmtMoney(v: number) { return `$${(v || 0).toFixed(2)}`; }
function fmtDate(iso: string) { if (!iso) return ""; return new Date(iso).toLocaleDateString("en-AU"); }

export function Quotes() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  const [sp, setSp] = useSearchParams();
  const [tab, setTab] = useState<Tab>((sp.get("tab") as Tab) || "quotes");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [builderStep, setBuilderStep] = useState<BuilderStep>("client");
  const [saving, setSaving] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  // Builder form state
  const [form, setForm] = useState({ client_name: "", client_company: "", client_email: "", client_phone: "", client_address: "", project_name: "", project_location: "", scope: "", quote_date: new Date().toISOString().split("T")[0], valid_until: "", currency: "AUD", tax_rate: 0.10, discount_type: "none", discount_value: 0, terms: "", payment_terms: "", inclusions: "", exclusions: "", warranty: "", notes: "", internal_notes: "" });
  const [sections, setSections] = useState<Section[]>([]);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);

  // Create Quote From Request integration
  useEffect(() => {
    const prefill = sp.get("prefill");
    if (prefill) {
      try {
        const data = JSON.parse(decodeURIComponent(prefill));
        setForm((f) => ({ ...f, client_name: data.client_name || "", client_email: data.client_email || "", client_phone: data.client_phone || "", project_name: data.project_name || data.service || "", scope: data.scope || data.message || "", project_location: data.location || "" }));
      } catch {}
      setTab("builder");
    }
  }, []);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quotes", { credentials: "same-origin" });
      if (!res.ok) { setError("Failed to load"); return; }
      const d = await res.json();
      setQuotes(d.quotes || []);
      setError(null);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/quotes/templates/list", { credentials: "same-origin" });
      if (res.ok) { const d = await res.json(); setTemplates(d || []); }
    } catch {}
  }, []);

  useEffect(() => { fetchQuotes(); fetchTemplates(); }, []);

  const selectTab = (t: Tab) => { setTab(t); setSp({ tab: t }, { replace: true }); setSelectedQuote(null); setPdfUrl(null); };

  const createNewQuote = () => {
    setQuoteId(null);
    setForm({ client_name: "", client_company: "", client_email: "", client_phone: "", client_address: "", project_name: "", project_location: "", scope: "", quote_date: new Date().toISOString().split("T")[0], valid_until: "", currency: "AUD", tax_rate: 0.10, discount_type: "none", discount_value: 0, terms: "", payment_terms: "", inclusions: "", exclusions: "", warranty: "", notes: "", internal_notes: "" });
    setSections([]);
    setBuilderStep("client");
    setPdfUrl(null);
    selectTab("builder");
  };

  const startFromTemplate = async (tplId: string) => {
    createNewQuote();
    try {
      const res = await fetch("/api/quotes/templates/list", { credentials: "same-origin" });
      if (!res.ok) return;
      const tpls = await res.json();
      const tpl = tpls.find((t: any) => t.id === tplId);
      if (tpl?.items) {
        const secMap: Record<string, Section> = {};
        const newSections: Section[] = [];
        for (const ti of tpl.items) {
          if (!secMap[ti.section_title]) {
            secMap[ti.section_title] = { title: ti.section_title, sort_order: newSections.length, items: [] };
            newSections.push(secMap[ti.section_title]);
          }
          secMap[ti.section_title].items.push({ name: ti.description, description: ti.description, quantity: 1, unit: ti.unit || "each", item_type: ti.item_type || "material", unit_cost: 0, unit_price: 0, markup_percent: 0, discount_percent: 0, taxable: true, tax_rate: 0.10, sort_order: secMap[ti.section_title].items.length, notes: "" });
        }
        setSections(newSections);
      }
    } catch {}
  };

  const saveQuote = async () => {
    setSaving(true);
    try {
      const body: any = { ...form, sections: sections.map((s) => ({ title: s.title, sort_order: s.sort_order, items: s.items.map((i) => ({ ...i })) })) };
      const res = quoteId
        ? await fetch(`/api/quotes/${quoteId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form), credentials: "same-origin" })
        : await fetch("/api/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" });
      const d = await res.json();
      if (res.ok) { setQuoteId(d.id || quoteId); setBuilderStep("review"); fetchQuotes(); }
      else { setError(d.error || "Save failed"); }
    } catch { setError("Save failed"); }
    finally { setSaving(false); }
  };

  const doWorkflowAction = async (action: string, extra?: any) => {
    if (!quoteId && !selectedQuote?.id) return;
    const id = quoteId || selectedQuote?.id;
    setSaving(true);
    try {
      const res = await fetch(`/api/quotes/${id}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(extra || {}), credentials: "same-origin" });
      const d = await res.json();
      if (res.ok) { await fetchQuotes(); if (action === "generate-pdf") setPdfUrl(d.url); }
      else { setError(d.error || "Action failed"); }
    } catch { setError("Action failed"); }
    finally { setSaving(false); }
  };

  const addSection = () => setSections([...sections, { title: `Section ${sections.length + 1}`, sort_order: sections.length, items: [] }]);
  const addItem = (secIdx: number) => {
    const newSecs = [...sections];
    newSecs[secIdx] = { ...newSecs[secIdx], items: [...newSecs[secIdx].items, { name: "", description: "", quantity: 1, unit: "each", item_type: "material", unit_cost: 0, unit_price: 0, markup_percent: 0, discount_percent: 0, taxable: true, tax_rate: 0.10, sort_order: newSecs[secIdx].items.length, notes: "" }] };
    setSections(newSecs);
  };
  const removeItem = (secIdx: number, itemIdx: number) => {
    const newSecs = [...sections];
    newSecs[secIdx] = { ...newSecs[secIdx], items: newSecs[secIdx].items.filter((_, i) => i !== itemIdx) };
    setSections(newSecs);
  };
  const updateItem = (secIdx: number, itemIdx: number, field: string, value: any) => {
    const newSecs = [...sections];
    newSecs[secIdx].items[itemIdx] = { ...newSecs[secIdx].items[itemIdx], [field]: value };
    setSections(newSecs);
  };
  const removeSection = (idx: number) => setSections(sections.filter((_, i) => i !== idx));

  const calcLineTotal = (item: Item) => {
    const qty = Number(item.quantity) || 1;
    const up = Number(item.unit_price) || 0;
    const markup = Number(item.markup_percent) || 0;
    const effectiveUp = up * (1 + markup / 100);
    const subtotal = qty * effectiveUp;
    const disc = subtotal * (Number(item.discount_percent) || 0) / 100;
    return subtotal - disc;
  };

  const quoteTotal = () => {
    let total = 0;
    for (const sec of sections) {
      for (const item of sec.items) total += calcLineTotal(item);
    }
    const disc = form.discount_type === "percentage" ? total * (Number(form.discount_value) || 0) / 100 : form.discount_type === "fixed" ? Number(form.discount_value) || 0 : 0;
    return { subtotal: total, discount: disc, gst: (total - disc) * Number(form.tax_rate) || 0, total: total - disc + ((total - disc) * Number(form.tax_rate) || 0) };
  };

  const renderSummaryCard = (label: string, count: number, status: string) => (
    <button key={status} onClick={() => { selectTab(status === "sent" || status === "accepted" ? "sent-accepted" : "quotes"); setSp({ tab: "quotes", status }, { replace: true }); }}
      className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-left hover:shadow-sm transition-shadow">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-2xl font-bold mt-1">{count}</p>
    </button>
  );

  const renderBuilderStepNav = () => (
    <div className="flex gap-1 overflow-x-auto pb-2 mb-4 border-b border-gray-200 dark:border-gray-800">
      {BUILDER_STEPS.map((s) => (
        <button key={s.key} onClick={() => setBuilderStep(s.key)}
          className={cn("px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors", builderStep === s.key ? "bg-brand-accent text-white" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800")}>
          {s.label}
        </button>
      ))}
    </div>
  );

  const renderClientStep = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div><label className="text-sm text-gray-400">Client Name *</label><input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="w-full border rounded-lg p-2 text-sm" /></div>
      <div><label className="text-sm text-gray-400">Company</label><input value={form.client_company} onChange={(e) => setForm({ ...form, client_company: e.target.value })} className="w-full border rounded-lg p-2 text-sm" /></div>
      <div><label className="text-sm text-gray-400">Email</label><input value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} className="w-full border rounded-lg p-2 text-sm" /></div>
      <div><label className="text-sm text-gray-400">Phone</label><input value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} className="w-full border rounded-lg p-2 text-sm" /></div>
      <div className="md:col-span-2"><label className="text-sm text-gray-400">Address</label><input value={form.client_address} onChange={(e) => setForm({ ...form, client_address: e.target.value })} className="w-full border rounded-lg p-2 text-sm" /></div>
    </div>
  );

  const renderProjectStep = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div><label className="text-sm text-gray-400">Project Name *</label><input value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} className="w-full border rounded-lg p-2 text-sm" /></div>
      <div><label className="text-sm text-gray-400">Location</label><input value={form.project_location} onChange={(e) => setForm({ ...form, project_location: e.target.value })} className="w-full border rounded-lg p-2 text-sm" /></div>
      <div><label className="text-sm text-gray-400">Quote Date</label><input type="date" value={form.quote_date} onChange={(e) => setForm({ ...form, quote_date: e.target.value })} className="w-full border rounded-lg p-2 text-sm" /></div>
      <div><label className="text-sm text-gray-400">Valid Until</label><input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="w-full border rounded-lg p-2 text-sm" /></div>
    </div>
  );

  const renderScopeStep = () => (
    <div><label className="text-sm text-gray-400">Scope of Works</label><textarea value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} rows={6} className="w-full border rounded-lg p-2 text-sm" /></div>
  );

  const renderItemsStep = () => (
    <div className="space-y-6">
      {sections.map((sec, si) => (
        <div key={si} className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input value={sec.title} onChange={(e) => { const ns = [...sections]; ns[si].title = e.target.value; setSections(ns); }} className="flex-1 font-semibold border-b border-transparent focus:border-brand-accent outline-none text-sm py-1" />
            <button onClick={() => removeSection(si)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
          </div>
          <div className="space-y-2">
            {sec.items.map((item, ii) => (
              <div key={ii} className="flex flex-wrap gap-2 items-center bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-sm">
                <select value={item.item_type} onChange={(e) => updateItem(si, ii, "item_type", e.target.value)} className="px-1 py-0.5 border rounded text-xs w-24">
                  {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={item.name} onChange={(e) => updateItem(si, ii, "name", e.target.value)} placeholder="Description" className="flex-1 min-w-[120px] px-1 py-0.5 border rounded text-xs" />
                <input type="number" value={item.quantity} onChange={(e) => updateItem(si, ii, "quantity", Number(e.target.value))} className="w-16 px-1 py-0.5 border rounded text-xs text-center" />
                <select value={item.unit} onChange={(e) => updateItem(si, ii, "unit", e.target.value)} className="px-1 py-0.5 border rounded text-xs w-16">
                  {["each", "hour", "day", "m2", "lm", "m", "kg", "lot", "allowance"].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <input type="number" value={item.unit_cost} onChange={(e) => updateItem(si, ii, "unit_cost", Number(e.target.value))} placeholder="Cost" className="w-20 px-1 py-0.5 border rounded text-xs" />
                <input type="number" value={item.markup_percent} onChange={(e) => updateItem(si, ii, "markup_percent", Number(e.target.value))} placeholder="M%" className="w-16 px-1 py-0.5 border rounded text-xs" />
                <input type="number" value={item.unit_price} onChange={(e) => updateItem(si, ii, "unit_price", Number(e.target.value))} placeholder="Price" className="w-20 px-1 py-0.5 border rounded text-xs" />
                <input type="number" value={item.discount_percent} onChange={(e) => updateItem(si, ii, "discount_percent", Number(e.target.value))} placeholder="D%" className="w-16 px-1 py-0.5 border rounded text-xs" />
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={item.taxable} onChange={(e) => updateItem(si, ii, "taxable", e.target.checked)} /> Tax</label>
                <span className="font-mono text-xs w-20 text-right">{fmtMoney(calcLineTotal(item))}</span>
                <button onClick={() => removeItem(si, ii)} className="p-0.5 text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
          <button onClick={() => addItem(si)} className="text-xs text-brand-accent hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add Item</button>
        </div>
      ))}
      <button onClick={addSection} className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-400 hover:text-brand-accent hover:border-brand-accent transition-colors"><Plus className="w-4 h-4 inline mr-1" />Add Section</button>
    </div>
  );

  const renderTermsStep = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div><label className="text-sm text-gray-400">Payment Terms</label><textarea value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} rows={3} className="w-full border rounded-lg p-2 text-sm" /></div>
      <div><label className="text-sm text-gray-400">Warranty</label><textarea value={form.warranty} onChange={(e) => setForm({ ...form, warranty: e.target.value })} rows={3} className="w-full border rounded-lg p-2 text-sm" /></div>
      <div><label className="text-sm text-gray-400">Inclusions</label><textarea value={form.inclusions} onChange={(e) => setForm({ ...form, inclusions: e.target.value })} rows={3} className="w-full border rounded-lg p-2 text-sm" /></div>
      <div><label className="text-sm text-gray-400">Exclusions</label><textarea value={form.exclusions} onChange={(e) => setForm({ ...form, exclusions: e.target.value })} rows={3} className="w-full border rounded-lg p-2 text-sm" /></div>
      <div className="md:col-span-2"><label className="text-sm text-gray-400">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full border rounded-lg p-2 text-sm" /></div>
      <div className="md:col-span-2"><label className="text-sm text-gray-400">Internal Notes</label><textarea value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} rows={3} className="w-full border rounded-lg p-2 text-sm" /></div>
    </div>
  );

  const renderReviewStep = () => {
    const tot = quoteTotal();
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex justify-between"><span className="font-bold text-lg">Quote Preview</span><span className="text-sm text-gray-400">{quoteId ? `#${quotes.find((q) => q.id === quoteId)?.quote_number || ""}` : "New Quote"}</span></div>
          <div className="border-t pt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Client</span><span>{form.client_name}{form.client_company ? ` - ${form.client_company}` : ""}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Project</span><span>{form.project_name}</span></div>
            {form.scope && <div><span className="text-gray-400">Scope:</span><p className="mt-1 whitespace-pre-wrap">{form.scope}</p></div>}
          </div>
          {sections.map((sec, si) => sec.items.filter((i) => i.name).length > 0 && (
            <div key={si} className="border-t pt-2">
              <p className="font-semibold text-sm mb-1">{sec.title}</p>
              <table className="w-full text-xs">
                <thead><tr className="text-gray-400 border-b"><th className="text-left py-1">Item</th><th className="text-right py-1">Qty</th><th className="text-right py-1">Price</th><th className="text-right py-1">Total</th></tr></thead>
                <tbody>{sec.items.filter((i) => i.name).map((item, ii) => <tr key={ii} className="border-b border-gray-100"><td className="py-1">{item.name}</td><td className="text-right py-1">{item.quantity}</td><td className="text-right py-1">{fmtMoney(Number(item.unit_price) || 0)}</td><td className="text-right py-1 font-mono">{fmtMoney(calcLineTotal(item))}</td></tr>)}</tbody>
              </table>
            </div>
          ))}
          <div className="border-t pt-2 text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(tot.subtotal)}</span></div>
            {tot.discount > 0 && <div className="flex justify-between text-red-500"><span>Discount</span><span>-{fmtMoney(tot.discount)}</span></div>}
            <div className="flex justify-between"><span>GST</span><span>{fmtMoney(tot.gst)}</span></div>
            <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>{fmtMoney(tot.total)}</span></div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={saveQuote} disabled={saving} className="px-4 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium"><Save className="w-4 h-4 inline mr-1" />{quoteId ? "Update Quote" : "Save Quote"}</button>
          {quoteId && <button onClick={() => doWorkflowAction("submit-review")} disabled={saving} className="px-4 py-2 border border-brand-accent text-brand-accent rounded-lg text-sm font-medium"><Send className="w-4 h-4 inline mr-1" />Submit for Review</button>}
        </div>
      </div>
    );
  };

  const renderPdfStep = () => {
    const q = quotes.find((q) => q.id === quoteId);
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-gray-500">Quote #{q?.quote_number || ""} is ready for export.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          {!pdfUrl && <button onClick={() => doWorkflowAction("generate-pdf")} disabled={saving} className="px-6 py-3 bg-brand-accent text-white rounded-xl font-medium"><Download className="w-5 h-5 inline mr-2" />Export PDF</button>}
          {pdfUrl && <><a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-brand-accent text-white rounded-xl font-medium inline-flex items-center gap-2"><Eye className="w-5 h-5" />Open PDF</a><a href={pdfUrl} download className="px-6 py-3 border border-brand-accent text-brand-accent rounded-xl font-medium inline-flex items-center gap-2"><Download className="w-5 h-5" />Download</a></>}
          <button onClick={() => window.print()} className="px-6 py-3 border border-gray-300 rounded-xl text-sm font-medium"><Printer className="w-4 h-4 inline mr-2" />Print</button>
        </div>
      </div>
    );
  };

  const renderWorkflowActions = (q: Quote) => {
    if (!q) return null;
    return (
      <div className="flex gap-2 flex-wrap">
        {q.status === "draft" && <><button onClick={() => { setQuoteId(q.id); setSelectedQuote(q); setForm({ client_name: q.client_name || "", client_company: q.client_company || "", client_email: q.client_email || "", client_phone: q.client_phone || "", client_address: q.client_address || "", project_name: q.project_name || "", project_location: q.project_location || "", scope: q.scope || "", quote_date: q.quote_date || "", valid_until: q.valid_until || "", currency: q.currency || "AUD", tax_rate: q.tax_rate || 0.10, discount_type: q.discount_type || "none", discount_value: q.discount_value || 0, terms: q.terms || "", payment_terms: q.payment_terms || "", inclusions: q.inclusions || "", exclusions: q.exclusions || "", warranty: q.warranty || "", notes: q.notes || "", internal_notes: q.internal_notes || "" }); setSections((q.sections || []).map((s: any) => ({ ...s, items: (q.items || []).filter((i: any) => i.section_id === s.id).map((i: any) => ({ ...i })) }))); setPdfUrl(null); setTab("builder"); setBuilderStep("review"); }} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium"><FileText className="w-3 h-3 inline mr-1" />Edit</button>
        <button onClick={() => doWorkflowAction("submit-review")} disabled={saving} className="px-3 py-1.5 bg-brand-accent text-white rounded-lg text-xs font-medium"><Send className="w-3 h-3 inline mr-1" />Submit for Review</button></>}
        {q.status === "in_review" && <><button onClick={() => doWorkflowAction("approve")} disabled={saving} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium"><CheckCircle2 className="w-3 h-3 inline mr-1" />Approve</button>
        <button onClick={() => { const n = prompt("Rejection note:"); if (n) doWorkflowAction("reject-review", { note: n }); }} disabled={saving} className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-xs font-medium"><Ban className="w-3 h-3 inline mr-1" />Reject</button></>}
        {q.status === "approved" && <><button onClick={() => { setQuoteId(q.id); doWorkflowAction("generate-pdf"); setPdfUrl(null); }} disabled={saving} className="px-3 py-1.5 bg-brand-accent text-white rounded-lg text-xs font-medium"><Download className="w-3 h-3 inline mr-1" />Export PDF</button>
        {pdfUrl && <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium"><Eye className="w-3 h-3 inline mr-1" />Open PDF</a>}
        <button onClick={() => doWorkflowAction("send")} disabled={saving} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium"><Send className="w-3 h-3 inline mr-1" />Send Quote</button></>}
        {q.status === "sent" && <><button onClick={() => doWorkflowAction("accept")} disabled={saving} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium"><CheckCircle2 className="w-3 h-3 inline mr-1" />Accept</button>
        <button onClick={() => doWorkflowAction("reject")} disabled={saving} className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-xs font-medium"><Ban className="w-3 h-3 inline mr-1" />Reject</button>
        <button onClick={() => doWorkflowAction("expire")} disabled={saving} className="px-3 py-1.5 border border-amber-300 text-amber-600 rounded-lg text-xs font-medium"><AlertCircle className="w-3 h-3 inline mr-1" />Expire</button></>}
        {q.status === "accepted" && <button onClick={() => doWorkflowAction("convert-to-project")} disabled={saving} className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-medium"><Repeat className="w-3 h-3 inline mr-1" />Convert to Project</button>}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <SEO title="Quotes | TNA Provider" description="Professional quote builder" canonical="https://app.tnaprovider.com.au/quotes" />
      <PageHeader title="Quotes & Builder" description="Create, review, and send professional quotes" onMenuClick={() => setSidebarOpen(true)} />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {(["quotes", "builder", "templates", "sent-accepted"] as Tab[]).map((t) => (
          <button key={t} onClick={() => selectTab(t)} className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors", tab === t ? "border-brand-accent text-brand-accent" : "border-transparent text-gray-500 hover:text-gray-700")}>
            {t === "quotes" ? "Quotes" : t === "builder" ? "Builder" : t === "templates" ? "Templates" : "Sent / Accepted"}
          </button>
        ))}
      </div>

      {/* Quotes Tab */}
      {tab === "quotes" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-400">{quotes.length} total</p>
            <button onClick={createNewQuote} className="px-3 py-1.5 bg-brand-accent text-white rounded-lg text-sm font-medium"><Plus className="w-4 h-4 inline mr-1" />New Quote</button>
          </div>
          {error && <div className="bg-red-50 p-3 rounded-xl text-sm text-red-600">{error}</div>}
          {loading ? <div className="text-center py-8 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div> : (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              {quotes.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">No quotes yet. Create your first quote.</div> : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50 dark:bg-gray-800/50"><th className="text-left px-4 py-3 font-semibold text-gray-500">#</th><th className="text-left px-4 py-3 font-semibold text-gray-500">Client</th><th className="text-left px-4 py-3 font-semibold text-gray-500 hidden md:table-cell">Project</th><th className="text-left px-4 py-3 font-semibold text-gray-500">Status</th><th className="text-right px-4 py-3 font-semibold text-gray-500 hidden sm:table-cell">Total</th><th className="text-right px-4 py-3 font-semibold text-gray-500">Actions</th></tr></thead>
                  <tbody>{quotes.map((q) => (
                    <tr key={q.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-mono text-xs">{q.quote_number}</td>
                      <td className="px-4 py-3 font-medium">{q.client_name || "-"}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600 max-w-[200px] truncate">{q.project_name || q.title || "-"}</td>
                      <td className="px-4 py-3"><span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-semibold", STATUS_COLORS[q.status])}>{STATUS_LABELS[q.status] || q.status}</span></td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell font-mono">{fmtMoney(q.total || 0)}</td>
                      <td className="px-4 py-3 text-right"><button onClick={() => { setSelectedQuote(q); setQuoteId(q.id); setPdfUrl(null); }} className="text-brand-accent text-xs hover:underline"><Eye className="w-3 h-3 inline mr-1" />View</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          )}

          {/* Quote detail + workflow */}
          {selectedQuote && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div><h3 className="font-bold text-lg">{selectedQuote.client_name || "Quote"}</h3><p className="text-sm text-gray-400">{selectedQuote.quote_number}</p></div>
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", STATUS_COLORS[selectedQuote.status])}>{STATUS_LABELS[selectedQuote.status]}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-gray-400">Client</span><p>{selectedQuote.client_name}{selectedQuote.client_company ? ` (${selectedQuote.client_company})` : ""}</p></div>
                <div><span className="text-gray-400">Project</span><p>{selectedQuote.project_name || "-"}</p></div>
                <div><span className="text-gray-400">Total</span><p className="font-bold">{fmtMoney(selectedQuote.total || 0)}</p></div>
                <div><span className="text-gray-400">Date</span><p>{fmtDate(selectedQuote.created_at)}</p></div>
              </div>
              <div className="border-t pt-4">{renderWorkflowActions(selectedQuote)}</div>
              {pdfUrl && (selectedQuote.status === "approved" || selectedQuote.status === "sent") && (
                <div className="border-t pt-4"><a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-brand-accent text-sm hover:underline"><FileText className="w-4 h-4 inline mr-1" />Open PDF</a></div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Builder Tab */}
      {tab === "builder" && (
        <div className="max-w-4xl mx-auto space-y-4">
          {renderBuilderStepNav()}
          {error && <div className="bg-red-50 p-3 rounded-xl text-sm text-red-600">{error}</div>}
          {builderStep === "client" && renderClientStep()}
          {builderStep === "project" && renderProjectStep()}
          {builderStep === "scope" && renderScopeStep()}
          {builderStep === "items" && renderItemsStep()}
          {builderStep === "terms" && renderTermsStep()}
          {builderStep === "review" && renderReviewStep()}
          {builderStep === "pdf" && renderPdfStep()}
          {builderStep !== "review" && builderStep !== "pdf" && (
            <div className="flex justify-between pt-4">
              <button onClick={() => { const idx = BUILDER_STEPS.findIndex((s) => s.key === builderStep); if (idx > 0) setBuilderStep(BUILDER_STEPS[idx - 1].key); }} className="px-4 py-2 border rounded-lg text-sm">Back</button>
              <button onClick={() => { const idx = BUILDER_STEPS.findIndex((s) => s.key === builderStep); if (idx < BUILDER_STEPS.length - 1) setBuilderStep(BUILDER_STEPS[idx + 1].key); }} className="px-4 py-2 bg-brand-accent text-white rounded-lg text-sm">Next</button>
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {tab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.length === 0 && <p className="text-sm text-gray-400 col-span-full text-center py-8">No templates available.</p>}
          {templates.map((tpl) => (
            <div key={tpl.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-3 hover:shadow-md transition-shadow">
              <h3 className="font-bold">{tpl.name}</h3>
              <p className="text-xs text-gray-400">{tpl.items?.length || 0} line items</p>
              {tpl.items?.slice(0, 4).map((item: any, i: number) => <p key={i} className="text-xs text-gray-500">• {item.description}</p>)}
              <button onClick={() => startFromTemplate(tpl.id)} className="w-full py-2 bg-brand-accent/10 text-brand-accent rounded-lg text-sm font-medium hover:bg-brand-accent/20 transition-colors">Start from Template</button>
            </div>
          ))}
        </div>
      )}

      {/* Sent / Accepted Tab */}
      {tab === "sent-accepted" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {renderSummaryCard("Sent", quotes.filter((q) => q.status === "sent").length, "sent")}
            {renderSummaryCard("Accepted", quotes.filter((q) => q.status === "accepted").length, "accepted")}
            {renderSummaryCard("Rejected", quotes.filter((q) => q.status === "rejected").length, "rejected")}
            {renderSummaryCard("Converted", quotes.filter((q) => q.status === "converted").length, "converted")}
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {quotes.filter((q) => ["sent", "accepted", "rejected", "converted"].includes(q.status)).length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No sent or accepted quotes yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50 dark:bg-gray-800/50"><th className="text-left px-4 py-3 font-semibold text-gray-500">#</th><th className="text-left px-4 py-3 font-semibold text-gray-500">Client</th><th className="text-left px-4 py-3 font-semibold text-gray-500">Status</th><th className="text-right px-4 py-3 font-semibold text-gray-500">Total</th></tr></thead>
                <tbody>{quotes.filter((q) => ["sent", "accepted", "rejected", "converted"].includes(q.status)).map((q) => (
                  <tr key={q.id} className="border-b hover:bg-gray-50"><td className="px-4 py-3 font-mono text-xs">{q.quote_number}</td><td className="px-4 py-3">{q.client_name || "-"}</td><td className="px-4 py-3"><span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-semibold", STATUS_COLORS[q.status])}>{STATUS_LABELS[q.status]}</span></td><td className="px-4 py-3 text-right font-mono">{fmtMoney(q.total || 0)}</td></tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Print CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 210mm; padding: 15mm; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
}
