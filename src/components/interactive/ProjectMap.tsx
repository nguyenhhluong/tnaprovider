import { useState } from "react";
import { projectLocations, uniqueSectors, uniqueStates } from "../../data/projectLocations";
import { Link } from "react-router-dom";
import { MapPin, Search, X } from "lucide-react";
import { Button } from "../ui/Button";

export function ProjectMap() {
  const [selectedSector, setSelectedSector] = useState<string>("All");
  const [selectedState, setSelectedState] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = projectLocations.filter((loc) => {
    const matchesSector = selectedSector === "All" || loc.sector === selectedSector;
    const matchesState = selectedState === "All" || loc.state === selectedState;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      loc.projectTitle.toLowerCase().includes(query) ||
      loc.suburb.toLowerCase().includes(query) ||
      loc.sector.toLowerCase().includes(query) ||
      loc.projectType.toLowerCase().includes(query);
    return matchesSector && matchesState && matchesSearch;
  });

  const resetFilters = () => {
    setSelectedSector("All");
    setSelectedState("All");
    setSearchQuery("");
  };

  const hasFilters = selectedSector !== "All" || selectedState !== "All" || searchQuery;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by project, suburb, or sector..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 pl-10 pr-4 rounded-lg border border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors w-full"
          />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sector</label>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
          >
            <option value="All">All Sectors</option>
            {uniqueSectors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">State</label>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
          >
            <option value="All">All States</option>
            {uniqueStates.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-display font-bold text-brand-dark dark:text-white mb-2">
            No projects found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Try adjusting your filters or search.
          </p>
          <Button variant="outline" onClick={resetFilters}>Clear Filters</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((loc) => (
            <Link
              key={loc.id}
              to={loc.projectLink}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 hover:shadow-md hover:border-brand-accent/30 transition-all group"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent flex-shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-display font-bold text-brand-dark dark:text-white group-hover:text-brand-accent transition-colors truncate">
                    {loc.projectTitle}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {loc.suburb}, {loc.state}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-brand-accent/10 text-brand-accent text-xs font-semibold rounded-full">
                  {loc.sector}
                </span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-semibold rounded-full">
                  {loc.projectType}
                </span>
              </div>
              <p className="mt-4 text-sm text-brand-accent font-semibold group-hover:underline">
                View project →
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
