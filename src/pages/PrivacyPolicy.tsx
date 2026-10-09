import { ArrowLeft, Shield, Trash2, Mail, Lock, Database } from "lucide-react";
import { Link } from "react-router-dom";

export function PrivacyPolicy() {
  return (
    <div className="legal-page min-h-screen bg-[var(--surface-base)] p-6 text-[var(--text-primary)] md:p-12">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to App</span>
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
            <Shield className="h-5 w-5" />
          </div>
          <h1 className="text-[32px] font-bold tracking-tight">
            Privacy Policy & Data Safety
          </h1>
        </div>
        <p className="mb-8 text-[13px] text-[var(--text-secondary)]">
          Last updated: October 2026 · Compliant with Apple App Store Guideline 5.1.1 & Google Play User Data Policy
        </p>

        <div className="space-y-8 text-[14px] leading-relaxed text-[var(--text-secondary)]">
          {/* 1. Information We Collect */}
          <section>
            <h2 className="mb-3 text-[18px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span>1. Information We Collect</span>
            </h2>
            <p className="mb-3">
              We collect information to operate the Fyrlinc fire alarm monitoring and graphic monitoring system (GMS). This includes:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-[var(--text-primary)]">Personal Identifiers:</strong> Name, email address, phone number, company affiliation, and assigned facility branches.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Hardware & Telemetry Data:</strong> Fire alarm control panel serial numbers, loop status, zone states (Normal, Alarm, Fault, Isolate), AC mains status, battery voltage, and diagnostic events.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Facility Floor Plans & Media:</strong> User-uploaded architectural floor plans and zone polygon layout coordinates for graphical monitoring.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Authentication & App Diagnostics:</strong> Login timestamps, device app version, and network performance indicators for session integrity.
              </li>
            </ul>
          </section>

          {/* 2. How We Use Information */}
          <section>
            <h2 className="mb-3 text-[18px] font-bold text-[var(--text-primary)]">
              2. How We Use Information
            </h2>
            <p className="mb-3">
              All collected information is used exclusively for operational and life-safety monitoring purposes:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Delivering instant fire alarm and fault alert notifications to facility operators.</li>
              <li>Rendering graphical floor plan overlays showing active emergency zones.</li>
              <li>Enforcing role-based access control (RBAC) across organizations and branches.</li>
              <li>Providing technical diagnostics and customer support.</li>
            </ul>
            <p className="mt-3 text-[var(--text-primary)] font-medium">
              We do NOT sell personal data, do NOT serve third-party advertisements, and do NOT engage in cross-app user tracking.
            </p>
          </section>

          {/* 3. Data Security & Encryption */}
          <section>
            <h2 className="mb-3 text-[18px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Lock className="h-4 w-4 text-[var(--color-success)]" />
              <span>3. Data Security & Encryption</span>
            </h2>
            <p>
              Security is foundational to our life-safety mission. All data transmitted between the Fyrlinc mobile applications, web dashboard, cloud services, and IoT gateways is protected using modern <strong>Transport Layer Security (TLS 1.3 / HTTPS / WSS)</strong>. Data stored in our managed cloud databases is encrypted at rest using AES-256 standard encryption.
            </p>
          </section>

          {/* 4. Data Retention & Account Deletion (Google Play & Apple Compliant) */}
          <section id="deletion" className="rounded-[12px] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]/10 p-5">
            <h2 className="mb-3 text-[18px] font-bold text-[var(--color-error)] flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              <span>4. Data Retention and Account Deletion Policy</span>
            </h2>
            <p className="mb-3">
              In full compliance with <strong>Apple App Store Guideline 5.1.1(v)</strong> and <strong>Google Play's User Data & Deletion Policy</strong>, Fyrlinc provides all registered users with complete autonomy over their account and personal data.
            </p>

            <h3 className="text-[15px] font-bold text-[var(--text-primary)] mt-4 mb-2">
              How to Request Account & Data Deletion
            </h3>
            <p className="mb-2">Users may submit an account and personal data deletion request via either of the following paths:</p>
            <div className="space-y-3 pl-2">
              <div className="rounded-[8px] bg-[var(--surface-raised)] border border-[var(--border-subtle)] p-3.5">
                <p className="font-semibold text-[var(--text-primary)] text-[13px] mb-1">
                  Option A: Directly In-App (Recommended)
                </p>
                <p className="text-[12px]">
                  Navigate to <strong>Settings &rarr; Profile</strong>, scroll down to the <strong>Account Deletion</strong> card, click <em>Request Account Deletion</em>, review the confirmation dialog, and confirm your submission.
                </p>
              </div>

              <div className="rounded-[8px] bg-[var(--surface-raised)] border border-[var(--border-subtle)] p-3.5">
                <p className="font-semibold text-[var(--text-primary)] text-[13px] mb-1">
                  Option B: Direct Email Request (Web / External)
                </p>
                <p className="text-[12px]">
                  Send an email from your registered account address to{" "}
                  <a href="mailto:bats86632@gmail.com?subject=Account%20Deletion%20Request" className="text-[var(--accent)] font-medium underline">
                    bats86632@gmail.com
                  </a>{" "}
                  with the subject line <code>Account Deletion Request</code>.
                </p>
              </div>
            </div>

            <h3 className="text-[15px] font-bold text-[var(--text-primary)] mt-4 mb-2">
              Scope of Data Purged vs. Retained
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-[13px]">
              <li>
                <strong className="text-[var(--text-primary)]">Data Permanently Deleted:</strong> User login credentials, authentication UID, personal full name, email address, phone number, profile avatar photos, employee IDs, and personalized notification preferences are permanently purged from all production databases within <strong>30 calendar days</strong>.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Statutory Life-Safety Exception (Retained Anonymously):</strong> Telemetry event logs and historical alarm discharge records generated by physical fire alarm control panels are decoupled from user identities and preserved in an anonymized format for mandatory compliance with building safety codes and statutory fire regulations (NFPA 72, EN 54, IS 2189).
              </li>
            </ul>
          </section>

          {/* 5. Store Data Safety Declarations */}
          <section>
            <h2 className="mb-3 text-[18px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Database className="h-4 w-4 text-[var(--accent)]" />
              <span>5. App Store & Google Play Data Safety Disclosures</span>
            </h2>
            <div className="overflow-x-auto rounded-[8px] border border-[var(--border-subtle)]">
              <table className="w-full text-left text-[12px] border-collapse">
                <thead>
                  <tr className="bg-[var(--surface-raised)] border-b border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold">
                    <th className="p-3">Data Category</th>
                    <th className="p-3">Data Fields</th>
                    <th className="p-3">Purpose</th>
                    <th className="p-3">Shared with 3rd Parties?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  <tr>
                    <td className="p-3 font-medium text-[var(--text-primary)]">Personal Info</td>
                    <td className="p-3">Name, Email, Phone</td>
                    <td className="p-3">App functionality, Account management</td>
                    <td className="p-3 text-[var(--color-success)] font-medium">No</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-[var(--text-primary)]">Photos / Media</td>
                    <td className="p-3">Profile photo, Floor plan drawings</td>
                    <td className="p-3">App functionality (GMS mapping)</td>
                    <td className="p-3 text-[var(--color-success)] font-medium">No</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-[var(--text-primary)]">App Diagnostics</td>
                    <td className="p-3">Crash logs, Performance telemetry</td>
                    <td className="p-3">Analytics & stability</td>
                    <td className="p-3 text-[var(--color-success)] font-medium">No</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 6. Contact Us */}
          <section className="pt-2">
            <h2 className="mb-3 text-[18px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Mail className="h-4 w-4 text-[var(--accent)]" />
              <span>6. Contact & Data Protection Officer</span>
            </h2>
            <p>
              For inquiries regarding this privacy policy, data access requests, or regulatory compliance:
            </p>
            <div className="mt-2 text-[13px]">
              <p>Email: <a href="mailto:support@fyrlinc.com" className="text-[var(--accent)] underline font-medium">support@fyrlinc.com</a></p>
              <p>Address: Fyrlinc IoT Technologies Private Limited</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
