import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        
        return (
          <div 
            key={index} 
            className={cn(
              "border rounded-xl overflow-hidden transition-colors duration-300",
              isOpen ? "bg-white dark:bg-brand-darker border-brand-accent/20 dark:border-brand-accent/40 shadow-sm" : "bg-white dark:bg-brand-darker border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
            )}
          >
            <button
              onClick={() => toggleItem(index)}
              className="flex items-center justify-between w-full p-6 text-left focus:outline-none"
            >
              <span className="text-lg font-semibold text-brand-dark dark:text-white pr-8">{item.question}</span>
              <ChevronDown 
                className={cn(
                  "w-5 h-5 text-brand-accent flex-shrink-0 transition-transform duration-300",
                  isOpen && "rotate-180"
                )} 
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <div className="px-6 pb-6 text-gray-600 dark:text-gray-400 leading-relaxed">
                    {item.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
