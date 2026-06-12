import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#0f0f0e] text-[#f0ede8] p-6 md:p-12">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-[#7a7773] hover:text-[#f0ede8] mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to App</span>
        </Link>
        
        <h1 className="font-display text-[32px] font-bold mb-4">Terms of Service</h1>
        <p className="text-[#7a7773] mb-8">Last updated: June 2026</p>

        <div className="space-y-6 text-[#7a7773] text-[15px] leading-relaxed">
          <section>
            <h2 className="text-[18px] font-bold text-[#f0ede8] mb-3">1. Agreement to Terms</h2>
            <p>By accessing or using the Fyrlinc platform, you agree to be bound by these Terms. If you disagree with any part of the terms, then you do not have permission to access the Service.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-[#f0ede8] mb-3">2. Acceptable Use</h2>
            <p>You agree not to use the Service in any way that violates any applicable national or international law or regulation. The platform is designed solely for monitoring registered fire alarm systems.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-[#f0ede8] mb-3">3. Accounts</h2>
            <p>When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-[#f0ede8] mb-3">4. Limitation of Liability</h2>
            <p>In no event shall Fyrlinc, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
