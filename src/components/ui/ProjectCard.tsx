import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface ProjectCardProps {
  key?: React.Key;
  id: string;
  title: string;
  sector: string;
  scope: string;
  description: string;
  imageUrl: string;
  tags: string[];
  location?: string;
  deliveryHighlights?: string[];
}

export function ProjectCard({ id, title, sector, scope, description, imageUrl, tags, location, deliveryHighlights }: ProjectCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  return (
    <motion.div 
      ref={ref}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative flex flex-col overflow-hidden bg-white dark:bg-gray-900 shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-800 rounded-xl transition-shadow duration-300 h-full"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <motion.img 
          style={{ y, scale: 1.2 }}
          src={imageUrl} 
          alt={title} 
          className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-darker/80 via-brand-darker/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
          <span className="px-3 py-1.5 text-xs font-bold bg-brand-dark/80 text-brand-accent border border-brand-accent/20 backdrop-blur-md rounded-full shadow-lg uppercase tracking-wider">
            {sector}
          </span>
          {location && (
            <span className="px-3 py-1.5 text-xs font-bold bg-white/90 text-brand-dark border border-white/20 backdrop-blur-md rounded-full shadow-lg uppercase tracking-wider">
              {location}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex flex-col flex-grow p-6 relative z-10 bg-white dark:bg-gray-900">
        <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-2 group-hover:text-brand-accent dark:group-hover:text-brand-accent transition-colors">
          {title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
          {description}
        </p>
        
        {deliveryHighlights && deliveryHighlights.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {deliveryHighlights.slice(0, 2).map((highlight, i) => (
              <span key={i} className="text-xs font-medium text-brand-dark dark:text-gray-300 bg-brand-gray dark:bg-gray-800 px-2 py-1 rounded-md">
                ✓ {highlight}
              </span>
            ))}
          </div>
        )}
        
        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate pr-4">
            Scope: {scope}
          </span>
          <Link 
            to={`/projects/${id}`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-gray dark:bg-gray-800 text-brand-dark dark:text-white group-hover:bg-brand-accent group-hover:text-white transition-colors flex-shrink-0"
            aria-label={`View ${title} project details`}
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
