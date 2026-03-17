import React from "react";
import LegalLayout, { LegalSection } from "../components/legal/LegalLayout";
import { COMPANY } from "../lib/company";

export default function TermsOfServicePage() {
  return (
    <LegalLayout
      title="Terms of Service"
      companyName={COMPANY.name}
      abn={COMPANY.abn}
      lastUpdated={COMPANY.lastUpdated}
    >
      <LegalSection title="1. Overview">
        <p>
          These Terms of Service govern your use of tnaprovider.com.au. By
          accessing or using this website, you agree to these terms. If you do
          not agree, you should stop using the website.
        </p>
      </LegalSection>

      <LegalSection title="2. Website purpose">
        <p>
          This website provides general information about TNA Provider, our
          services, project capabilities and ways to contact us.
        </p>
        <p>
          The content is intended for general informational purposes only. It is
          not a binding quote, project commitment, engineering advice, design
          certification or professional construction advice unless expressly
          confirmed by us in writing.
        </p>
      </LegalSection>

      <LegalSection title="3. Quotes and project information">
        <p>
          Any quote request, enquiry, discussion or information submitted
          through this website does not create a binding contract.
        </p>
        <p>
          A project will only proceed under separate written terms, proposal
          documents, quotations, purchase orders, subcontract terms or other
          formal agreements accepted by the parties.
        </p>
      </LegalSection>

      <LegalSection title="4. Accuracy of information">
        <p>
          We aim to keep website content accurate and current. However, we do
          not warrant that all information on the website is complete, current
          or free from error at all times.
        </p>
        <p>
          Service descriptions, project examples, timelines and availability may
          change without notice.
        </p>
      </LegalSection>

      <LegalSection title="5. Permitted use">
        <p>
          You may use this website for lawful purposes only and in a way that
          does not interfere with the operation, security or availability of the
          site.
        </p>
        <p>You must not:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>use the website for unlawful, misleading or fraudulent purposes</li>
          <li>
            attempt to gain unauthorised access to the site, server or
            the systems
          </li>
          <li>
            copy, scrape, reproduce or exploit website content for commercial
            use without permission
          </li>
          <li>introduce malicious code, spam or harmful material</li>
          <li>interfere with the website's normal operation</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Intellectual property">
        <p>
          Unless otherwise stated, the content on this website, including text,
          layout, graphics, branding, logos, photographs and design elements, is
          owned by or licensed to TNA Provider.
        </p>
        <p>
          You must not reproduce, adapt, distribute, publish or commercially use
          website content without our prior written consent.
        </p>
      </LegalSection>

      <LegalSection title="7. Third-party links">
        <p>
          This website may contain links to external websites for convenience
          only. Those links do not imply endorsement or approval.
        </p>
        <p>
          We are not responsible for the content, availability or practices of
          third-party websites.
        </p>
      </LegalSection>

      <LegalSection title="8. No reliance">
        <p>
          While we aim to provide useful information, you should not rely solely
          on website content when making commercial, construction, financial,
          legal or operational decisions.
        </p>
        <p>You should obtain your own independent advice where appropriate.</p>
      </LegalSection>

      <LegalSection title="9. Website availability">
        <p>
          We do not guarantee uninterrupted, secure or error-free access to the
          website.
        </p>
        <p>
          We may suspend, withdraw, modify or restrict access to all or part of
          the website at any time without notice.
        </p>
      </LegalSection>

      <LegalSection title="10. Limitation of liability">
        <p>
          To the maximum extent permitted by law, TNA Provider excludes
          liability for any loss, damage, cost or expense arising from or in
          connection with:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>your use of, or inability to use, this website</li>
          <li>reliance on website content</li>
          <li>technical errors, interruptions or outages</li>
          <li>viruses, malicious code or unauthorised access</li>
          <li>third-party websites or services linked from this website</li>
        </ul>
        <p>
          Nothing in these terms excludes rights or remedies that cannot be
          excluded under applicable law.
        </p>
      </LegalSection>

      <LegalSection title="11. Privacy">
        <p>
          Your use of this website is also subject to our Privacy Policy, which
          explains how we collect and handle personal information.
        </p>
      </LegalSection>

      <LegalSection title="12. User submissions">
        <p>
          If you submit information through the website, including via contact
          or quote forms, you confirm that:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>the information you provide is accurate to the best of your knowledge</li>
          <li>you have the right to provide that information</li>
          <li>your submission does not infringe the rights of another person</li>
          <li>
            your submission does not contain unlawful, defamatory or harmful
            material
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="13. Governing law">
        <p>
          These Terms of Service are governed by the laws of New South Wales,
          Australia.
        </p>
        <p>
          Any dispute arising in connection with these terms or the website will
          be subject to the non-exclusive jurisdiction of the courts of New
          South Wales.
        </p>
      </LegalSection>

      <LegalSection title="14. Changes to these terms">
        <p>
          We may update these Terms of Service from time to time. The updated
          version will be published on this website with a revised effective
          date.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
