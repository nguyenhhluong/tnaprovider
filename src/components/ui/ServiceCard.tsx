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
      className="group flex flex-col p-6 bg-white/5 dark:bg-gray-800/50 border border-white/10 dark:border-gray-700 rounded-xl transition-all hover:bg-white/10 hover:border-brand-accent/30"
    >
      <div className="w-12 h-12 rounded-lg bg-brand-accent/10 flex items-center justify-center mb-5 group-hover:bg-brand-accent/20 transition-colors">
        <Icon className="w-6 h-6 text-brand-accent" />
      </div>
      
      <h3 className="text-xl font-bold text-white mb-3">
        {title}
      </h3>
      
      <p className="text-gray-400 text-sm mb-5 flex-grow leading-relaxed">
        {description}
      </p>
      
      <ul className="space-y-2 mb-6">
        {features.slice(0, 3).map((feature, idx) => (
          <li key={idx} className="flex items-start text-sm text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent mt-1.5 mr-2 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
      
      <Link 
        to={`/services#${id}`}
        className="inline-flex items-center text-sm font-semibold text-white group-hover:text-brand-accent transition-colors mt-auto"
      >
        Learn more
        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
      </Link>
    </motion.div>
  );
}
