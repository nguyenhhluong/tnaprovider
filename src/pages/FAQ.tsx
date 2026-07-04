import { useState } from "react";
import { SEO } from "../components/SEO";
import { motion } from "motion/react";
import { SectionTitle } from "../components/ui/SectionTitle";
import { FAQAccordion } from "../components/ui/Accordion";
import { FAQStructuredData } from "../components/StructuredData";
import { faqCategories } from "../data/faqs";
import { cn } from "../utils/cn";

export function FAQ() {
  const [activeCategory, setActiveCategory] = useState(faqCategories[0]?.category || "");

  const currentCategory = faqCategories.find((c) => c.category === activeCategory) || faqCategories[0];

  const flatFaqs = currentCategory?.questions || [];

  const allFaqs = faqCategories.flatMap((c) => c.questions);

  return (
    <div className="flex flex-col min-h-screen pt-24">
      <SEO
        title="FAQ | TNA Provider — Commercial Fitouts, Joinery & Construction Sydney"
        description="Frequently asked questions about TNA Provider's commercial fitout, joinery, and construction services in Sydney and Australia."
        canonical="https://tnaprovider.com.au/faq"
      />
      <FAQStructuredData faqs={allFaqs} />

      {/* Hero */}
      <section className="bg-brand-darker text-white py-24 md:py-32 relative overflow-hidden">
        <div className="container relative z-10 mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <SectionTitle
              as="h1"
              subtitle="Frequently Asked Questions"
              title="Everything You Need to Know"
              light
            />
            <p className="mt-6 text-xl text-gray-300 leading-relaxed">
              Answers to common questions about our services, process, pricing, and more.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-24 bg-brand-gray dark:bg-brand-darker">
        <div className="container mx-auto px-4 md:px-8">
          {/* Category Nav */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap gap-3 mb-12"
          >
            {faqCategories.map((cat) => (
              <button
                key={cat.category}
                onClick={() => setActiveCategory(cat.category)}
                className={cn(
                  "px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
                  activeCategory === cat.category
                    ? "bg-brand-dark dark:bg-brand-accent text-white shadow-sm"
                    : "bg-white dark:bg-gray-900 text-brand-dark dark:text-gray-300 hover:bg-brand-accent hover:text-white dark:hover:bg-brand-accent border border-gray-200 dark:border-gray-800"
                )}
              >
                {cat.category}
              </button>
            ))}
          </motion.div>

          {/* FAQ Items */}
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-2xl font-display font-bold text-brand-dark dark:text-white mb-8">
              {currentCategory?.category}
            </h2>
            <FAQAccordion items={flatFaqs} />
          </motion.div>
        </div>
      </section>

      {/* Still have questions CTA */}
      <section className="py-24 bg-white dark:bg-brand-darker border-t border-gray-100 dark:border-gray-800">
        <div className="container mx-auto px-4 md:px-8 text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-brand-dark dark:text-white mb-6">
            Still Have Questions?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Can't find the answer you're looking for? Get in touch and we'll help.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="tel:0406409668"
              className="inline-flex items-center px-8 py-4 bg-brand-accent text-white font-medium rounded-lg hover:bg-brand-accent-hover transition-colors"
            >
              Call 0406 409 668
            </a>
            <a
              href="/contact"
              className="inline-flex items-center px-8 py-4 border border-brand-dark dark:border-gray-600 text-brand-dark dark:text-gray-300 font-medium rounded-lg hover:bg-brand-gray dark:hover:bg-gray-800 transition-colors"
            >
              Send a Message
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
