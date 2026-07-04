import type { CapabilityStatement } from "../../data/capabilityStatements";
import { Button } from "../ui/Button";
import { FileText, Download, Upload, CheckCircle2 } from "lucide-react";

interface Props {
  capability: CapabilityStatement;
}

export function CapabilityCard({ capability }: Props) {
  const handleDownload = () => {
    if (!capability.pdfAvailable) return;
    window.open(capability.pdfPath, "_blank");
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent flex-shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-brand-accent uppercase tracking-wider">
              {capability.sector}
            </span>
            <h3 className="text-2xl font-display font-bold text-brand-dark dark:text-white mt-1">
              {capability.title}
            </h3>
          </div>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          {capability.description}
        </p>

        <div className="mb-6">
          <h4 className="text-sm font-semibold text-brand-dark dark:text-white mb-3">What We Deliver</h4>
          <ul className="flex flex-col gap-2">
            {capability.deliverables.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-brand-accent mt-0.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="text-sm font-semibold text-brand-dark dark:text-white mb-2">Best-Fit Clients</h4>
            <ul className="flex flex-col gap-1">
              {capability.bestFitClients.map((client, i) => (
                <li key={i} className="text-sm text-gray-500 dark:text-gray-400">• {client}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-brand-dark dark:text-white mb-2">Typical Scope</h4>
            <ul className="flex flex-col gap-1">
              {capability.typicalScope.map((scope, i) => (
                <li key={i} className="text-sm text-gray-500 dark:text-gray-400">• {scope}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleDownload}
            disabled={!capability.pdfAvailable}
          >
            <Download className="w-4 h-4 mr-2" />
            {capability.pdfAvailable ? "Download Capability Statement" : "Coming Soon"}
          </Button>
          {!capability.pdfAvailable && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              Capability statement coming soon. Contact TNA for the latest profile.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="primary" size="sm" onClick={() => window.location.href = "/contact"}>
              Request Quote
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.location.href = "/tools/tender-upload"}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Drawings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
