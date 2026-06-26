import { cn } from "../../utils/cn";
import { motion } from "motion/react";

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
  light?: boolean;
  as?: "h1" | "h2" | "h3";
}

export function SectionTitle({ title, subtitle, align = "left", className, light = false, as = "h2" }: SectionTitleProps) {
  const Tag = as;
  return (
    <div className={cn("flex flex-col gap-3", align === "center" && "items-center text-center", className)}>
      {subtitle && (
        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={cn(
            "text-sm font-semibold tracking-wider uppercase",
            light ? "text-brand-accent" : "text-brand-dark dark:text-brand-accent"
          )}
        >
          {subtitle}
        </motion.span>
      )}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
      >
        <Tag className={cn(
          "text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight",
          light ? "text-white" : "text-brand-dark dark:text-white"
        )}>
          {title}
        </Tag>
      </motion.div>
    </div>
  );
}
