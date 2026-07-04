export function HeidiCreditBadge({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] leading-none border-slate-200 bg-white/80 text-slate-600 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 ${compact ? "max-w-full" : ""}`}
      aria-label="TNA Provider copyright and design license credit"
    >
      <span className="truncate">
        &copy; 2026 TNA Provider &middot; Designed &amp; licensed by{" "}
        <a
          href="https://github.com/heidi-dang"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-slate-800 underline-offset-2 hover:underline dark:text-slate-100"
        >
          heidi-dang
        </a>
      </span>
    </div>
  );
}
