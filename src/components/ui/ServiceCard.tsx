import React from "react";
import { motion } from "motion/react";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface ServiceCardProps {
  key?: React.Key;
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
}

export function ServiceCard({ id, title, description, icon: Icon, features }: ServiceCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="group flex flex-col p-8 bg-white dark:bg-brand-darker border border-gray-100 dark:border-gray-800 shadow-sm rounded-xl transition-all hover:shadow-md dark:hover:shadow-xl dark:hover:shadow-black/50"
    >
      <div className="w-14 h-14 rounded-lg bg-brand-gray dark:bg-gray-800 flex items-center justify-center mb-6 group-hover:bg-brand-accent group-hover:text-white transition-colors text-brand-dark dark:text-white">
        <Icon className="w-7 h-7" />
      </div>
      
      <h3 className="text-2xl font-bold text-brand-dark dark:text-white mb-3">
        {title}
      </h3>
      
      <p className="text-gray-600 dark:text-gray-400 mb-6 flex-grow">
        {description}
      </p>
      
      <ul className="space-y-2 mb-8">
        {features.slice(0, 3).map((feature, idx) => (
          <li key={idx} className="flex items-start text-sm text-gray-500 dark:text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent mt-1.5 mr-2 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
      
      <Link 
        to={`/services#${id}`}
        className="inline-flex items-center text-sm font-semibold text-brand-dark dark:text-white group-hover:text-brand-accent dark:group-hover:text-brand-accent transition-colors mt-auto"
      >
        Explore Service
        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
      </Link>
    </motion.div>
  );
}
