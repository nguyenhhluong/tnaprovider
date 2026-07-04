export interface CapabilityStatement {
  sector: string;
  title: string;
  description: string;
  deliverables: string[];
  bestFitClients: string[];
  typicalScope: string[];
  pdfPath: string;
  pdfAvailable: boolean;
}

export const capabilityStatements: CapabilityStatement[] = [
  {
    sector: "Retail",
    title: "Retail Fitouts & Shopfitting",
    description: "End-to-end retail fitout solutions that transform commercial spaces into engaging shopping environments. From concept to completion, we deliver high-quality joinery, fixtures, and finishes that elevate your brand.",
    deliverables: [
      "Custom display shelving and joinery",
      "POS counters and checkout stations",
      "Fitting rooms and storage solutions",
      "Flooring, lighting, and ceiling installation",
      "Brand signage and graphics integration",
    ],
    bestFitClients: ["Fashion and apparel retailers", "Specialty goods stores", "Shopping centre tenants", "Flagship store owners"],
    typicalScope: ["Store fitout", "Refurbishment", "Pop-up build", "Multi-site rollout"],
    pdfPath: "/capability/tna-provider-retail-capability.pdf",
    pdfAvailable: false,
  },
  {
    sector: "Hospitality",
    title: "Hospitality Fitouts",
    description: "Complete hospitality fitout services for restaurants, cafes, bars, and hotels. We create inviting, functional, and durable spaces that handle high traffic while delivering exceptional customer experiences.",
    deliverables: [
      "Bar and counter joinery",
      "Restaurant seating and booth systems",
      "Commercial kitchen fitout coordination",
      "Feature walls and decorative joinery",
      "Outdoor dining areas and alfresco setups",
    ],
    bestFitClients: ["Restaurateurs", "Cafe owners", "Hotel operators", "Bar and venue owners"],
    typicalScope: ["Full restaurant fitout", "Bar installation", "Cafe refurbishment", "Hotel lobby joinery"],
    pdfPath: "/capability/tna-provider-hospitality-capability.pdf",
    pdfAvailable: false,
  },
  {
    sector: "Medical",
    title: "Medical Fitouts",
    description: "Specialised medical and healthcare fitouts that meet stringent compliance requirements while creating comfortable, efficient clinical environments for practitioners and patients.",
    deliverables: [
      "Consultation room joinery",
      "Reception and waiting area fitouts",
      "Treatment room cabinetry",
      "Sterile storage solutions",
      "Compliance-certified material selection",
    ],
    bestFitClients: ["GP clinics", "Dental practices", "Allied health providers", "Specialist medical centres"],
    typicalScope: ["Clinic fitout", "Surgery refurbishment", "Medical centre expansion", "Practice relocation"],
    pdfPath: "/capability/tna-provider-medical-capability.pdf",
    pdfAvailable: false,
  },
  {
    sector: "Corporate Office",
    title: "Office Fitouts",
    description: "Modern office fitout solutions that enhance productivity, collaboration, and workplace culture. We design and build functional work environments tailored to your team's needs.",
    deliverables: [
      "Workstation systems and desk joinery",
      "Meeting room and boardroom fitouts",
      "Breakout areas and kitchen joinery",
      "Reception desk and lobby joinery",
      "Acoustic wall paneling and partitions",
    ],
    bestFitClients: ["SMEs and enterprises", "Coworking operators", "Professional services firms", "Creative agencies"],
    typicalScope: ["Full office fitout", "Floor refurbishment", "Office relocation", "End-of-trip facilities"],
    pdfPath: "/capability/tna-provider-office-capability.pdf",
    pdfAvailable: false,
  },
  {
    sector: "Custom Joinery",
    title: "Bespoke Joinery Manufacturing",
    description: "Premium custom joinery manufacturing for residential and commercial applications. Our workshop produces high-quality cabinetry, furniture, and architectural joinery tailored to your exact specifications.",
    deliverables: [
      "Custom kitchen and bathroom joinery",
      "Built-in wardrobes and storage systems",
      "Entertainment units and feature joinery",
      "Reception desks and commercial counters",
      "Architectural paneling and millwork",
    ],
    bestFitClients: ["Architects and designers", "Homeowners", "Commercial developers", "Interior design firms"],
    typicalScope: ["Custom cabinetry", "Architectural joinery", "Furniture pieces", "Feature installations"],
    pdfPath: "/capability/tna-provider-custom-joinery-capability.pdf",
    pdfAvailable: false,
  },
  {
    sector: "Shopfitting",
    title: "Commercial Shopfitting",
    description: "Professional shopfitting services for retail, hospitality, and commercial spaces. We manage the entire fitout process from concept drawings through to final installation and handover.",
    deliverables: [
      "Full shopfit project management",
      "Custom fixture manufacturing",
      "Glass shopfronts and entrance systems",
      "Security shutters and roller doors",
      "Signage and branding installation",
    ],
    bestFitClients: ["Retail chains", "Franchise operators", "Shopping centre tenants", "Commercial landlords"],
    typicalScope: ["New shop build", "Shop refurbishment", "Brand rollout", "Tenancy fitout"],
    pdfPath: "/capability/tna-provider-shopfitting-capability.pdf",
    pdfAvailable: false,
  },
  {
    sector: "Commercial Construction",
    title: "Commercial Construction",
    description: "General commercial construction and project management services for fitouts, refurbishments, and new builds. We coordinate trades, manage timelines, and deliver quality outcomes.",
    deliverables: [
      "Project management and coordination",
      "Structural alterations and partitions",
      "MEP trade coordination",
      "Flooring, ceiling, and wall systems",
      "Final finishing and handover",
    ],
    bestFitClients: ["Property developers", "Business owners", "Facility managers", "Investment firms"],
    typicalScope: ["Commercial fitout", "Refurbishment", "Heritage restoration", "Project management"],
    pdfPath: "/capability/tna-provider-commercial-construction-capability.pdf",
    pdfAvailable: false,
  },
];
