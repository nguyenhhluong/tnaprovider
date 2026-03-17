import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  sector: string;
  scope: string;
  description: string;
  imageUrl: string;
  tags: string[];
}

interface LuxuryShowcaseProps {
  projects: Project[];
}

export function LuxuryShowcase({ projects }: LuxuryShowcaseProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % projects.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isHovered, projects.length]);

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % projects.length);
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + projects.length) % projects.length);

  if (!projects.length) return null;

  const currentProject = projects[currentIndex];

  return (
    <div 
      className="relative w-full h-[75vh] md:h-[85vh] bg-black overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          <img
            src={currentProject.imageUrl}
            alt={currentProject.title}
            className="w-full h-full object-cover opacity-60"
            referrerPolicy="no-referrer"
          />
          {/* Layered gradients for atmospheric depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent opacity-80" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end pb-24 md:pb-32 px-6 md:px-16 container mx-auto z-10">
        <div className="max-w-4xl">
          <motion.div
            key={`meta-${currentIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-4 mb-6"
          >
            <span className="text-[11px] text-white/70 uppercase tracking-[0.25em] font-medium">
              {currentProject.sector}
            </span>
            <div className="w-12 h-[1px] bg-white/30" />
            <span className="text-[11px] text-white/70 uppercase tracking-[0.25em] font-medium">
              {currentProject.scope}
            </span>
          </motion.div>

          <motion.h2
            key={`title-${currentIndex}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-7xl lg:text-8xl font-light text-white leading-[1.05] tracking-tight mb-8 font-display"
          >
            {currentProject.title}
          </motion.h2>

          <motion.p
            key={`desc-${currentIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-xl text-white/70 max-w-2xl font-light leading-relaxed"
          >
            {currentProject.description}
          </motion.p>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 right-6 md:right-16 flex items-center gap-8 z-20">
        <div className="flex items-center gap-3 text-white/50 font-mono text-sm tracking-widest">
          <span className="text-white">{(currentIndex + 1).toString().padStart(2, '0')}</span>
          <span className="w-8 h-[1px] bg-white/20" />
          <span>{projects.length.toString().padStart(2, '0')}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrev}
            className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all duration-300 backdrop-blur-sm"
            aria-label="Previous project"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={handleNext}
            className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all duration-300 backdrop-blur-sm"
            aria-label="Next project"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
