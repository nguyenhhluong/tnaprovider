import { useState } from "react";
import { Button } from "../ui/Button";
import { calculateEstimate } from "../../utils/estimate";
import type { EstimateInput, EstimateResult } from "../../types/estimate";
import { Calculator, AlertCircle } from "lucide-react";

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

const SECTORS = ["Residential", "Retail", "Hospitality", "Medical", "Office", "Industrial"] as const;

const MATERIAL_GRADES = ["Budget", "Premium", "Luxury"] as const;

const COMPLEXITIES = ["Simple", "Standard", "Complex", "High-end architectural"] as const;

const PROJECT_SIZES = ["Small", "Medium", "Large", "Extra Large"] as const;

const defaultInput: EstimateInput = {
  projectType: "",
  sector: "",
  projectSize: "",
  materialGrade: "",
  complexity: "",
  location: "",
  desiredStartDate: "",
  name: "",
  email: "",
  phone: "",
};

export function CostEstimatorForm() {
  const [formData, setFormData] = useState<EstimateInput>(defaultInput);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof EstimateInput, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof EstimateInput, string>> = {};

    if (!formData.projectType) newErrors.projectType = "Required";
    if (!formData.sector) newErrors.sector = "Required";
    if (!formData.projectSize) newErrors.projectSize = "Required";
    if (!formData.materialGrade) newErrors.materialGrade = "Required";
    if (!formData.complexity) newErrors.complexity = "Required";
    if (!formData.location) newErrors.location = "Required";
    if (!formData.name) newErrors.name = "Required";
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setResult(null);
    if (errors[name as keyof EstimateInput]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const estimate = calculateEstimate(formData);
    setResult(estimate);
  };

  const handleReset = () => {
    setFormData(defaultInput);
    setResult(null);
    setErrors({});
  };

  const temperatureColor = (temp: string) => {
    switch (temp) {
      case "hot": return "text-red-500";
      case "warm": return "text-amber-500";
      default: return "text-blue-500";
    }
  };

  const inputClass = (field: keyof EstimateInput) =>
    `h-12 px-4 rounded-lg border ${errors[field] ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent"} bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors w-full`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
      <div className="bg-white dark:bg-gray-900 p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-8">
          <Calculator className="w-6 h-6 text-brand-accent" />
          <h3 className="text-2xl font-display font-bold text-brand-dark dark:text-white">
            Project Details
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
              Sector <span className="text-red-500">*</span>
            </label>
            <select name="sector" value={formData.sector} onChange={handleChange} className={inputClass("sector")}>
              <option value="">Select sector...</option>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.sector && <span className="text-xs text-red-500">{errors.sector}</span>}
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
              Complexity <span className="text-red-500">*</span>
            </label>
            <select name="complexity" value={formData.complexity} onChange={handleChange} className={inputClass("complexity")}>
              <option value="">Select complexity...</option>
              {COMPLEXITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.complexity && <span className="text-xs text-red-500">{errors.complexity}</span>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Location/Suburb <span className="text-red-500">*</span>
            </label>
            <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="e.g. North Sydney, NSW" className={inputClass("location")} />
            {errors.location && <span className="text-xs text-red-500">{errors.location}</span>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Desired Start Date
            </label>
            <input type="date" name="desiredStartDate" value={formData.desiredStartDate} onChange={handleChange} className={inputClass("desiredStartDate")} />
          </div>
          <hr className="border-gray-200 dark:border-gray-700 my-2" />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Your Name <span className="text-red-500">*</span>
            </label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" className={inputClass("name")} />
            {errors.name && <span className="text-xs text-red-500">{errors.name}</span>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Email <span className="text-red-500">*</span>
            </label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" className={inputClass("email")} />
            {errors.email && <span className="text-xs text-red-500">{errors.email}</span>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Phone <span className="text-red-500">*</span>
            </label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="0406 409 668" className={inputClass("phone")} />
            {errors.phone && <span className="text-xs text-red-500">{errors.phone}</span>}
          </div>
          <div className="flex gap-4 mt-2">
            <Button type="submit" size="lg" className="flex-1">
              Calculate Estimate
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
            <div className="bg-white dark:bg-gray-900 p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="text-2xl font-display font-bold text-brand-dark dark:text-white mb-6">
                Estimated Range
              </h3>
              <p className="text-4xl font-display font-bold text-brand-accent mb-4">
                ${result.lowPrice.toLocaleString()} – ${result.highPrice.toLocaleString()} + GST
              </p>
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className={`w-5 h-5 ${temperatureColor(result.leadTemperature)}`} />
                <span className={`font-semibold capitalize ${temperatureColor(result.leadTemperature)}`}>
                  Lead: {result.leadTemperature}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Estimated timeline: {result.timelineHint}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic border-t border-gray-200 dark:border-gray-700 pt-4">
                This is an indicative estimate only. Final quote requires drawings, site details, material selections, and access conditions.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <Button variant="primary" size="lg" onClick={() => window.location.href = "/contact"}>
                Contact TNA for a Detailed Quote
              </Button>
              <Button variant="outline" size="lg" onClick={() => window.location.href = "/tools/tender-upload"}>
                Upload Your Drawings
              </Button>
              <Button variant="ghost" size="lg" onClick={() => window.location.href = "/contact"}>
                Book a Call
              </Button>
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-gray-900 p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center h-full">
            <Calculator className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-display font-bold text-brand-dark dark:text-white mb-3">
              Fill in your project details
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Complete the form to get an indicative cost estimate for your project.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
