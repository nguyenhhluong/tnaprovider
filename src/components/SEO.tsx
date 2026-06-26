import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
}

const SITE_NAME = "TNA Provider";
const DEFAULT_OG_IMAGE = "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=1200&h=630&fit=crop";

function setMeta(name: string, content: string, property = false) {
  const attr = property ? "property" : "name";
  const key = `${attr}="${name}"`;
  let el = document.querySelector(`meta[${key}]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function SEO({ title, description, canonical, ogImage = DEFAULT_OG_IMAGE }: SEOProps) {
  useEffect(() => {
    document.title = title;

    setMeta("description", description);
    setMeta("og:type", "website", true);
    setMeta("og:url", canonical, true);
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:image", ogImage, true);
    setMeta("og:image:width", "1200", true);
    setMeta("og:image:height", "630", true);
    setMeta("og:site_name", SITE_NAME, true);
    setMeta("twitter:card", "summary_large_image", true);
    setMeta("twitter:url", canonical, true);
    setMeta("twitter:title", title, true);
    setMeta("twitter:description", description, true);
    setMeta("twitter:image", ogImage, true);

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", canonical);

    return () => {
      document.title = "TNA Provider | Commercial Fitouts, Shopfitting & Joinery Sydney";
    };
  }, [title, description, canonical, ogImage]);

  return null;
}
