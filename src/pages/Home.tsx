import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, Building2, Hammer, Ruler, HardHat, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { SectionTitle } from "../components/ui/SectionTitle";
import { ServiceCard } from "../components/ui/ServiceCard";
import { ProjectCard } from "../components/ui/ProjectCard";
import { Testimonial } from "../components/ui/Testimonial";
import { FAQAccordion } from "../components/ui/Accordion";
import { projects } from "../data/projects";

const services = [
  {
    id: "joinery",
    title: "Custom Joinery",
    description: "We manufacture bespoke joinery in-house — cabinets, fixtures, reception desks — built to exact specifications with our own CNC equipment.",
    icon: Hammer,
    features: ["In-House Manufacturing", "Custom Specifications", "Full Installation"],
  },
  {
    id: "shopfitting",
    title: "Shopfitting",
    description: "We fit out retail and hospitality spaces for trading. Coordinated delivery from start to handover.",
    icon: Building2,
    features: ["Retail & Hospitality", "Trade Coordination", "Flexible Scheduling"],
  },
  {
    id: "construction",
    title: "Construction",
    description: "Structural modifications, refurbishments, and base building works. Licensed builders managing the full build process.",
    icon: HardHat,
    features: ["Licensed Builders", "Site Management", "Compliance"],
  },
  {
    id: "metalwork",
    title: "Metalwork",
    description: "Custom metal fixtures and fittings fabricated to match your design. Brackets, railings, and architectural elements.",
    icon: Wrench,
    features: ["Custom Fabrication", "Steel & Brass", "Powder Coating"],
  },
];

const testimonials = [
  {
    quote: "TNA delivered our store on time. Their in-house joinery meant no waiting for external suppliers — saved us weeks.",
    author: "Sarah Jenkins",
    role: "Retail Director",
    company: "Aura Boutique"
  },
  {
    quote: "They managed the entire office fitout while we kept working. Good communication throughout.",
    author: "David Chen",
    role: "Operations Manager",
    company: "Nexus Tech Hub"
  },
  {
    quote: "Medical fitout needed strict compliance. TNA knew the requirements and delivered without issues.",
    author: "Dr. Emily Roberts",
    role: "Principal Dentist",
    company: "Elevate Dental"
  }
];

const faqs = [
  {
    question: "Do you manufacture your own joinery?",
    answer: "Yes. We have our own joinery workshop with CNC equipment. We don't outsource — everything is made in-house."
  },
  {
    question: "Can you work after hours?",
    answer: "Yes. We schedule night and weekend work to avoid disrupting your trading. Let us know what works for you."
  },
  {
    question: "Do you handle council approvals?",
    answer: "We can prepare documentation and liaise with councils and certifiers. Tell us what you need."
  },
  {
    question: "What areas do you service?",
    answer: "We're based in Sydney and work across NSW and Australia for larger projects."
  },
  {
    question: "How long does a fitout take?",
    answer: "It depends on scope. A small retail kiosk might be 2-3 weeks. A full office fitout could be 8-12 weeks. We give you a realistic timeline at quote stage."
  }
];

export function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen min-h-[600px] flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=2000" 
            alt="Commercial Construction Site" 
            className="w-full h-full object-cover"
            loading="eager"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-brand-darker/70 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-darker via-brand-darker/50 to-transparent" />
        </div>

        <div className="container relative z-10 mx-auto px-4 md:px-8">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
              Built for Commercial Spaces That Need to Perform
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight leading-[1.1] mb-8"
            >
              Commercial Fitouts, Joinery, and Shopfitting.
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-gray-300 max-w-2xl mb-10 leading-relaxed"
            >
              TNA Provider delivers commercial construction, bespoke joinery, shopfitting, and interior fitout solutions across retail, hospitality, office, and specialist environments.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap items-center gap-4"
            >
              <Button asChild size="lg">
                <Link to="/contact">Request a Quote <ArrowRight className="w-5 h-5 ml-2" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white">
                <Link to="/projects">View Projects</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="bg-brand-darker border-t border-white/10 py-6 relative z-20">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-wrap justify-center md:justify-between items-center gap-4 md:gap-8">
            {[
              "In-House Joinery",
              "Custom Fabrication",
              "Shopfitting Specialists",
              "Sydney Based"
            ].map((chip, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + (index * 0.1) }}
                className="flex items-center gap-2 text-gray-300 text-sm md:text-base font-medium"
              >
                <CheckCircle2 className="w-4 h-4 text-brand-accent" />
                {chip}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why TNA Provider */}
      <section className="py-24 bg-brand-dark dark:bg-black overflow-hidden">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <div className="aspect-[4/5] rounded-2xl overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1541888086925-920a0b414631?auto=format&fit=crop&q=80&w=1200" 
                  alt="TNA Provider Team" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-8 -right-8 bg-brand-gray dark:bg-gray-800 text-white p-8 rounded-xl shadow-xl max-w-xs hidden md:block border border-gray-700">
                <div className="text-4xl font-display font-bold text-brand-accent mb-2">15+</div>
                <div className="text-sm font-medium text-gray-300">Years in commercial construction and joinery.</div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
              className="flex flex-col gap-6"
            >
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-brand-accent mb-2">Why Choose Us</p>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-white">Built for Speed and Minimal Disruption</h2>
              </div>
              
              <div className="text-gray-300 text-lg leading-relaxed max-w-xl">
                <p className="mb-4">
                  Commercial fitouts cost money every day your doors are closed. We've built our operation around getting you trading faster — without cutting corners.
                </p>
                <p>
                  We keep joinery manufacturing in-house and manage every trade on-site. No passing the buck to third-party subcontractors. We work around your trading hours.
                </p>
              </div>
              
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "In-House Joinery", desc: "We make it ourselves. No supplier delays." },
                  { title: "Single Point of Contact", desc: "One project manager from start to finish." },
                  { title: "After-Hours Work", desc: "We can work nights and weekends." },
                  { title: "Fixed Timeline", desc: "We commit to dates and stick to them." }
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
                    <CheckCircle2 className="w-5 h-5 text-brand-accent flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-white font-semibold text-sm">{item.title}</div>
                      <div className="text-gray-400 text-sm">{item.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
              
              <div className="pt-4">
                <Button asChild>
                  <Link to="/about">Learn More About Us</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-24 bg-brand-dark dark:bg-black overflow-hidden">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16"
          >
            <SectionTitle 
              subtitle="Our Capabilities"
              title="What We Do"
              className="max-w-2xl"
            />
            <Button asChild variant="outline">
              <Link to="/services">View All Services</Link>
            </Button>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <ServiceCard 
                  id={service.id}
                  title={service.title}
                  description={service.description}
                  icon={service.icon}
                  features={service.features}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-24 bg-brand-darker text-white overflow-hidden relative">
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center mix-blend-luminosity" />
        </div>
        <div className="container relative z-10 mx-auto px-4 md:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <SectionTitle 
              subtitle="How We Work"
              title="Our Proven Delivery Process"
              align="center"
              light
            />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -translate-y-1/2 z-0" />
            
            {[
              { step: "01", title: "Consult", desc: "Understanding your vision, budget, and operational requirements." },
              { step: "02", title: "Design", desc: "Detailed CAD drawings, 3D models, and material selection." },
              { step: "03", title: "Manufacture", desc: "In-house fabrication of bespoke joinery and metalwork." },
              { step: "04", title: "Install", desc: "Coordinated on-site construction and fitout execution." },
              { step: "05", title: "Handover", desc: "Final defect checks, deep clean, and project handover." }
            ].map((item, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative z-10 flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-full bg-brand-dark border-4 border-brand-darker shadow-[0_0_0_2px_rgba(255,255,255,0.1)] flex items-center justify-center text-brand-accent font-display font-bold text-xl mb-6">
                  {item.step}
                </div>
                <h4 className="text-xl font-bold mb-3">{item.title}</h4>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="py-24 bg-white dark:bg-brand-darker overflow-hidden">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16"
          >
            <SectionTitle 
              subtitle="Our Work"
              title="Featured Projects"
            />
            <Button asChild variant="outline">
              <Link to="/projects">View Gallery</Link>
            </Button>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.slice(0, 3).map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <ProjectCard 
                  id={project.id}
                  title={project.title}
                  sector={project.sector}
                  scope={project.scope}
                  description={project.description}
                  imageUrl={project.imageUrl}
                  tags={project.tags}
                  location={project.location}
                  deliveryHighlights={project.deliveryHighlights}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-brand-gray dark:bg-gray-900 overflow-hidden">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <SectionTitle 
              subtitle="Client Success"
              title="Trusted by Australian Businesses"
              align="center"
              className="mb-16"
            />
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Testimonial 
                  quote={testimonial.quote}
                  author={testimonial.author}
                  role={testimonial.role}
                  company={testimonial.company}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-white dark:bg-brand-darker overflow-hidden">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <SectionTitle 
              subtitle="Common Questions"
              title="Frequently Asked Questions"
              align="center"
              className="mb-16"
            />
            <FAQAccordion items={faqs} />
          </motion.div>
        </div>
      </section>

      {/* Signature Section */}
      <section className="py-24 bg-brand-dark dark:bg-black relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-accent/5 rounded-full blur-[120px]" />
        </div>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-accent/30 to-transparent" />
        <div className="container relative z-10 mx-auto px-4 md:px-8 text-center max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent mb-4">
            Heidi-dang Signature™
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6 tracking-tight">
            Precision Motion Architecture
          </h2>
          <p className="text-lg text-gray-400 mb-8 max-w-xl mx-auto">
            A first-of-its-kind website design language built for premium commercial brands — combining cinematic pacing, architectural spacing, and refined visual control.
          </p>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-8">
            This website experience was shaped to feel deliberate, confident, and built with intent. Every section is designed to guide attention clearly, elevate trust, and present the brand with a stronger sense of quality, structure, and finish.
          </p>
          <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-600 to-transparent mx-auto mb-6" />
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
            Website experience designed by Heidi-dang.
          </p>
          <a 
            href="https://github.com/heidi-dang" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-gray-600 hover:text-brand-accent transition-colors"
          >
            GitHub: github.com/heidi-dang
          </a>
        </div>
      </section>

      {/* CTA Band */}
      <section className="py-24 bg-brand-darker relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center mix-blend-luminosity" />
        </div>
        <div className="container relative z-10 mx-auto px-4 md:px-8 text-center max-w-4xl">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-8 tracking-tight">
            Ready to Start Your Project?
          </h2>
          <p className="text-xl text-gray-300 mb-10">
            Get in touch for a quote. We handle joinery, fitout, and construction — start to finish.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/contact">Request a Quote</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white">
              <a href="tel:0406409668">Call 0406 409 668</a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
