import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, Building2, Hammer, Ruler, HardHat } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { SectionTitle } from "../components/ui/SectionTitle";
import { ServiceCard } from "../components/ui/ServiceCard";
import { ProjectCard } from "../components/ui/ProjectCard";
import { Testimonial } from "../components/ui/Testimonial";
import { FAQAccordion } from "../components/ui/Accordion";

const services = [
  {
    id: "joinery",
    title: "Custom Joinery",
    description: "In-house custom cabinets, display units, reception desks, shelving, CNC precision, and tailored finishes.",
    icon: Hammer,
    features: ["CNC Precision Routing", "Bespoke Cabinetry", "Premium Finishes"],
  },
  {
    id: "shopfitting",
    title: "Shopfitting & Fitouts",
    description: "Retail fixtures, signage integration, wall panelling, flooring coordination, and branded interior fitouts.",
    icon: Building2,
    features: ["Retail & Hospitality", "Brand Integration", "End-to-end Installation"],
  },
  {
    id: "construction",
    title: "Commercial Construction",
    description: "Structural works, refurbishments, site coordination, project delivery, budget and timeline control.",
    icon: HardHat,
    features: ["Structural Works", "Site Management", "Compliance & Safety"],
  },
  {
    id: "design",
    title: "Design & Planning",
    description: "CAD drawings, 3D modelling, layout optimisation, documentation support, and approvals guidance.",
    icon: Ruler,
    features: ["CAD & 3D Modelling", "Layout Optimisation", "Council Approvals"],
  },
];

const projects = [
  {
    id: "1",
    title: "Lumina Cafe Flagship",
    sector: "Hospitality",
    scope: "Full Fitout & Joinery",
    description: "Complete interior fitout including custom curved timber counter, banquette seating, and architectural lighting integration.",
    imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=1600",
    tags: ["Hospitality", "Joinery"],
  },
  {
    id: "2",
    title: "Nexus Tech Hub",
    sector: "Commercial Office",
    scope: "Construction & Fitout",
    description: "A 2000sqm office refurbishment featuring acoustic meeting pods, custom reception desk, and open-plan workstations.",
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1600",
    tags: ["Office", "Construction"],
  },
  {
    id: "3",
    title: "Aura Boutique",
    sector: "Retail",
    scope: "Shopfitting & Joinery",
    description: "High-end fashion retail fitout with bespoke brass display racks, marble counters, and premium veneer panelling.",
    imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1600",
    tags: ["Retail", "Shopfitting"],
  },
];

const testimonials = [
  {
    quote: "TNA Provider delivered our flagship store on time and under budget. Their in-house joinery team meant we didn't have to wait for third-party suppliers, which saved us weeks.",
    author: "Sarah Jenkins",
    role: "Retail Director",
    company: "Aura Boutique"
  },
  {
    quote: "The level of communication and project management was exceptional. They handled the entire office fitout while our team continued working with minimal disruption.",
    author: "David Chen",
    role: "Operations Manager",
    company: "Nexus Tech Hub"
  },
  {
    quote: "Finding a contractor who understands the strict compliance requirements of a medical fitout is rare. TNA Provider exceeded our expectations in every aspect of the build.",
    author: "Dr. Emily Roberts",
    role: "Principal Dentist",
    company: "Elevate Dental"
  }
];

const faqs = [
  {
    question: "Do you manufacture your own joinery?",
    answer: "Yes, we have our own state-of-the-art manufacturing facility. This allows us to maintain strict quality control, reduce lead times, and offer truly bespoke solutions without relying on third-party suppliers."
  },
  {
    question: "Can you work after hours to minimize disruption?",
    answer: "Absolutely. We understand that commercial spaces often need to remain operational during the day. We offer flexible scheduling, including night and weekend work, to ensure your business experiences minimal downtime."
  },
  {
    question: "Do you handle council approvals and permits?",
    answer: "Yes, our design and planning team can assist with the entire approvals process, from initial documentation to liaising with local councils and private certifiers to ensure your project is fully compliant."
  },
  {
    question: "What areas do you service?",
    answer: "We are based in Sydney but provide our commercial construction and fitout services Australia-wide for major retail rollouts and significant commercial projects."
  },
  {
    question: "How long does a typical commercial fitout take?",
    answer: "Timelines vary greatly depending on the scope and scale of the project. A small retail kiosk might take 2-3 weeks, while a large corporate office fitout could take 8-12 weeks. We provide a detailed, realistic timeline during the quoting phase and guarantee our delivery dates."
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
              Construction, Joinery & Shopfitting Delivered <span className="text-brand-accent">End-to-End</span>
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
                <Link to="/projects">View Our Projects <ArrowRight className="w-5 h-5 ml-2" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white">
                <Link to="/contact">Request a Quote</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Intro */}
      <section className="py-24 bg-white dark:bg-brand-darker overflow-hidden">
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
              <div className="absolute -bottom-8 -right-8 bg-brand-dark dark:bg-gray-900 text-white p-8 rounded-2xl shadow-xl max-w-xs hidden md:block">
                <div className="text-4xl font-display font-bold text-brand-accent mb-2">15+</div>
                <div className="text-sm font-medium text-gray-300 dark:text-gray-400">Years of combined experience delivering premium commercial spaces across Australia.</div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
              className="flex flex-col gap-8"
            >
              <SectionTitle 
                subtitle="From Concept to Completion"
                title="Specialists in Joinery, Shopfitting, and Construction"
              />
              <div className="prose prose-lg text-gray-600 dark:text-gray-400">
                <p>
                  At TNA Provider, we understand that a commercial fitout is more than just construction—it's the physical embodiment of your brand and the operational heart of your business.
                </p>
                <p>
                  We offer a true end-to-end service. By combining our in-house bespoke joinery manufacturing with expert on-site construction and project management, we eliminate the friction of dealing with multiple contractors. The result is a seamless delivery, on time and on budget.
                </p>
              </div>
              
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {[
                  "In-house manufacturing",
                  "Dedicated project managers",
                  "After-hours work available",
                  "Strict quality control",
                  "On-time delivery guarantee",
                  "Fully licensed & insured"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-brand-dark dark:text-gray-200 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-brand-accent flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              
              <div className="pt-6">
                <Button asChild>
                  <Link to="/about">Learn More About Us</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-24 bg-brand-gray dark:bg-gray-900 overflow-hidden">
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
              title="End-to-End Solutions"
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
            {projects.map((project, index) => (
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

      {/* CTA Band */}
      <section className="py-24 bg-brand-darker relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center mix-blend-luminosity" />
        </div>
        <div className="container relative z-10 mx-auto px-4 md:px-8 text-center max-w-4xl">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-8 tracking-tight">
            Ready to Build Your Next Commercial Space?
          </h2>
          <p className="text-xl text-gray-300 mb-10">
            Contact TNA Provider today for a consultation and quote. We deliver quality workmanship, custom fabrication, and reliable delivery across Australia.
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
