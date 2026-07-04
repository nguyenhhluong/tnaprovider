export interface LocationData {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  heroDescription: string;
  image: string;
  suburbs: string[];
  industries: string[];
  faqs: { question: string; answer: string }[];
}

export const locations: LocationData[] = [
  {
    id: "sydney",
    slug: "sydney",
    name: "Sydney",
    subtitle: "Sydney's Trusted Commercial Fitout Specialists",
    description:
      "TNA Provider delivers premium commercial fitouts, shopfitting, joinery, and construction services across Sydney. From the CBD to the suburbs, we transform commercial spaces with in-house manufacturing and end-to-end project management.",
    heroDescription:
      "Sydney's leading commercial fitout company — delivering premium joinery, shopfitting, and construction across the city.",
    image:
      "https://images.unsplash.com/photo-1505881502353-a1986f37668a?auto=format&fit=crop&q=80&w=1600",
    suburbs: [
      "Sydney CBD",
      "Surry Hills",
      "Paddington",
      "Darlinghurst",
      "Pyrmont",
      "Ultimo",
      "Chippendale",
      "Redfern",
      "Alexandria",
      "Zetland",
      "Green Square",
      "Barangaroo",
      "The Rocks",
      "Woolloomooloo",
    ],
    industries: [
      "Corporate Offices",
      "Retail & Showrooms",
      "Hospitality & Cafes",
      "Healthcare & Medical",
      "Coworking Spaces",
      "Educational Facilities",
      "Fitness & Wellness",
      "Government & Institutional",
    ],
    faqs: [
      {
        question: "What areas of Sydney do you service?",
        answer: "We cover all of Sydney including the CBD, Inner West, Eastern Suburbs, North Shore, and Greater Western Sydney. Our team works across the full metropolitan area and can travel to any commercial location within Sydney.",
      },
      {
        question: "How long does a commercial fitout take in Sydney?",
        answer: "Timelines depend on scope. A small retail fitout in Surry Hills or Paddington typically takes 4-6 weeks. Full office fitouts in the CBD or Barangaroo can take 8-16 weeks. We provide a detailed schedule at quote stage.",
      },
      {
        question: "Can you work after hours in Sydney CBD buildings?",
        answer: "Yes. Many of our Sydney CBD projects are completed after hours and on weekends to minimise disruption. We coordinate with building management and comply with all strata and council requirements for out-of-hours work.",
      },
      {
        question: "Do you handle heritage-listed buildings in Sydney?",
        answer: "Absolutely. We have extensive experience working on heritage-listed commercial properties in The Rocks, Paddington, and Surry Hills. We work closely with heritage consultants and councils to ensure compliance.",
      },
      {
        question: "What makes TNA Provider different from other Sydney fitout companies?",
        answer: "We manufacture our own joinery in-house at our South Granville facility. This means faster turnaround, direct quality control, and no reliance on third-party suppliers. You get one team managing everything from design to installation.",
      },
    ],
  },
  {
    id: "parramatta",
    slug: "parramatta",
    name: "Parramatta",
    subtitle: "Commercial Fitout Experts in Parramatta",
    description:
      "TNA Provider delivers complete commercial fitout services in Parramatta and the surrounding suburbs. From office refurbishments to retail shopfits, our team brings in-house joinery manufacturing and proven project management to Western Sydney's premier commercial hub.",
    heroDescription:
      "Expert commercial fitouts in Parramatta — joinery, shopfitting, and construction delivered by experienced local teams.",
    image:
      "https://images.unsplash.com/photo-1577415124269-fc1140a69e91?auto=format&fit=crop&q=80&w=1600",
    suburbs: [
      "Parramatta CBD",
      "Harris Park",
      "Westmead",
      "North Parramatta",
      "Granville",
      "South Granville",
      "Camellia",
      "Rosehill",
      "Rydalmere",
      "Ermington",
      "Dundas",
      "Telopea",
      "Oatlands",
      "Carlingford",
    ],
    industries: [
      "Corporate Offices",
      "Medical & Healthcare",
      "Retail & Shopping Centres",
      "Educational Institutions",
      "Hospitality & Dining",
      "Government & Civic",
      "Fitness & Recreation",
      "Community Facilities",
    ],
    faqs: [
      {
        question: "Do you service the Parramatta CBD and surrounding suburbs?",
        answer: "Yes. We cover the entire Parramatta region including the CBD, Westmead, Harris Park, North Parramatta, and all surrounding suburbs. Our team is based locally at our South Granville manufacturing facility, just minutes from Parramatta.",
      },
      {
        question: "How long does an office fitout take in Parramatta?",
        answer: "A typical office fitout in Parramatta of 200-500sqm takes 6-12 weeks from site handover. We understand the local council requirements and coordinate all approvals to keep your project on track.",
      },
      {
        question: "Can you work within Westfield Parramatta or other shopping centres?",
        answer: "Yes. We have extensive experience working within shopping centres including Westfield Parramatta. We understand centre management requirements, after-hours access protocols, and strict trading hour constraints.",
      },
      {
        question: "Do you handle medical fitouts for Westmead Hospital precinct?",
        answer: "Yes. We specialise in medical and healthcare fitouts, including projects in the Westmead health precinct. Our team understands the strict compliance, infection control, and certification requirements for medical environments.",
      },
      {
        question: "Why choose TNA Provider for a Parramatta fitout?",
        answer: "Our manufacturing facility is located in South Granville, just 10 minutes from Parramatta CBD. This local presence means faster response times, lower transport costs, and a team that understands the Parramatta market and council requirements.",
      },
    ],
  },
  {
    id: "liverpool",
    slug: "liverpool",
    name: "Liverpool",
    subtitle: "Commercial Fitout Services in Liverpool",
    description:
      "TNA Provider offers comprehensive commercial fitout, shopfitting, and joinery services across Liverpool and South Western Sydney. Our in-house team delivers quality commercial spaces for businesses in this rapidly growing region.",
    heroDescription:
      "Professional commercial fitouts in Liverpool — transforming spaces for businesses across South Western Sydney.",
    image:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=1600",
    suburbs: [
      "Liverpool CBD",
      "Moorebank",
      "Prestons",
      "Casula",
      "Miller",
      "Cartwright",
      "Lurnea",
      "Hammondville",
      "Holsworthy",
      "Wattle Grove",
      "Liverpool West",
      "Chipping Norton",
      "Warwick Farm",
      "Edmondson Park",
    ],
    industries: [
      "Retail & Showrooms",
      "Industrial & Warehouse",
      "Medical & Allied Health",
      "Hospitality & Cafes",
      "Educational Facilities",
      "Fitness Centres",
      "Automotive Showrooms",
      "Community & Civic",
    ],
    faqs: [
      {
        question: "What areas of Liverpool do you cover?",
        answer: "We service all of Liverpool and the surrounding suburbs including Moorebank, Casula, Prestons, Holsworthy, Edmondson Park, and the Liverpool CBD. We also travel to Campbelltown and Camden for larger projects.",
      },
      {
        question: "How long does a retail shopfit take in Liverpool?",
        answer: "A standard retail shopfit in Liverpool of 50-150sqm typically takes 4-8 weeks. We work efficiently to get your doors open as quickly as possible, coordinating with shopping centre management where required.",
      },
      {
        question: "Do you handle industrial fitouts in Liverpool?",
        answer: "Yes. Liverpool is a major industrial and logistics hub. We have extensive experience fitting out warehouses, distribution centres, showrooms, and industrial offices in the Liverpool industrial precinct.",
      },
      {
        question: "Can you manage council approvals in Liverpool?",
        answer: "Yes. Our team is familiar with Liverpool City Council requirements and handles all necessary Development Applications, Complying Development Certificates, and compliance documentation for your fitout.",
      },
      {
        question: "What types of businesses do you fit out in Liverpool?",
        answer: "We work with a diverse range of businesses in Liverpool including retail stores, medical clinics, allied health practices, gyms, cafes, restaurants, automotive showrooms, and industrial warehouses.",
      },
    ],
  },
  {
    id: "bankstown",
    slug: "bankstown",
    name: "Bankstown",
    subtitle: "Commercial Fitout Services in Bankstown",
    description:
      "TNA Provider delivers quality commercial fitouts, shopfitting, and joinery solutions across Bankstown and the Canterbury-Bankstown region. Our in-house manufacturing and experienced teams ensure your commercial space is delivered on time and on budget.",
    heroDescription:
      "Quality commercial fitouts in Bankstown — shopfitting, joinery, and construction for local businesses.",
    image:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=1600",
    suburbs: [
      "Bankstown CBD",
      "Condell Park",
      "Yagoona",
      "Greenacre",
      "Mount Lewis",
      "Punchbowl",
      "Wiley Park",
      "Lakemba",
      "Belmore",
      "Campsie",
      "Canterbury",
      "Earlwood",
      "Padstow",
      "Revesby",
    ],
    industries: [
      "Retail & Boutiques",
      "Medical & Dental",
      "Hospitality & Restaurants",
      "Educational Facilities",
      "Community Centres",
      "Fitness & Gyms",
      "Automotive Services",
      "Childcare Centres",
    ],
    faqs: [
      {
        question: "What suburbs do you cover in the Bankstown area?",
        answer: "We service all of Bankstown and the broader Canterbury-Bankstown region including Condell Park, Yagoona, Greenacre, Punchbowl, Lakemba, Belmore, Campsie, Canterbury, Padstow, and Revesby.",
      },
      {
        question: "Do you handle fitouts in shopping centres like Bankstown Centro?",
        answer: "Yes. We have significant experience fitting out retail spaces within shopping centres including Bankstown Centro (now Bankstown Shopping Centre). We coordinate with centre management for after-hours access and strict project timelines.",
      },
      {
        question: "Can you fit out a medical or dental clinic in Bankstown?",
        answer: "Yes. We specialise in medical and dental fitouts. We understand the specific requirements for treatment rooms, sterilisation areas, reception spaces, and patient flow. Our team ensures compliance with all health department standards.",
      },
      {
        question: "How much does a commercial fitout cost in Bankstown?",
        answer: "Costs vary based on scope and finishes. A small retail or cafe fitout typically ranges from $50,000 to $150,000. Full medical or office fitouts range from $150,000 to $500,000+. We provide detailed itemised quotes after understanding your project.",
      },
      {
        question: "Why should I choose TNA Provider for my Bankstown project?",
        answer: "Our joinery factory is located just minutes from Bankstown in South Granville. This means we can offer competitive pricing, faster turnaround, and a local team that understands the Canterbury-Bankstown area and council requirements.",
      },
    ],
  },
  {
    id: "blacktown",
    slug: "blacktown",
    name: "Blacktown",
    subtitle: "Commercial Fitout Services in Blacktown",
    description:
      "TNA Provider offers professional commercial fitout, joinery, and shopfitting services across Blacktown and North Western Sydney. Our in-house manufacturing and dedicated project teams deliver outstanding results for businesses in Western Sydney's growth corridor.",
    heroDescription:
      "Complete commercial fitout solutions in Blacktown — joinery, shopfitting, and construction for growing businesses.",
    image:
      "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&q=80&w=1600",
    suburbs: [
      "Blacktown CBD",
      "Mount Druitt",
      "Doonside",
      "Woodcroft",
      "Rooty Hill",
      "Plumpton",
      "Quakers Hill",
      "Stanhope Gardens",
      "Kellyville Ridge",
      "Schofields",
      "Riverstone",
      "Marsden Park",
      "Richmond",
      "Windsor",
    ],
    industries: [
      "Retail & Shopping Centres",
      "Industrial & Warehousing",
      "Medical & Healthcare",
      "Educational Facilities",
      "Hospitality & Dining",
      "Fitness & Gyms",
      "Automotive & Showrooms",
      "Community & Sports Facilities",
    ],
    faqs: [
      {
        question: "What areas do you cover in Blacktown and Western Sydney?",
        answer: "We cover all of Blacktown and North Western Sydney including Mount Druitt, Doonside, Rooty Hill, Quakers Hill, Stanhope Gardens, Schofields, Marsden Park, Riverstone, and the Hawkesbury region.",
      },
      {
        question: "Do you fit out industrial and warehouse spaces in Blacktown?",
        answer: "Yes. Blacktown is a key industrial and logistics hub. We fit out warehouses, distribution centres, industrial offices, and showrooms across the Blacktown, Eastern Creek, and Marsden Park industrial precincts.",
      },
      {
        question: "How long does a retail fitout take at Westpoint Blacktown?",
        answer: "A standard retail fitout within Westpoint Blacktown or other shopping centres typically takes 4-8 weeks. We coordinate closely with centre management for after-hours access and trading hour restrictions.",
      },
      {
        question: "Can you handle medical fitouts in Blacktown?",
        answer: "Yes. Blacktown has a growing healthcare sector. We fit out medical centres, dental clinics, allied health practices, and specialist consulting suites with full compliance to health regulations and Australian standards.",
      },
      {
        question: "What makes TNA Provider the right choice in Blacktown?",
        answer: "Our manufacturing facility is locally based in South Granville, serving all of Western Sydney. We offer competitive pricing, in-house joinery production, and a proven track record delivering commercial projects across the Blacktown region.",
      },
    ],
  },
  {
    id: "penrith",
    slug: "penrith",
    name: "Penrith",
    subtitle: "Commercial Fitout Experts in Penrith",
    description:
      "TNA Provider delivers comprehensive commercial fitout services across Penrith and the Blue Mountains region. From retail shopfits to office refurbishments, our team brings quality craftsmanship and reliable project management to Western Sydney and beyond.",
    heroDescription:
      "Trusted commercial fitout services in Penrith — joinery, shopfitting, and construction for local businesses.",
    image:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1600",
    suburbs: [
      "Penrith CBD",
      "Jamisontown",
      "Kingswood",
      "Werrington",
      "St Marys",
      "St Clair",
      "Emu Plains",
      "Glenmore Park",
      "Blaxland",
      "Springwood",
      "Katoomba",
      "Wentworth Falls",
      "Leura",
      "Richmond",
    ],
    industries: [
      "Retail & Showrooms",
      "Hospitality & Cafes",
      "Medical & Allied Health",
      "Educational Institutions",
      "Fitness & Recreation",
      "Automotive Services",
      "Community Facilities",
      "Tourism & Accommodation",
    ],
    faqs: [
      {
        question: "Do you service Penrith and the Blue Mountains?",
        answer: "Yes. We cover all of Penrith, the Nepean region, and the Blue Mountains including Jamisontown, Kingswood, Werrington, St Marys, Glenmore Park, Emu Plains, Blaxland, Springwood, Katoomba, Wentworth Falls, and Leura.",
      },
      {
        question: "How long does a cafe or restaurant fitout take in Penrith?",
        answer: "A typical cafe or restaurant fitout in Penrith takes 6-10 weeks. We understand the hospitality industry's need for speed and coordinate commercial kitchen installations, plumbing, and ventilation to get you trading as soon as possible.",
      },
      {
        question: "Can you handle fitouts at Penrith Panthers or other venues?",
        answer: "Yes. We have experience working with large venues and entertainment precincts including clubs, pubs, and function centres. We understand the specific requirements for high-traffic hospitality environments.",
      },
      {
        question: "Do you provide design services for Penrith projects?",
        answer: "Yes. We offer in-house design and planning services including CAD drawings, 3D visualisations, and material selection. We can work with your designers or provide a complete design-and-construct solution.",
      },
      {
        question: "What is the typical timeline for an office fitout in Penrith?",
        answer: "Office fitouts in Penrith typically take 6-14 weeks depending on size and complexity. We provide a clear project schedule during quoting and keep you updated throughout the construction process.",
      },
    ],
  },
  {
    id: "nsw",
    slug: "nsw",
    name: "New South Wales",
    subtitle: "Commercial Fitout Services Across NSW",
    description:
      "TNA Provider delivers commercial fitout, joinery, and construction services throughout New South Wales. Based in Sydney with our own manufacturing facility, we service regional and metropolitan locations across the state.",
    heroDescription:
      "Commercial fitout services across New South Wales — from Sydney to regional centres, we deliver quality commercial spaces statewide.",
    image:
      "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&q=80&w=1600",
    suburbs: [
      "Newcastle",
      "Central Coast",
      "Wollongong",
      "Gosford",
      "Maitland",
      "Port Macquarie",
      "Coffs Harbour",
      "Tamworth",
      "Dubbo",
      "Wagga Wagga",
      "Albury",
      "Orange",
      "Bathurst",
      "Nowra",
    ],
    industries: [
      "Corporate Offices",
      "Retail & Shopping Centres",
      "Hospitality & Tourism",
      "Healthcare & Medical",
      "Educational Institutions",
      "Industrial & Warehousing",
      "Government & Civic",
      "Community & Sporting",
    ],
    faqs: [
      {
        question: "Does TNA Provider work outside of Sydney?",
        answer: "Yes. We deliver projects across all of New South Wales including major regional centres like Newcastle, Wollongong, Central Coast, Port Macquarie, Coffs Harbour, Tamworth, Dubbo, Wagga Wagga, Albury, Orange, and Bathurst.",
      },
      {
        question: "Can you manage regional projects remotely?",
        answer: "Yes. Our project management team is experienced in overseeing regional projects. We coordinate local trades, manage supply chains, and maintain regular on-site presence throughout the construction phase to ensure quality and timelines.",
      },
      {
        question: "How do you handle logistics for regional NSW projects?",
        answer: "We manufacture joinery at our Sydney facility and transport directly to regional sites using our own logistics network. This ensures consistent quality regardless of location and reduces reliance on regional subcontractors.",
      },
      {
        question: "What types of projects do you deliver in regional NSW?",
        answer: "We deliver a wide range of projects across regional NSW including retail fitouts, office refurbishments, hospitality venues, medical centres, educational facilities, and government buildings.",
      },
      {
        question: "Why choose TNA Provider for a regional NSW project?",
        answer: "Our in-house manufacturing gives us control over quality and timelines that most contractors can't match. We bring Sydney standards to regional projects, with a proven track record delivering complex fitouts across the state.",
      },
    ],
  },
];
