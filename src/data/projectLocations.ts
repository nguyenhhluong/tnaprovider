export interface ProjectLocation {
  id: string;
  projectTitle: string;
  suburb: string;
  state: string;
  sector: string;
  projectType: string;
  projectLink: string;
}

export const projectLocations: ProjectLocation[] = [
  {
    id: "1",
    projectTitle: "Charcoal Entertainment Unit",
    suburb: "Sydney",
    state: "NSW",
    sector: "Residential",
    projectType: "Custom Joinery",
    projectLink: "/projects/1",
  },
  {
    id: "2",
    projectTitle: "Bespoke Dining Storage",
    suburb: "Melbourne",
    state: "VIC",
    sector: "Residential",
    projectType: "Custom Cabinetry",
    projectLink: "/projects/2",
  },
  {
    id: "3",
    projectTitle: "Minimalist White Kitchen",
    suburb: "Brisbane",
    state: "QLD",
    sector: "Residential",
    projectType: "Kitchen Fitout",
    projectLink: "/projects/3",
  },
  {
    id: "4",
    projectTitle: "Luxury Master Suite",
    suburb: "Gold Coast",
    state: "QLD",
    sector: "Residential",
    projectType: "Bathroom & Wardrobe Fitout",
    projectLink: "/projects/4",
  },
  {
    id: "5",
    projectTitle: "North Shore Office Reception",
    suburb: "Perth",
    state: "WA",
    sector: "Commercial Office",
    projectType: "Commercial Joinery",
    projectLink: "/projects/5",
  },
  {
    id: "6",
    projectTitle: "Retail Storefront Fitout",
    suburb: "Sydney CBD",
    state: "NSW",
    sector: "Retail",
    projectType: "Shopfitting",
    projectLink: "/projects/6",
  },
  {
    id: "7",
    projectTitle: "Medical Centre Reception",
    suburb: "North Sydney",
    state: "NSW",
    sector: "Healthcare",
    projectType: "Medical Fitout",
    projectLink: "/projects/7",
  },
  {
    id: "8",
    projectTitle: "Restaurant & Bar Fitout",
    suburb: "Melbourne CBD",
    state: "VIC",
    sector: "Hospitality",
    projectType: "Hospitality Fitout",
    projectLink: "/projects/8",
  },
  {
    id: "9",
    projectTitle: "Corporate Office Refurbishment",
    suburb: "Adelaide",
    state: "SA",
    sector: "Commercial Office",
    projectType: "Office Fitout",
    projectLink: "/projects/9",
  },
  {
    id: "10",
    projectTitle: "Boutique Hotel Joinery",
    suburb: "Hobart",
    state: "TAS",
    sector: "Hospitality",
    projectType: "Custom Joinery",
    projectLink: "/projects/10",
  },
  {
    id: "11",
    projectTitle: "Shopping Centre Kiosk",
    suburb: "Darwin",
    state: "NT",
    sector: "Retail",
    projectType: "Shopfitting",
    projectLink: "/projects/11",
  },
  {
    id: "12",
    projectTitle: "Government Office Fitout",
    suburb: "Canberra",
    state: "ACT",
    sector: "Commercial Office",
    projectType: "Office Fitout",
    projectLink: "/projects/12",
  },
  {
    id: "13",
    projectTitle: "Premium Residential Joinery",
    suburb: "Sydney",
    state: "NSW",
    sector: "Residential",
    projectType: "Custom Joinery",
    projectLink: "/projects/13",
  },
];

export const uniqueSectors = [...new Set(projectLocations.map(l => l.sector))].sort();
export const uniqueStates = [...new Set(projectLocations.map(l => l.state))].sort();
