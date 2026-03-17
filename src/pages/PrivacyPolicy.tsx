import React from "react";
import LegalLayout, { LegalSection } from "../components/legal/LegalLayout";
import { COMPANY } from "../lib/company";

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      companyName={COMPANY.name}
      abn={COMPANY.abn}
      lastUpdated={COMPANY.lastUpdated}
    >
      <LegalSection title="1. Overview">
        <p>
          TNA Provider respects your privacy and is committed to handling
          personal information responsibly. This Privacy Policy explains how we
          collect, use, store and disclose personal information when you visit
          tnaprovider.com.au, contact us, request a quote, or otherwise
          interact with our business.
        </p>
      </LegalSection>

      <LegalSection title="2. Who we are">
        <p>
          TNA Provider is an Australian construction, joinery and shopfitting
          business providing services for commercial and retail spaces.
        </p>
        <p>
          If you have questions about this Privacy Policy or the way we handle
          personal information, contact us at:
        </p>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
          <p className="font-medium text-zinc-900">{COMPANY.name}</p>
          <p>ABN {COMPANY.abn}</p>
          <p>Email: {COMPANY.email}</p>
          <p>Phone: {COMPANY.phone}</p>
          <p>Address: {COMPANY.address}</p>
        </div>
      </LegalSection>

      <LegalSection title="3. What information we collect">
        <p>We may collect personal information such as:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>your name</li>
          <li>company or business name</li>
          <li>email address</li>
          <li>phone number</li>
          <li>project location</li>
          <li>project type and scope details</li>
          <li>information you provide in enquiry forms, emails or calls</li>
          <li>
            website usage information such as IP address, browser type, device
            information, pages visited and referring website
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. How we collect information">
        <p>We collect personal information directly from you when you:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>fill out a contact or quote request form</li>
          <li>email or call us</li>
          <li>submit project information</li>
          <li>interact with us through social media or other channels</li>
          <li>browse our website</li>
        </ul>
        <p>
          We may also collect limited technical information automatically
          through cookies, analytics tools and similar technologies.
        </p>
      </LegalSection>

      <LegalSection title="5. Why we collect and use your information">
        <p>We may use your personal information to:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>respond to enquiries</li>
          <li>prepare estimates, proposals or quotations</li>
          <li>communicate about projects or requested services</li>
          <li>provide and manage our services</li>
          <li>improve our website, content and customer experience</li>
          <li>maintain internal records</li>
          <li>comply with legal and regulatory obligations</li>
          <li>
            send updates or marketing communications where permitted by law
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Cookies and website analytics">
        <p>
          Our website may use cookies and similar tools to understand how
          visitors use the site and to improve website performance.
        </p>
        <p>
          These tools may collect information such as pages viewed, time on
          site, browser type, device type and general location data based on IP
          address.
        </p>
        <p>
          You can usually manage cookie settings through your browser.
          Disabling cookies may affect how some parts of the website function.
        </p>
      </LegalSection>

      <LegalSection title="7. Disclosure of information">
        <p>
          We may disclose personal information to third parties where reasonably
          necessary for our operations, including:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>website hosting providers</li>
          <li>IT and technical support providers</li>
          <li>analytics providers</li>
          <li>marketing or communication platforms</li>
          <li>professional advisers such as accountants or lawyers</li>
          <li>
            contractors or consultants involved in a project, where relevant
          </li>
          <li>regulators, courts or government authorities where required by law</li>
        </ul>
        <p>We do not sell personal information.</p>
      </LegalSection>

      <LegalSection title="8. Overseas disclosure">
        <p>
          Some of our technology providers may store or process information
          outside Australia. Where this occurs, we take reasonable steps to
          work with reputable providers and to ensure personal information is
          handled appropriately.
        </p>
      </LegalSection>

      <LegalSection title="9. Storage and security">
        <p>
          We take reasonable steps to protect personal information from misuse,
          interference, loss, unauthorised access, modification or disclosure.
        </p>
        <p>
          However, no method of internet transmission or electronic storage is
          completely secure. While we take care, we cannot guarantee absolute
          security.
        </p>
      </LegalSection>

      <LegalSection title="10. Access and correction">
        <p>
          You may request access to personal information we hold about you, or
          ask us to correct information that is inaccurate, out of date or
          incomplete.
        </p>
        <p>
          To make a request, contact us using the details listed in this
          policy.
        </p>
      </LegalSection>

      <LegalSection title="11. Marketing communications">
        <p>
          If we send marketing communications, you can opt out at any time by
          using the unsubscribe link where available or by contacting us
          directly.
        </p>
      </LegalSection>

      <LegalSection title="12. Third-party websites">
        <p>
          Our website may contain links to third-party websites. We are not
          responsible for the privacy practices, content or security of those
          external sites.
        </p>
      </LegalSection>

      <LegalSection title="13. Complaints">
        <p>
          If you have a complaint about how we handle your personal
          information, contact us first and we will try to resolve it promptly.
        </p>
      </LegalSection>

      <LegalSection title="14. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. Any updated
          version will be posted on this website with a revised effective date.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
