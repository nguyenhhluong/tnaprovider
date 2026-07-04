export function formatEmailAddress(address: { name?: string; email: string }): string {
  if (address.name) return `${address.name} <${address.email}>`;
  return address.email;
}

export function parseEmailAddresses(raw: string): { name?: string; email: string }[] {
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^"?(.+?)"?\s*<(.+?)>$/);
      if (match) return { name: match[1].trim(), email: match[2].trim() };
      return { email: part };
    });
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sanitizeEmailHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/on\w+=\S+/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/<iframe\b[^>]*>/gi, "")
    .replace(/<\/iframe>/gi, "")
    .replace(/<object\b[^>]*>/gi, "")
    .replace(/<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/<\/embed>/gi, "");
}

export function truncatePreview(text: string, maxLength = 100): string {
  if (!text) return "";
  const cleaned = text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength).trimEnd() + "...";
}

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}
