import React, { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { motion } from "motion/react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent disabled:pointer-events-none disabled:opacity-50";
    
    const variants = {
      primary: "bg-brand-accent text-white hover:bg-brand-accent-hover shadow-sm",
      secondary: "bg-brand-dark dark:bg-gray-800 text-white hover:bg-brand-darker dark:hover:bg-gray-700 shadow-sm",
      outline: "border border-brand-dark dark:border-gray-600 text-brand-dark dark:text-gray-300 hover:bg-brand-gray dark:hover:bg-gray-800",
      ghost: "hover:bg-brand-gray dark:hover:bg-gray-800 text-brand-dark dark:text-gray-300",
    };

    const sizes = {
      sm: "h-9 px-4 text-sm",
      md: "h-11 px-6 text-base",
      lg: "h-14 px-8 text-lg",
    };

    return (
      <motion.button
        whileTap={{ scale: 0.98 }}
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
