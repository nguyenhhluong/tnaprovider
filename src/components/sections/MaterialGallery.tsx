import { useState } from "react";
import { materials, materialCategories, type MaterialItem } from "../../data/materials";
import { Button } from "../ui/Button";
import { Search, ImageOff, X } from "lucide-react";

export function MaterialGallery() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = materials.filter((m) => {
    const matchesCategory = selectedCategory === "All" || m.category === selectedCategory;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      m.title.toLowerCase().includes(query) ||
      m.category.toLowerCase().includes(query) ||
      m.bestUseCase.toLowerCase().includes(query) ||
      m.supplier.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const resetFilters = () => {
    setSelectedCategory("All");
    setSearchQuery("");
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 pl-10 pr-4 rounded-lg border border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors w-full"
          />
        </div>
        {(selectedCategory !== "All" || searchQuery) && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory("All")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === "All"
              ? "bg-brand-accent text-white"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-brand-accent"
          }`}
        >
          All
        </button>
        {materialCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat
                ? "bg-brand-accent text-white"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-brand-accent"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ImageOff className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-display font-bold text-brand-dark dark:text-white mb-2">
            No materials found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Try adjusting your search or category filter.
          </p>
          <Button variant="outline" onClick={resetFilters}>Clear Filters</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((material) => (
            <MaterialCard key={material.id} material={material} />
          ))}
        </div>
      )}
    </div>
  );
}

function MaterialCard({ material: m }: { material: MaterialItem }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
        {m.imageUrl && !imageError ? (
          <img
            src={m.imageUrl}
            alt={m.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
        )}
      </div>
      <div className="p-5">
        <span className="text-xs font-semibold text-brand-accent uppercase tracking-wider">
          {m.category}
        </span>
        <h3 className="text-lg font-display font-bold text-brand-dark dark:text-white mt-1 mb-3">
          {m.title}
        </h3>
        <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <p><strong className="text-brand-dark dark:text-white">Durability:</strong> {m.durabilityNote}</p>
          <p><strong className="text-brand-dark dark:text-white">Best for:</strong> {m.bestUseCase}</p>
          <p><strong className="text-brand-dark dark:text-white">Care:</strong> {m.cleaningNote}</p>
          {m.supplier && (
            <p><strong className="text-brand-dark dark:text-white">Supplier:</strong> {m.supplier}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => window.location.href = "/contact"}
        >
          Ask TNA About This Material
        </Button>
      </div>
    </div>
  );
}
