import { SectionTitle } from "../components/ui/SectionTitle";
import { Hammer, Building2, HardHat, Wrench, Ruler, Clock, MoonStar, ShieldCheck } from "lucide-react";

const services = [
  {
    id: "joinery",
    title: "Custom Joinery Manufacturing",
    icon: Hammer,
    overview: "Our state-of-the-art manufacturing facility produces high-quality, bespoke joinery tailored to your exact specifications.",
    deliverables: ["Custom cabinets & shelving", "Display units & POS counters", "Reception desks", "Premium veneer & laminate finishes", "CNC precision routing"],
    clients: "Retail stores, corporate offices, hospitality venues, high-end residential.",
    benefits: "In-house production ensures strict quality control, faster turnaround times, and seamless integration with the overall fitout.",
    image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=1200"
  },
  {
    id: "shopfitting",
    title: "Shopfitting & Interior Fitouts",
    icon: Building2,
    overview: "We transform empty shells into immersive brand experiences. Our shopfitting team coordinates every trade to deliver a polished final product.",
    deliverables: ["Retail fixtures & racking", "Signage integration", "Wall panelling & cladding", "Flooring coordination", "Lighting & electrical integration"],
    clients: "National retail chains, boutique stores, cafes, restaurants, gyms.",
    benefits: "Minimal disruption to trading, after-hours work capabilities, and a dedicated project manager for a single point of contact.",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200"
  },
  {
    id: "construction",
    title: "Commercial Construction",
    icon: HardHat,
    overview: "Beyond interior fitouts, we handle the heavy lifting. From structural modifications to complete refurbishments, our licensed builders manage the entire construction phase.",
    deliverables: ["Structural works & modifications", "Base building refurbishments", "Site coordination & management", "Demolition & strip-outs", "Budget & timeline control"],
    clients: "Property developers, landlords, large corporate tenants, educational institutions.",
    benefits: "Comprehensive risk management, strict adherence to safety and compliance standards, and transparent reporting.",
    image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=1200"
  },
  {
    id: "metalwork",
    title: "Architectural Metalwork",
    icon: Wrench,
    overview: "Custom metal fabrication adds a premium, industrial, or modern touch to any commercial space. We design and fabricate bespoke metal elements.",
    deliverables: ["Custom brass & steel fixtures", "Architectural staircases & balustrades", "Metal display frames", "Custom door hardware", "Powder-coated finishes"],
    clients: "High-end retail, luxury hospitality, modern office spaces.",
    benefits: "Durable, high-impact design elements that elevate the aesthetic of the space and integrate perfectly with our joinery.",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=1200"
  },
  {
    id: "design",
    title: "Design & Planning",
    icon: Ruler,
    overview: "A successful project starts with meticulous planning. We bridge the gap between architectural vision and practical construction.",
    deliverables: ["CAD drawings & shop detailing", "3D modelling & visualization", "Layout & spatial optimisation", "Documentation support", "Approvals & council process guidance"],
    clients: "Architects, interior designers, direct clients needing design-and-construct services.",
    benefits: "Identifies potential issues before construction begins, ensures accurate pricing, and streamlines the approval process.",
    image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=1200"
  }
];

export function Services() {
  return (
    <div className="flex flex-col min-h-screen pt-24">
      {/* Hero */}
      <section className="bg-brand-darker text-white py-24 md:py-32 relative overflow-hidden">
        <div className="container relative z-10 mx-auto px-4 md:px-8">
          <div className="max-w-3xl">
            <SectionTitle 
              subtitle="Our Services"
              title="Comprehensive Solutions for Commercial Spaces"
              light
            />
            <p className="mt-6 text-xl text-gray-300 leading-relaxed">
              From bespoke joinery to full-scale commercial construction, TNA Provider offers a true end-to-end service. We manage every detail so you can focus on your business.
            </p>
          </div>
        </div>
      </section>

      {/* Services List */}
      <section className="py-24 bg-brand-gray dark:bg-brand-darker">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col gap-24">
            {services.map((service, index) => (
              <div 
                key={service.id} 
                id={service.id}
                className={`flex flex-col lg:flex-row gap-12 items-center ${index % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}
              >
                <div className="w-full lg:w-1/2">
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-800">
                    <img 
                      src={service.image} 
                      alt={service.title} 
                      className="w-full h-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
                
                <div className="w-full lg:w-1/2 flex flex-col gap-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 rounded-lg bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                      <service.icon className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-display font-bold text-brand-dark dark:text-white">{service.title}</h2>
                  </div>
                  
                  <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                    {service.overview}
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-4">
                    <div>
                      <h4 className="font-bold text-brand-dark dark:text-white mb-3 uppercase tracking-wider text-sm">Key Deliverables</h4>
                      <ul className="space-y-2">
                        {service.deliverables.map((item, i) => (
                          <li key={i} className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent mt-1.5 mr-2 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="flex flex-col gap-6">
                      <div>
                        <h4 className="font-bold text-brand-dark dark:text-white mb-2 uppercase tracking-wider text-sm">Typical Clients</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{service.clients}</p>
                      </div>
                      <div>
                        <h4 className="font-bold text-brand-dark dark:text-white mb-2 uppercase tracking-wider text-sm">The Benefit</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{service.benefits}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* After-hours Work Section */}
      <section className="py-24 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <SectionTitle 
              subtitle="Minimal Disruption"
              title="After-Hours Construction & Fitout"
              align="center"
            />
            <p className="mt-6 text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
              We understand that closing your doors for renovations means lost revenue. Our dedicated after-hours teams ensure your business can continue trading while we transform your space overnight.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-brand-gray dark:bg-brand-darker p-8 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center text-brand-accent mb-6 shadow-sm">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-4">Zero Trading Impact</h3>
              <p className="text-gray-600 dark:text-gray-400">
                We schedule noisy, disruptive, or structural work outside of your operating hours, ensuring your customers and staff are never inconvenienced.
              </p>
            </div>

            <div className="bg-brand-gray dark:bg-brand-darker p-8 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center text-brand-accent mb-6 shadow-sm">
                <MoonStar className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-4">Overnight Transformations</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Our teams mobilize quickly at closing time. By morning, the site is cleaned, secured, and ready for you to open for business as usual.
              </p>
            </div>

            <div className="bg-brand-gray dark:bg-brand-darker p-8 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center text-brand-accent mb-6 shadow-sm">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-4">Secure & Compliant</h3>
              <p className="text-gray-600 dark:text-gray-400">
                We maintain strict security protocols and safety standards during after-hours operations, giving you peace of mind while you sleep.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
