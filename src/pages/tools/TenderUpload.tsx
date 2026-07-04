import { SEO } from "../../components/SEO";
import { SectionTitle } from "../../components/ui/SectionTitle";
import { TenderUploadForm } from "../../components/forms/TenderUploadForm";

export function TenderUpload() {
  return (
    <div className="flex flex-col min-h-screen pt-24">
      <SEO
        title="Tender & Drawing Upload | TNA Provider"
        description="Upload your tender documents, drawings, and project specifications for review by the TNA Provider team."
        canonical="https://tnaprovider.com.au/tools/tender-upload"
      />
      <section className="bg-brand-darker text-white py-24 md:py-32 relative overflow-hidden">
        <div className="container relative z-10 mx-auto px-4 md:px-8">
          <div className="max-w-3xl">
            <SectionTitle
              as="h1"
              subtitle="Tender Upload"
              title="Submit Your Tender Documents"
              light
            />
            <p className="mt-6 text-xl text-gray-300 leading-relaxed">
              Upload your drawings and specifications for review. Accepted formats: PDF, DWG, DXF, ZIP, JPG, PNG, WEBP, RVT, IFC.
            </p>
          </div>
        </div>
      </section>
      <section className="py-24 bg-brand-gray dark:bg-brand-darker">
        <div className="container mx-auto px-4 md:px-8">
          <TenderUploadForm />
        </div>
      </section>
    </div>
  );
}
