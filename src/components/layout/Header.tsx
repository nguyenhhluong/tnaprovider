import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone, Mail } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../utils/cn";
import { Button } from "../ui/Button";
import { ThemeToggle } from "../ThemeToggle";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
  { name: "Services", path: "/services" },
  { name: "Sectors", path: "/sectors" },
  { name: "Projects", path: "/projects" },
  { name: "Contact", path: "/contact" },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled ? "bg-white/95 dark:bg-brand-darker/95 backdrop-blur-md shadow-sm py-4" : "bg-transparent py-6"
      )}
    >
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 z-50">
            <div className="w-10 h-10 bg-brand-accent rounded-sm flex items-center justify-center">
              <span className="text-white font-display font-bold text-xl tracking-tighter">TNA</span>
            </div>
            <div className="flex flex-col">
              <span className={cn("font-display font-bold text-xl leading-none tracking-tight", isScrolled ? "text-brand-dark dark:text-white" : "text-brand-dark lg:text-white dark:text-white")}>TNA Provider</span>
              <span className={cn("text-[10px] font-semibold tracking-widest uppercase", isScrolled ? "text-gray-500 dark:text-gray-400" : "text-gray-500 lg:text-gray-300 dark:text-gray-400")}>Construction & Joinery</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            <ul className="flex items-center gap-8">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <li key={link.name}>
                    <Link 
                      to={link.path}
                      className={cn(
                        "text-sm font-medium transition-colors hover:text-brand-accent",
                        isScrolled ? "text-brand-dark dark:text-gray-200" : "text-white",
                        isActive && "text-brand-accent dark:text-brand-accent"
                      )}
                    >
                      {link.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center gap-4 ml-4">
              <ThemeToggle />
              <a href="tel:0406409668" className={cn("flex items-center gap-2 text-sm font-medium hover:text-brand-accent transition-colors", isScrolled ? "text-brand-dark dark:text-gray-200" : "text-white")}>
                <Phone className="w-4 h-4" />
                <span>0406 409 668</span>
              </a>
              <Button asChild variant={isScrolled ? "primary" : "primary"} size="sm">
                <Link to="/contact">Request Quote</Link>
              </Button>
            </div>
          </nav>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-2 lg:hidden z-50">
            <ThemeToggle />
            <button 
              className={cn("p-2 relative w-10 h-10 flex items-center justify-center", isScrolled ? "text-brand-dark dark:text-white" : "text-brand-dark md:text-white dark:text-white")}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait">
                {mobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute"
                  >
                    <X className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute"
                  >
                    <Menu className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-white dark:bg-brand-darker pt-24 px-6 pb-8 flex flex-col h-screen overflow-y-auto"
          >
            <nav className="flex flex-col gap-6 mb-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={cn(
                    "text-2xl font-display font-bold tracking-tight",
                    location.pathname === link.path ? "text-brand-accent" : "text-brand-dark dark:text-white"
                  )}
                >
                  {link.name}
                </Link>
              ))}
            </nav>
            
            <div className="mt-auto flex flex-col gap-6 pt-8 border-t border-gray-100 dark:border-gray-800 pb-safe">
              <a href="tel:0406409668" className="flex items-center gap-3 text-brand-dark dark:text-white font-medium">
                <div className="w-10 h-10 rounded-full bg-brand-gray dark:bg-gray-800 flex items-center justify-center text-brand-accent">
                  <Phone className="w-5 h-5" />
                </div>
                0406 409 668
              </a>
              <a href="mailto:info@tnaprovider.com.au" className="flex items-center gap-3 text-brand-dark dark:text-white font-medium">
                <div className="w-10 h-10 rounded-full bg-brand-gray dark:bg-gray-800 flex items-center justify-center text-brand-accent">
                  <Mail className="w-5 h-5" />
                </div>
                info@tnaprovider.com.au
              </a>
              <Button asChild className="w-full mt-4 py-6 text-lg shadow-xl shadow-brand-accent/20" size="lg">
                <Link to="/contact">Request a Quote</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
