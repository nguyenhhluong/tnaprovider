# TNA Provider Website

Official website for **TNA Provider** — an Australian construction, joinery, and shopfitting company delivering end-to-end solutions for commercial and retail spaces.

TNA Provider combines bespoke joinery fabrication, on-site construction, and disciplined project management to deliver high-quality environments from concept through to completion.

**ABN:** 80 664 454 924

---

## Overview

This project contains the source code for the TNA Provider marketing website. The site is designed to present the company's services, sectors, project capability, and contact pathways in a clear, premium, and trustworthy way.

The website is built as a modern React application with a focus on:

- strong commercial presentation
- responsive design across desktop and mobile
- fast static deployment
- clear service messaging
- scalable component structure
- conversion-focused contact experience

---

## What the Website Covers

The website is structured to communicate TNA Provider's core capabilities across commercial and retail environments, including:

- **Custom Joinery Manufacturing**
- **Shopfitting & Interior Fitouts**
- **Commercial Construction**
- **Cabinet Making**
- **Design & Planning**

It is intended to support lead generation while reinforcing trust, workmanship, and delivery capability.

---

## Tech Stack

This project is built with:

- **React**
- **TypeScript**
- **Vite**
- **Tailwind CSS**

Additional libraries may be used for animation, routing, or page interactions depending on the current implementation.

---

## Local Development

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

### Create a production build

```bash
npm run build
```

### Preview the production build locally

```bash
npm run preview
```

---

## Production Deployment

This website is intended to be deployed as a static build.

Typical production flow:

```bash
npm install
npm run build
```

The build output is generated in the `dist/` directory and can be served by a web server such as Caddy, Nginx, or a static hosting platform.

For the current production setup, the site is served behind Caddy with HTTPS enabled for:

- https://tnaprovider.com.au
- https://www.tnaprovider.com.au

---

## Project Goals

This website is designed to achieve the following:

- present TNA Provider as a premium, reliable commercial contractor
- showcase end-to-end capability from planning to handover
- support trust through strong messaging and professional presentation
- make service information easy to understand
- provide a clear path for quote requests and enquiries

---

## Content and Branding Notes

When updating the site, keep the tone:

- professional
- direct
- trustworthy
- premium but practical

Avoid generic startup language, template-style copy, or exaggerated claims.

The website should consistently reflect TNA Provider's position as a commercial construction, joinery, and shopfitting business serving retail, hospitality, office, and specialist environments.

---

## Recommended Content Areas

The main site experience should continue to support:

- homepage storytelling and trust-building
- service detail sections
- industry / sector coverage
- project or case study highlights
- contact and quote request flow
- legal pages such as Privacy Policy and Terms of Service

---

## Project Structure

A typical structure may look like this:

```
src/
  components/
  pages/
  assets/
  lib/
  App.tsx
  main.tsx
public/
```

The exact structure may evolve as the site grows, but the codebase should remain clean, modular, and easy to maintain.

---

## Design Direction

The visual direction for this project should remain aligned with the brand:

- clean and premium layout
- strong typography
- spacious section design
- polished imagery
- restrained motion
- commercial credibility over visual gimmicks

The goal is to make the site feel launch-ready and trustworthy, not template-derived.

---

## Legal

This repository includes website legal content:

- Privacy Policy
- Terms of Service

These should be reviewed periodically and updated to reflect current business details and legal requirements.

---

## Contact

TNA Provider  
ABN 80 664 454 924  
Website: https://tnaprovider.com.au

For business or project enquiries, use the contact pathways provided on the live site.

---

## Maintenance Notes

Before deploying updates:

1. confirm branding and metadata are correct
2. remove placeholder content
3. verify responsive layout on mobile and desktop
4. run a clean production build
5. confirm the live deployment reflects the latest changes

This project should be maintained to a professional production standard.
