import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function TermsOfService() {
  return (
    <div className="legal-page min-h-screen console-bg p-6 text-[var(--text-primary)] md:p-12">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to App</span>
        </Link>

        <h1 className="font-display mb-4 text-[32px] font-bold">
          Terms of Service
        </h1>
        <p className="mb-8 text-[var(--text-secondary)]">
          Last updated: June 2026
        </p>

        <div className="space-y-6 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          <section>
            <h2 className="mb-3 text-[18px] font-bold text-[var(--text-primary)]">
              1. Agreement to Terms
            </h2>
            <p>
              By accessing or using the Fyrlinc platform, you agree to be bound
              by these Terms. If you disagree with any part of the terms, then
              you do not have permission to access the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[18px] font-bold text-[var(--text-primary)]">
              2. Acceptable Use
            </h2>
            <p>
              You agree not to use the Service in any way that violates any
              applicable national or international law or regulation. The
              platform is designed solely for monitoring registered fire alarm
              systems.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[18px] font-bold text-[var(--text-primary)]">
              3. Accounts
            </h2>
            <p>
              When you create an account with us, you must provide information
              that is accurate, complete, and current at all times. Failure to
              do so constitutes a breach of the Terms, which may result in
              immediate termination of your account on our Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[18px] font-bold text-[var(--text-primary)]">
              4. Limitation of Liability
            </h2>
            <p>
              In no event shall Fyrlinc, nor its directors, employees, partners,
              agents, suppliers, or affiliates, be liable for any indirect,
              incidental, special, consequential or punitive damages, including
              without limitation, loss of profits, data, use, goodwill, or other
              intangible losses, resulting from your access to or use of or
              inability to access or use the Service.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
