import React from "react";
import { motion } from "motion/react";
import { Quote } from "lucide-react";

interface TestimonialProps {
  key?: React.Key;
  quote: string;
  author: string;
  role: string;
  company: string;
}

export function Testimonial({ quote, author, role, company }: TestimonialProps) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white dark:bg-brand-darker p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col h-full"
    >
      <Quote className="w-10 h-10 text-brand-accent/20 dark:text-brand-accent/40 mb-6" />
      <p className="text-lg text-gray-700 dark:text-gray-300 italic mb-8 flex-grow leading-relaxed">
        "{quote}"
      </p>
      <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800">
        <h4 className="font-bold text-brand-dark dark:text-white">{author}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">{role}, {company}</p>
      </div>
    </motion.div>
  );
}
