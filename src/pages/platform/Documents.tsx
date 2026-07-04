import { useState, useEffect } from "react";
import { SEO } from "../../components/SEO";
import {
  FileText,
  Folder,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  Loader2,
  FilePlus,
  FileOutput,
  FileSignature,
  Printer,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";

type Visibility = "internal" | "client";
type EntityType = "lead" | "project" | "quote" | "client" | "general";

interface Folder {
  id: string;
  name: string;
}

interface Document {
  id: string;
  title: string;
  entity_type: EntityType;
  entity_id: string | null;
  folder_id: string | null;
  visibility: Visibility;
  description: string;
  file_name: string;
  file_size: number | null;
  uploaded_by: string;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

interface ProposalTemplate {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface Proposal {
  id: string;
  title: string;
  template_id: string | null;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const ENTITY_TYPES: EntityType[] = ["lead", "project", "quote", "client", "general"];

function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  const styles: Record<Visibility, string> = {
    internal: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    client: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[visibility]}`}>
      {visibility === "internal" ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
      {visibility}
    </span>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Documents() {
  const [tab, setTab] = useState<"documents" | "proposals">("documents");

  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [entityFilter, setEntityFilter] = useState("");
  const [folderFilter, setFolderFilter] = useState("");
  const [docSearch, setDocSearch] = useState("");

  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [docForm, setDocForm] = useState({
    title: "",
    entity_type: "general" as EntityType,
    entity_id: "",
    folder_id: "",
    visibility: "internal" as Visibility,
    description: "",
    file_name: "",
  });
  const [docSubmitting, setDocSubmitting] = useState(false);
  const [docFormError, setDocFormError] = useState("");

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: "", content: "" });
  const [templateSubmitting, setTemplateSubmitting] = useState(false);
  const [templateFormError, setTemplateFormError] = useState("");

  const [showProposalModal, setShowProposalModal] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [proposalForm, setProposalForm] = useState({ title: "", template_id: "", content: "" });
  const [proposalSubmitting, setProposalSubmitting] = useState(false);
  const [proposalFormError, setProposalFormError] = useState("");

  const [previewProposal, setPreviewProposal] = useState<Proposal | null>(null);

  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [docRes, folderRes, tmplRes, propRes] = await Promise.all([
        fetch("/api/documents", { credentials: "include" }),
        fetch("/api/documents/folders", { credentials: "include" }),
        fetch("/api/documents/proposal-templates", { credentials: "include" }),
        fetch("/api/documents/proposals", { credentials: "include" }),
      ]);
      if (docRes.ok) setDocuments(await docRes.json());
      if (folderRes.ok) setFolders(await folderRes.json());
      if (tmplRes.ok) setTemplates(await tmplRes.json());
      if (propRes.ok) setProposals(await propRes.json());
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filteredDocs = documents.filter((d) => {
    if (entityFilter && d.entity_type !== entityFilter) return false;
    if (folderFilter && d.folder_id !== folderFilter) return false;
    if (docSearch && !d.title.toLowerCase().includes(docSearch.toLowerCase())) return false;
    return true;
  });

  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocFormError("");
    setDocSubmitting(true);
    try {
      const body = { ...docForm, entity_id: docForm.entity_id || null, folder_id: docForm.folder_id || null };
      if (editingDoc) {
        const res = await fetch(`/api/documents/${editingDoc.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update document");
        }
      } else {
        const res = await fetch("/api/documents", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create document");
        }
      }
      setShowDocModal(false);
      setEditingDoc(null);
      setDocForm({ title: "", entity_type: "general", entity_id: "", folder_id: "", visibility: "internal", description: "", file_name: "" });
      fetchAll();
    } catch (err) {
      setDocFormError(err instanceof Error ? err.message : "Failed to save document");
    } finally {
      setDocSubmitting(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm("Delete this document metadata?")) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      } else {
        setError("Failed to delete document");
      }
    } catch {
      setError("Failed to delete document");
    }
  };

  const openEditDoc = (doc: Document) => {
    setEditingDoc(doc);
    setDocForm({
      title: doc.title,
      entity_type: doc.entity_type,
      entity_id: doc.entity_id || "",
      folder_id: doc.folder_id || "",
      visibility: doc.visibility,
      description: doc.description || "",
      file_name: doc.file_name || "",
    });
    setShowDocModal(true);
  };

  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTemplateFormError("");
    setTemplateSubmitting(true);
    try {
      const res = await fetch("/api/documents/proposal-templates", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create template");
      }
      setShowTemplateModal(false);
      setTemplateForm({ name: "", content: "" });
      fetchAll();
    } catch (err) {
      setTemplateFormError(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setTemplateSubmitting(false);
    }
  };

  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProposalFormError("");
    setProposalSubmitting(true);
    try {
      const body = { ...proposalForm, template_id: proposalForm.template_id || null };
      if (editingProposal) {
        const res = await fetch(`/api/documents/proposals/${editingProposal.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update proposal");
        }
      } else {
        const res = await fetch("/api/documents/proposals", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create proposal");
        }
      }
      setShowProposalModal(false);
      setEditingProposal(null);
      setProposalForm({ title: "", template_id: "", content: "" });
      fetchAll();
    } catch (err) {
      setProposalFormError(err instanceof Error ? err.message : "Failed to save proposal");
    } finally {
      setProposalSubmitting(false);
    }
  };

  const openEditProposal = (proposal: Proposal) => {
    setEditingProposal(proposal);
    setProposalForm({
      title: proposal.title,
      template_id: proposal.template_id || "",
      content: proposal.content,
    });
    setShowProposalModal(true);
  };

  const proposalPreviewContent = previewProposal ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => setPreviewProposal(null)} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white">{previewProposal.title}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-2 text-gray-400 hover:text-brand-accent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Print"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={() => setPreviewProposal(null)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
          {previewProposal.content}
        </div>
      </div>
    </div>
  ) : null;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <SEO title="Documents | TNA Provider Platform" description="Document management and proposals." canonical="https://tnaprovider.com.au/platform/documents" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-dark dark:text-white mb-1">Documents</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage documents, templates, and proposals</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white dark:bg-gray-900 rounded-xl p-1 border border-gray-100 dark:border-gray-800 w-fit">
        <button
          onClick={() => setTab("documents")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === "documents" ? "bg-brand-accent text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-brand-dark dark:hover:text-white"}`}
        >
          <FileText className="w-4 h-4 inline mr-1.5" />
          Documents
        </button>
        <button
          onClick={() => setTab("proposals")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === "proposals" ? "bg-brand-accent text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-brand-dark dark:hover:text-white"}`}
        >
          <FileSignature className="w-4 h-4 inline mr-1.5" />
          Proposals
        </button>
      </div>

      {/* ===== DOCUMENTS TAB ===== */}
      {tab === "documents" && (
        <div>
          {/* Filter bar + add button */}
          <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 md:p-6">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[160px] flex-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="Search by title..."
                    className="w-full pl-9 pr-3 h-10 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent"
                  />
                </div>
              </div>
              <div className="min-w-[140px]">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Entity Type</label>
                <select
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent"
                >
                  <option value="">All Types</option>
                  {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div className="min-w-[140px]">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Folder</label>
                <select
                  value={folderFilter}
                  onChange={(e) => setFolderFilter(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent"
                >
                  <option value="">All Folders</option>
                  {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <button
                onClick={() => { setEditingDoc(null); setDocForm({ title: "", entity_type: "general", entity_id: "", folder_id: "", visibility: "internal", description: "", file_name: "" }); setShowDocModal(true); }}
                className="h-10 px-4 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent-hover transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Document
              </button>
            </div>
          </div>

          {/* Document table */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="text-left px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entity</th>
                    <th className="text-left px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Visibility</th>
                    <th className="text-left px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploaded By</th>
                    <th className="text-left px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-right px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                        No documents found.
                      </td>
                    </tr>
                  )}
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-brand-dark dark:text-white truncate">{doc.title}</p>
                            {doc.description && <p className="text-xs text-gray-400 truncate">{doc.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <span className="text-sm capitalize text-gray-600 dark:text-gray-400">{doc.entity_type}</span>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <VisibilityBadge visibility={doc.visibility} />
                      </td>
                      <td className="px-4 md:px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{doc.uploaded_by}</td>
                      <td className="px-4 md:px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{new Date(doc.uploaded_at || doc.created_at).toLocaleDateString()}</td>
                      <td className="px-4 md:px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditDoc(doc)}
                            className="p-2 text-gray-400 hover:text-brand-accent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== PROPOSALS TAB ===== */}
      {tab === "proposals" && (
        <div className="space-y-8">
          {/* Templates section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white flex items-center gap-2">
                <FileOutput className="w-5 h-5 text-brand-accent" />
                Proposal Templates
              </h2>
              <button
                onClick={() => { setTemplateForm({ name: "", content: "" }); setShowTemplateModal(true); }}
                className="h-9 px-3 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent-hover transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                New Template
              </button>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              {templates.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No proposal templates yet.</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {templates.map((tmpl) => (
                    <div key={tmpl.id}>
                      <button
                        onClick={() => setExpandedTemplate(expandedTemplate === tmpl.id ? null : tmpl.id)}
                        className="w-full flex items-center justify-between px-4 md:px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-brand-dark dark:text-white">{tmpl.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Updated {new Date(tmpl.updated_at).toLocaleDateString()}</p>
                        </div>
                        {expandedTemplate === tmpl.id ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                      </button>
                      {expandedTemplate === tmpl.id && (
                        <div className="px-4 md:px-6 pb-4">
                          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{tmpl.content}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Proposals section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-brand-accent" />
                Proposals
              </h2>
              <button
                onClick={() => { setEditingProposal(null); setProposalForm({ title: "", template_id: "", content: "" }); setShowProposalModal(true); }}
                className="h-9 px-3 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent-hover transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                New Proposal
              </button>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="text-left px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Template</th>
                      <th className="text-left px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Updated</th>
                      <th className="text-right px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposals.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                          <FileSignature className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                          No proposals yet.
                        </td>
                      </tr>
                    )}
                    {proposals.map((prop) => {
                      const tmpl = templates.find((t) => t.id === prop.template_id);
                      return (
                        <tr key={prop.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="px-4 md:px-6 py-4 text-sm font-medium text-brand-dark dark:text-white">{prop.title}</td>
                          <td className="px-4 md:px-6 py-4 text-sm text-gray-500">{tmpl?.name || "—"}</td>
                          <td className="px-4 md:px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                              {prop.status || "draft"}
                            </span>
                          </td>
                          <td className="px-4 md:px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{new Date(prop.updated_at).toLocaleDateString()}</td>
                          <td className="px-4 md:px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setPreviewProposal(prop)}
                                className="p-2 text-gray-400 hover:text-brand-accent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                title="Preview"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openEditProposal(prop)}
                                className="p-2 text-gray-400 hover:text-brand-accent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== DOCUMENT MODAL ===== */}
      <Modal open={showDocModal} onClose={() => setShowDocModal(false)} title={editingDoc ? "Edit Document Metadata" : "Add Document Metadata"}>
        {docFormError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{docFormError}</p>
          </div>
        )}
        <form onSubmit={handleDocSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Title *</label>
            <input type="text" value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} required className="mt-1 h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</label>
            <textarea value={docForm.description} onChange={(e) => setDocForm({ ...docForm, description: e.target.value })} rows={3} className="mt-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Entity Type *</label>
              <select value={docForm.entity_type} onChange={(e) => setDocForm({ ...docForm, entity_type: e.target.value as EntityType })} className="mt-1 h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full">
                {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Visibility *</label>
              <select value={docForm.visibility} onChange={(e) => setDocForm({ ...docForm, visibility: e.target.value as Visibility })} className="mt-1 h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full">
                <option value="internal">Internal</option>
                <option value="client">Client</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Entity ID</label>
              <input type="text" value={docForm.entity_id} onChange={(e) => setDocForm({ ...docForm, entity_id: e.target.value })} className="mt-1 h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Folder</label>
              <select value={docForm.folder_id} onChange={(e) => setDocForm({ ...docForm, folder_id: e.target.value })} className="mt-1 h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full">
                <option value="">None</option>
                {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">File Name (reference only)</label>
            <input type="text" value={docForm.file_name} onChange={(e) => setDocForm({ ...docForm, file_name: e.target.value })} placeholder="e.g. scope-of-work-v2.pdf" className="mt-1 h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={docSubmitting} className="h-11 px-6 bg-brand-accent text-white rounded-lg font-medium hover:bg-brand-accent-hover disabled:opacity-50 transition-colors flex items-center gap-2 min-h-[44px]">
              {docSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus className="w-4 h-4" />}
              {docSubmitting ? "Saving..." : editingDoc ? "Update" : "Create"}
            </button>
            <button type="button" onClick={() => setShowDocModal(false)} className="h-11 px-6 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* ===== TEMPLATE MODAL ===== */}
      <Modal open={showTemplateModal} onClose={() => setShowTemplateModal(false)} title="New Proposal Template">
        {templateFormError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{templateFormError}</p>
          </div>
        )}
        <form onSubmit={handleTemplateSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Template Name *</label>
            <input type="text" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} required className="mt-1 h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Content *</label>
            <textarea value={templateForm.content} onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })} required rows={10} className="mt-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full resize-none font-mono text-sm" placeholder="Write your proposal template content here. Use {{placeholders}} as needed." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={templateSubmitting} className="h-11 px-6 bg-brand-accent text-white rounded-lg font-medium hover:bg-brand-accent-hover disabled:opacity-50 transition-colors flex items-center gap-2 min-h-[44px]">
              {templateSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus className="w-4 h-4" />}
              {templateSubmitting ? "Saving..." : "Create Template"}
            </button>
            <button type="button" onClick={() => setShowTemplateModal(false)} className="h-11 px-6 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* ===== PROPOSAL MODAL ===== */}
      <Modal open={showProposalModal} onClose={() => setShowProposalModal(false)} title={editingProposal ? "Edit Proposal" : "New Proposal"}>
        {proposalFormError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{proposalFormError}</p>
          </div>
        )}
        <form onSubmit={handleProposalSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Proposal Title *</label>
            <input type="text" value={proposalForm.title} onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })} required className="mt-1 h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Template</label>
            <select value={proposalForm.template_id} onChange={(e) => setProposalForm({ ...proposalForm, template_id: e.target.value })} className="mt-1 h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full">
              <option value="">None (blank)</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Content *</label>
            <textarea value={proposalForm.content} onChange={(e) => setProposalForm({ ...proposalForm, content: e.target.value })} required rows={10} className="mt-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full resize-none font-mono text-sm" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={proposalSubmitting} className="h-11 px-6 bg-brand-accent text-white rounded-lg font-medium hover:bg-brand-accent-hover disabled:opacity-50 transition-colors flex items-center gap-2 min-h-[44px]">
              {proposalSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
              {proposalSubmitting ? "Saving..." : editingProposal ? "Update" : "Create"}
            </button>
            <button type="button" onClick={() => setShowProposalModal(false)} className="h-11 px-6 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Proposal preview overlay */}
      {proposalPreviewContent}

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .fixed.inset-0.z-50 { position: fixed; inset: 0; z-index: 9999; }
          .fixed.inset-0.z-50,
          .fixed.inset-0.z-50 * { visibility: visible; }
          .fixed.inset-0.z-50 .absolute.inset-0 { display: none; }
          .fixed.inset-0.z-50 .relative { box-shadow: none !important; border: none !important; max-height: none !important; }
          @page { margin: 20mm; }
        }
      `}</style>
    </div>
  );
}
