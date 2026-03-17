import { SectionTitle } from "../components/ui/SectionTitle";
import { ShoppingBag, Coffee, Briefcase, Stethoscope, GraduationCap } from "lucide-react";

const sectors = [
  {
    id: "retail",
    title: "Retail & Fashion",
    icon: ShoppingBag,
    description: "High-impact retail environments that drive foot traffic and enhance brand perception. From flagship stores to boutique pop-ups, we deliver custom joinery and seamless fitouts.",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200"
  },
  {
    id: "hospitality",
    title: "Hospitality",
    icon: Coffee,
    description: "Durable, aesthetically stunning spaces for cafes, restaurants, and bars. We understand the unique operational requirements of commercial kitchens and front-of-house design.",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=1200"
  },
  {
    id: "commercial",
    title: "Commercial & Office",
    icon: Briefcase,
    description: "Modern workspaces designed for productivity and collaboration. We handle everything from base building refurbishments to custom reception desks and acoustic meeting rooms.",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200"
  },
  {
    id: "healthcare",
    title: "Healthcare / Medical",
    icon: Stethoscope,
    description: "Clean, compliant, and welcoming medical clinics, dental practices, and specialist consulting suites. We prioritize hygiene, accessibility, and patient comfort.",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1200"
  },
  {
    id: "education",
    title: "Education / Specialist",
    icon: GraduationCap,
    description: "Inspiring learning environments and specialist facilities. We deliver robust joinery and construction solutions that withstand heavy daily use.",
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=1200"
  }
];

export function Sectors() {
  return (
    <div className="flex flex-col min-h-screen pt-24">
      {/* Hero */}
      <section className="bg-brand-darker text-white py-24 md:py-32 relative overflow-hidden">
        <div className="container relative z-10 mx-auto px-4 md:px-8">
          <div className="max-w-3xl">
            <SectionTitle 
              subtitle="Industries We Serve"
              title="Specialized Expertise Across Key Sectors"
              light
            />
            <p className="mt-6 text-xl text-gray-300 leading-relaxed">
              TNA Provider brings deep industry knowledge to every project. We understand the unique compliance, operational, and aesthetic requirements of different commercial environments.
            </p>
          </div>
        </div>
      </section>

      {/* Sectors Grid */}
      <section className="py-24 bg-brand-gray dark:bg-gray-900">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sectors.map((sector) => (
              <div 
                key={sector.id}
                className="group flex flex-col bg-white dark:bg-brand-darker rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md dark:hover:shadow-xl dark:hover:shadow-black/50 transition-all"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img 
                    src={sector.image} 
                    alt={sector.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute top-4 left-4 w-12 h-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex items-center justify-center text-brand-accent">
                    <sector.icon className="w-6 h-6" />
                  </div>
                </div>
                <div className="p-8 flex flex-col flex-grow">
                  <h3 className="text-2xl font-bold text-brand-dark dark:text-white mb-4 group-hover:text-brand-accent dark:group-hover:text-brand-accent transition-colors">
                    {sector.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed flex-grow">
                    {sector.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
