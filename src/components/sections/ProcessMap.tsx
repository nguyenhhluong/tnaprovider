import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SectionTitle } from "../ui/SectionTitle";
import { processSteps } from "../../data/process";
import { cn } from "../../utils/cn";

export function ProcessMap() {
  const [activeStep, setActiveStep] = useState<number>(1);

  const current = processSteps.find((s) => s.step === activeStep) || processSteps[0];

  return (
    <section className="py-24 bg-brand-darker text-white overflow-hidden relative">
      <div className="container relative z-10 mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <SectionTitle subtitle="How We Work" title="Our 5-Step Delivery Process" align="center" light />
        </motion.div>

        {/* Step Navigation */}
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          {processSteps.map((step) => (
            <button
              key={step.step}
              onClick={() => setActiveStep(step.step)}
              className={cn(
                "relative px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300",
                activeStep === step.step
                  ? "bg-brand-accent text-white shadow-lg shadow-brand-accent/30"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
              )}
            >
              <span className="mr-2 opacity-60">{String(step.step).padStart(2, "0")}</span>
              {step.title}
            </button>
          ))}
        </div>

        {/* Active Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-4xl mx-auto"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
              <div className="flex flex-col gap-6">
                <div>
                  <span className="text-brand-accent text-sm font-bold uppercase tracking-widest">
                    Step {String(current.step).padStart(2, "0")}
                  </span>
                  <h3 className="text-3xl md:text-4xl font-display font-bold text-white mt-2">
                    {current.title}
                  </h3>
                </div>
                <p className="text-lg text-gray-300 leading-relaxed">{current.description}</p>
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400 self-start">
                  <span className="w-2 h-2 rounded-full bg-brand-accent" />
                  Typical timeframe: {current.timeframe}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-brand-accent mb-3">
                    What TNA Does
                  </h4>
                  <p className="text-gray-300 leading-relaxed">{current.whatTNADoes}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-brand-accent mb-3">
                    What You Provide
                  </h4>
                  <p className="text-gray-300 leading-relaxed">{current.whatClientProvides}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-brand-accent mb-3">
                    Expected Output
                  </h4>
                  <p className="text-gray-300 leading-relaxed">{current.expectedOutput}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Step Progress Dots */}
        <div className="flex justify-center gap-2 mt-12">
          {processSteps.map((step) => (
            <button
              key={step.step}
              onClick={() => setActiveStep(step.step)}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all duration-300",
                activeStep === step.step
                  ? "bg-brand-accent w-8"
                  : "bg-white/20 hover:bg-white/40"
              )}
              aria-label={`Go to step ${step.step}: ${step.title}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
