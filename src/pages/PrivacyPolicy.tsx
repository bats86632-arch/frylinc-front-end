import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0f0f0e] text-[#f0ede8] p-6 md:p-12">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-[#7a7773] hover:text-[#f0ede8] mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to App</span>
        </Link>
        
        <h1 className="font-display text-[32px] font-bold mb-4">Privacy Policy</h1>
        <p className="text-[#7a7773] mb-8">Last updated: June 2026</p>

        <div className="space-y-6 text-[#7a7773] text-[15px] leading-relaxed">
          <section>
            <h2 className="text-[18px] font-bold text-[#f0ede8] mb-3">1. Information We Collect</h2>
            <p>We collect information that you provide directly to us when using the Fyrlinc platform. This includes personal information such as your name, email address, and role within your organization. We also collect telemetry and diagnostic data from registered fire alarm panels.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-[#f0ede8] mb-3">2. How We Use Information</h2>
            <p>We use the information we collect to operate, maintain, and provide the features and functionality of the Service. This includes monitoring fire panel statuses, alerting you of incidents, and providing technical support.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-[#f0ede8] mb-3">3. Data Security</h2>
            <p>We implement appropriate technical and organizational security measures designed to protect your personal information against accidental or unlawful destruction, loss, alteration, and unauthorized disclosure or access.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-[#f0ede8] mb-3">4. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at support@fyrlinc.com.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
