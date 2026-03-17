import { Link } from "react-router-dom";
import { HashLink } from "react-router-hash-link";
import { Mail, Phone, MapPin, ArrowRight, Linkedin, Instagram, Facebook } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-brand-darker text-white pt-20 pb-10">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand Col */}
          <div className="flex flex-col gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-brand-accent rounded-sm flex items-center justify-center">
                <span className="text-white font-display font-bold text-xl tracking-tighter">TNA</span>
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-xl leading-none tracking-tight text-white">TNA Provider</span>
                <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">Construction & Joinery</span>
              </div>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Sydney-based commercial construction and joinery company. We handle fitouts, custom joinery, and construction work across retail, hospitality, and office sectors.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-brand-accent hover:text-white transition-colors" aria-label="LinkedIn">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-brand-accent hover:text-white transition-colors" aria-label="Instagram">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-brand-accent hover:text-white transition-colors" aria-label="Facebook">
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-6">
            <h4 className="text-lg font-display font-bold tracking-tight">Quick Links</h4>
            <ul className="flex flex-col gap-3">
              {["About Us", "Our Services", "Sectors", "Projects", "Contact"].map((link) => (
                <li key={link}>
                  <Link 
                    to={`/${link.toLowerCase().replace(" ", "-")}`}
                    className="text-gray-400 hover:text-brand-accent transition-colors text-sm flex items-center group"
                  >
                    <ArrowRight className="w-3 h-3 mr-2 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="flex flex-col gap-6">
            <h4 className="text-lg font-display font-bold tracking-tight">Our Services</h4>
            <ul className="flex flex-col gap-3">
              {[
                { name: "Custom Joinery Manufacturing", hash: "joinery" },
                { name: "Shopfitting & Interior Fitouts", hash: "shopfitting" },
                { name: "Commercial Construction", hash: "construction" },
                { name: "Cabinet Making", hash: "cabinet-making" },
                { name: "Design & Planning", hash: "design" }
              ].map((service) => (
                <li key={service.hash}>
                  <HashLink 
                    to={`/services#${service.hash}`}
                    smooth
                    className="text-gray-400 hover:text-brand-accent transition-colors text-sm"
                  >
                    {service.name}
                  </HashLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-6">
            <h4 className="text-lg font-display font-bold tracking-tight">Contact Us</h4>
            <ul className="flex flex-col gap-4">
              <li className="flex items-start gap-3 text-gray-400 text-sm">
                <MapPin className="w-5 h-5 text-brand-accent flex-shrink-0 mt-0.5" />
                <span>16/46 Wellington Road,<br />South Granville, NSW, 2142</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <Phone className="w-5 h-5 text-brand-accent flex-shrink-0" />
                <a href="tel:0406409668" className="hover:text-white transition-colors">0406 409 668</a>
              </li>
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <Mail className="w-5 h-5 text-brand-accent flex-shrink-0" />
                <a href="mailto:info@tnaprovider.com.au" className="hover:text-white transition-colors">info@tnaprovider.com.au</a>
              </li>
            </ul>
          </div>

        </div>

        {/* Heidi-dang Signature */}
        <div className="py-8 border-t border-white/10">
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">
              Heidi-dang Signature™
            </p>
            <p className="text-xs text-gray-500">
              Precision Motion Architecture
            </p>
            <p className="text-xs text-gray-600">
              Website experience designed by <span className="text-gray-500">Heidi-dang</span>.
            </p>
            <a 
              href="https://github.com/heidi-dang" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-gray-600 hover:text-brand-accent transition-colors"
            >
              github.com/heidi-dang
            </a>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            &copy; {currentYear} TNA Provider. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <span>ABN: 80 664 454 924</span>
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
