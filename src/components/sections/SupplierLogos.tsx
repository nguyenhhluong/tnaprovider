import { motion } from "motion/react";
import { SectionTitle } from "../ui/SectionTitle";
import { suppliers } from "../../data/suppliers";

export function SupplierLogos() {
  return (
    <section className="py-16 bg-white dark:bg-brand-darker border-t border-gray-100 dark:border-gray-800">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <SectionTitle
            subtitle="Brands & Materials"
            title="Brands and Materials We Can Work With"
            align="center"
          />
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {suppliers.map((supplier, index) => (
            <motion.div
              key={supplier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-brand-gray dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-brand-accent/30 hover:shadow-sm transition-all duration-300"
            >
              <span className="text-sm font-bold text-brand-dark dark:text-white text-center leading-tight">
                {supplier.name}
              </span>
              <span className="text-[10px] text-gray-400 mt-1 text-center leading-tight hidden sm:block">
                {supplier.description}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
