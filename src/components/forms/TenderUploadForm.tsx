import { useState, useRef } from "react";
import { Button } from "../ui/Button";
import { Upload, X, FileText, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/vnd.dwg",
  "application/x-dxf",
  "application/zip",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/x-rvt",
  "application/x-ifc",
];

const ALLOWED_EXTENSIONS = ".pdf,.dwg,.dxf,.zip,.jpg,.jpeg,.png,.webp,.rvt,.ifc";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_TOTAL_SIZE = 100 * 1024 * 1024;
const MAX_FILES = 10;

const PROJECT_TYPES = [
  "Kitchen joinery",
  "Retail fitout",
  "Hospitality fitout",
  "Office fitout",
  "Medical fitout",
  "Custom joinery",
  "Shopfitting",
  "Commercial construction",
] as const;

interface UploadedFile {
  file: File;
  id: string;
}

interface FormState {
  name: string;
  company: string;
  email: string;
  phone: string;
  projectName: string;
  projectLocation: string;
  tenderDeadline: string;
  projectType: string;
  scopeNotes: string;
  privacyConsent: boolean;
}

const defaultForm: FormState = {
  name: "",
  company: "",
  email: "",
  phone: "",
  projectName: "",
  projectLocation: "",
  tenderDeadline: "",
  projectType: "",
  scopeNotes: "",
  privacyConsent: false,
};

export function TenderUploadForm() {
  const [formData, setFormData] = useState<FormState>(defaultForm);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "files", string>>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSize = uploadedFiles.reduce((sum, f) => sum + f.file.size, 0);

  const processFiles = (files: File[]) => {
    const newErrors: string[] = [];
    const newFiles: UploadedFile[] = [];
    let runningTotalSize = totalSize;

    if (uploadedFiles.length + files.length > MAX_FILES) {
      setErrors(prev => ({ ...prev, files: `Maximum ${MAX_FILES} files allowed` }));
      return;
    }

    for (const file of files) {
      const extensionAllowed = ALLOWED_EXTENSIONS
        .split(",")
        .some(ext => file.name.toLowerCase().endsWith(ext));
      const typeAllowed = ALLOWED_TYPES.includes(file.type);

      if (!typeAllowed && !extensionAllowed) {
        newErrors.push(`${file.name}: File type not supported`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        newErrors.push(`${file.name}: File exceeds 20MB limit`);
        continue;
      }

      if (runningTotalSize + file.size > MAX_TOTAL_SIZE) {
        newErrors.push(`${file.name}: Total upload would exceed 100MB limit`);
        continue;
      }

      runningTotalSize += file.size;
      newFiles.push({ file, id: `${file.name}-${Date.now()}-${Math.random()}` });
    }

    if (newErrors.length > 0) {
      setErrors(prev => ({ ...prev, files: newErrors.join(". ") }));
    } else {
      setErrors(prev => ({ ...prev, files: "" }));
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
    if (errors[name as keyof FormState]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processFiles(Array.from(files));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState | "files", string>> = {};
    if (!formData.name) newErrors.name = "Required";
    if (!formData.company) newErrors.company = "Required";
    if (!formData.email) {
      newErrors.email = "Required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email";
    }
    if (!formData.phone) {
      newErrors.phone = "Required";
    } else if (!/^[\d\s+()-]{8,20}$/.test(formData.phone)) {
      newErrors.phone = "Invalid phone";
    }
    if (!formData.projectName) newErrors.projectName = "Required";
    if (!formData.projectLocation) newErrors.projectLocation = "Required";
    if (!formData.projectType) newErrors.projectType = "Required";
    if (!formData.privacyConsent) newErrors.privacyConsent = "Required";
    if (uploadedFiles.length === 0) newErrors.files = "Please upload at least one file";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formPayload = new FormData();
      formPayload.append("name", formData.name);
      formPayload.append("company", formData.company);
      formPayload.append("email", formData.email);
      formPayload.append("phone", formData.phone);
      formPayload.append("projectName", formData.projectName);
      formPayload.append("projectLocation", formData.projectLocation);
      formPayload.append("tenderDeadline", formData.tenderDeadline);
      formPayload.append("projectType", formData.projectType);
      formPayload.append("scopeNotes", formData.scopeNotes);
      uploadedFiles.forEach(f => formPayload.append("files", f.file));

      const response = await fetch("/api/tender-upload", {
        method: "POST",
        body: formPayload,
      });

      if (!response.ok) {
        throw new Error("Upload endpoint not available");
      }

      setIsSubmitted(true);
      setUploadedFiles([]);
      setFormData(defaultForm);
    } catch {
      setSubmitError(
        "Your tender request has been prepared. If upload storage is not connected yet, please also email drawings to info@tnaprovider.com.au with your project name."
      );
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(defaultForm);
    setUploadedFiles([]);
    setErrors({});
    setSubmitError(null);
    setIsSubmitted(false);
  };

  const inputClass = (field: keyof FormState) =>
    `h-12 px-4 rounded-lg border ${errors[field] ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent"} bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors w-full`;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isSubmitted) {
    return (
      <div className="bg-white dark:bg-gray-900 p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 max-w-2xl mx-auto">
        <div className="flex flex-col items-center text-center py-8">
          {submitError ? (
            <>
              <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
              <h3 className="text-2xl font-display font-bold text-brand-dark dark:text-white mb-4">Tender Request Prepared</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{submitError}</p>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
              <h3 className="text-2xl font-display font-bold text-brand-dark dark:text-white mb-4">Tender Uploaded Successfully</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your tender documents have been received. Our team will review and contact you shortly.
              </p>
            </>
          )}
          <div className="flex gap-4">
            <Button onClick={handleReset}>Submit Another Tender</Button>
            <Button variant="outline" onClick={() => window.location.href = "/"}>Return Home</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Upload className="w-6 h-6 text-brand-accent" />
        <h3 className="text-2xl font-display font-bold text-brand-dark dark:text-white">
          Upload Tender Documents
        </h3>
      </div>

      {submitError && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Name <span className="text-red-500">*</span></label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" className={inputClass("name")} />
            {errors.name && <span className="text-xs text-red-500">{errors.name}</span>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Company <span className="text-red-500">*</span></label>
            <input type="text" name="company" value={formData.company} onChange={handleChange} placeholder="Company Pty Ltd" className={inputClass("company")} />
            {errors.company && <span className="text-xs text-red-500">{errors.company}</span>}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Email <span className="text-red-500">*</span></label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" className={inputClass("email")} />
            {errors.email && <span className="text-xs text-red-500">{errors.email}</span>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Phone <span className="text-red-500">*</span></label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="0406 409 668" className={inputClass("phone")} />
            {errors.phone && <span className="text-xs text-red-500">{errors.phone}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Project Name <span className="text-red-500">*</span></label>
          <input type="text" name="projectName" value={formData.projectName} onChange={handleChange} placeholder="e.g. Sydney CBD Retail Fitout" className={inputClass("projectName")} />
          {errors.projectName && <span className="text-xs text-red-500">{errors.projectName}</span>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Project Location <span className="text-red-500">*</span></label>
            <input type="text" name="projectLocation" value={formData.projectLocation} onChange={handleChange} placeholder="North Sydney, NSW" className={inputClass("projectLocation")} />
            {errors.projectLocation && <span className="text-xs text-red-500">{errors.projectLocation}</span>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tender Deadline</label>
            <input type="date" name="tenderDeadline" value={formData.tenderDeadline} onChange={handleChange} className={inputClass("tenderDeadline")} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Project Type <span className="text-red-500">*</span></label>
          <select name="projectType" value={formData.projectType} onChange={handleChange} className={inputClass("projectType")}>
            <option value="">Select project type...</option>
            {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.projectType && <span className="text-xs text-red-500">{errors.projectType}</span>}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Scope Notes</label>
          <textarea name="scopeNotes" value={formData.scopeNotes} onChange={handleChange} rows={4} placeholder="Describe the scope of work..." className={`p-4 rounded-lg border border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors resize-none w-full`} />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Upload Drawings & Documents
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-brand-accent bg-brand-accent/5"
                : "border-gray-300 dark:border-gray-700 hover:border-brand-accent"
            }`}
          >
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {isDragging ? "Drop files here" : "Click to upload or drag and drop"}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              PDF, DWG, DXF, ZIP, JPG, PNG, WEBP, RVT, IFC (max 20MB each)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="px-4 py-2 min-h-[44px] bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent-hover cursor-pointer inline-flex items-center gap-2">
              <span>📷</span> Take Photo
              <input type="file" accept="image/*" capture="environment" onChange={handleFileAdd} className="hidden" />
            </label>
            <label className="px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-2">
              <span>📎</span> Choose Files
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ALLOWED_EXTENSIONS}
                onChange={handleFileAdd}
                className="hidden"
              />
            </label>
          </div>
          {errors.files && <span className="text-xs text-red-500">{errors.files}</span>}
        </div>

        {uploadedFiles.length > 0 && (
          <div className="flex flex-col gap-2 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {uploadedFiles.length} file(s) selected
              </span>
              <span className="text-xs text-gray-500">
                Total: {formatSize(totalSize)}
              </span>
            </div>
            {uploadedFiles.map(f => (
              <div key={f.id} className="flex items-center justify-between bg-white dark:bg-gray-800 px-3 py-2 rounded border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-brand-accent flex-shrink-0" />
                  <span className="text-sm truncate">{f.file.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">({formatSize(f.file.size)})</span>
                </div>
                <button type="button" onClick={() => removeFile(f.id)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 ml-2">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="privacyConsent"
            name="privacyConsent"
            checked={formData.privacyConsent}
            onChange={handleChange}
            className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand-accent focus:ring-brand-accent"
          />
          <label htmlFor="privacyConsent" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            I confirm that I have the right to share these documents and agree to the{" "}
            <a href="/privacy-policy" target="_blank" className="text-brand-accent hover:underline">Privacy Policy</a>.
          </label>
        </div>
        {errors.privacyConsent && <span className="text-xs text-red-500">{errors.privacyConsent}</span>}

        <Button type="submit" size="lg" className="w-full mt-2" disabled={isSubmitting}>
          {isSubmitting ? "Uploading..." : "Submit Tender"}
        </Button>
      </form>
    </div>
  );
}
