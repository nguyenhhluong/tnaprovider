import { useState } from "react";
import { Button } from "../ui/Button";
import { predictTimeline } from "../../utils/timeline";
import type { TimelineInput, TimelineResult } from "../../types/timeline";
import { CalendarDays, AlertTriangle, Clock } from "lucide-react";

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

const PROJECT_SIZES = ["Small", "Medium", "Large", "Extra Large"] as const;

const MATERIAL_GRADES = ["Budget", "Premium", "Luxury"] as const;

const ACCESS_DIFFICULTY = ["Easy", "Moderate", "Difficult"] as const;

const defaultInput: TimelineInput = {
  projectType: "",
  projectSize: "",
  hasDrawings: false,
  needsCouncilApproval: false,
  materialGrade: "",
  desiredCompletionDate: "",
  siteAccessDifficulty: "",
  afterHoursRequired: false,
};

export function TimelinePredictorForm() {
  const [formData, setFormData] = useState<TimelineInput>(defaultInput);
  const [result, setResult] = useState<TimelineResult | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof TimelineInput, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof TimelineInput, string>> = {};
    if (!formData.projectType) newErrors.projectType = "Required";
    if (!formData.projectSize) newErrors.projectSize = "Required";
    if (!formData.materialGrade) newErrors.materialGrade = "Required";
    if (!formData.siteAccessDifficulty) newErrors.siteAccessDifficulty = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
    setResult(null);
    if (errors[name as keyof TimelineInput]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const prediction = predictTimeline(formData);
    setResult(prediction);
  };

  const handleReset = () => {
    setFormData(defaultInput);
    setResult(null);
    setErrors({});
  };

  const inputClass = (field: keyof TimelineInput) =>
    `h-12 px-4 rounded-lg border ${errors[field] ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent"} bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors w-full`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
      <div className="bg-white dark:bg-gray-900 p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-8">
          <CalendarDays className="w-6 h-6 text-brand-accent" />
          <h3 className="text-2xl font-display font-bold text-brand-dark dark:text-white">
            Project Timeline
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Project Type <span className="text-red-500">*</span>
            </label>
            <select name="projectType" value={formData.projectType} onChange={handleChange} className={inputClass("projectType")}>
              <option value="">Select project type...</option>
              {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.projectType && <span className="text-xs text-red-500">{errors.projectType}</span>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Project Size <span className="text-red-500">*</span>
            </label>
            <select name="projectSize" value={formData.projectSize} onChange={handleChange} className={inputClass("projectSize")}>
              <option value="">Select size...</option>
              {PROJECT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.projectSize && <span className="text-xs text-red-500">{errors.projectSize}</span>}
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <input type="checkbox" id="hasDrawings" name="hasDrawings" checked={formData.hasDrawings} onChange={handleChange} className="w-5 h-5 rounded border-gray-300 text-brand-accent focus:ring-brand-accent" />
            <label htmlFor="hasDrawings" className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
              Drawings ready
            </label>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <input type="checkbox" id="needsCouncilApproval" name="needsCouncilApproval" checked={formData.needsCouncilApproval} onChange={handleChange} className="w-5 h-5 rounded border-gray-300 text-brand-accent focus:ring-brand-accent" />
            <label htmlFor="needsCouncilApproval" className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
              Needs council/strata approval
            </label>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Material Grade <span className="text-red-500">*</span>
            </label>
            <select name="materialGrade" value={formData.materialGrade} onChange={handleChange} className={inputClass("materialGrade")}>
              <option value="">Select grade...</option>
              {MATERIAL_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            {errors.materialGrade && <span className="text-xs text-red-500">{errors.materialGrade}</span>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Desired Completion Date
            </label>
            <input type="date" name="desiredCompletionDate" value={formData.desiredCompletionDate} onChange={handleChange} className={inputClass("desiredCompletionDate")} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Site Access Difficulty <span className="text-red-500">*</span>
            </label>
            <select name="siteAccessDifficulty" value={formData.siteAccessDifficulty} onChange={handleChange} className={inputClass("siteAccessDifficulty")}>
              <option value="">Select difficulty...</option>
              {ACCESS_DIFFICULTY.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {errors.siteAccessDifficulty && <span className="text-xs text-red-500">{errors.siteAccessDifficulty}</span>}
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <input type="checkbox" id="afterHoursRequired" name="afterHoursRequired" checked={formData.afterHoursRequired} onChange={handleChange} className="w-5 h-5 rounded border-gray-300 text-brand-accent focus:ring-brand-accent" />
            <label htmlFor="afterHoursRequired" className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
              After-hours work required
            </label>
          </div>
          <div className="flex gap-4 mt-2">
            <Button type="submit" size="lg" className="flex-1">
              Predict Timeline
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </form>
      </div>
      <div className="flex flex-col gap-8">
        {result ? (
          <>
            {result.warning && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">{result.warning}</p>
              </div>
            )}
            <div className="bg-white dark:bg-gray-900 p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="text-2xl font-display font-bold text-brand-dark dark:text-white mb-6">
                Timeline Estimate
              </h3>
              <div className="flex items-center gap-2 mb-6">
                <Clock className="w-5 h-5 text-brand-accent" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Total: <strong>{result.totalDurationWeeks} weeks</strong>
                </span>
              </div>
              <div className="flex flex-col gap-2 mb-6 text-sm">
                <p className="text-gray-600 dark:text-gray-400">
                  <strong>Estimated start:</strong> {result.estimatedStartDate}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  <strong>Estimated handover:</strong> {result.estimatedHandoverDate}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {result.stages.map((stage, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-brand-accent/10 text-brand-accent flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-brand-dark dark:text-white">{stage.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{stage.startDate} – {stage.endDate}</p>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{stage.durationWeeks}w</span>
                  </div>
                ))}
              </div>
            </div>
            <Button variant="primary" size="lg" onClick={() => window.location.href = "/contact"}>
              Contact TNA About Your Timeline
            </Button>
          </>
        ) : (
          <div className="bg-white dark:bg-gray-900 p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center h-full">
            <CalendarDays className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-display font-bold text-brand-dark dark:text-white mb-3">
              Estimate Your Project Timeline
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Enter your project details to get a predicted timeline with stage-by-stage breakdown.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
