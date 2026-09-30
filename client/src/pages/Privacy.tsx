import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const EFFECTIVE_DATE = "April 6, 2025";
const CONTACT_EMAIL = "helpfromassembleai@gmail.com";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/60">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <span className="font-bold text-base tracking-tight">AssembleAI</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Effective date: {EFFECTIVE_DATE}</p>

        <div className="prose prose-neutral max-w-none space-y-8 text-sm leading-relaxed text-foreground/90">

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Overview</h2>
            <p>
              AssembleAI ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains
              what information we collect, how we use it, and your rights regarding that information when you use
              our Service at <a href="https://www.tryassembleai.com" className="underline underline-offset-2">tryassembleai.com</a>.
            </p>
            <p className="mt-3">
              By creating an account or using the Service, you agree to the collection and use of information
              in accordance with this policy. If you do not agree with this policy, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Information We Collect</h2>

            <h3 className="font-medium text-foreground mt-4 mb-2">Account Information</h3>
            <p>
              When you create an account, we collect your name, email address, and an encrypted password hash.
              We also record your login method and the date of your last sign-in. This information is used to
              manage your account, authenticate your sessions, and communicate with you about the Service.
            </p>

            <h3 className="font-medium text-foreground mt-4 mb-2">Uploaded Files</h3>
            <p>
              PDF manuals you upload are stored in secure cloud storage (Amazon S3) with cryptographically random
              file paths and are associated exclusively with your account. Files are used solely to generate assembly
              guidance for you. We do not share your files with other users or use them for any purpose other than
              providing the Service, except as required for AI processing (see Section 5).
            </p>

            <h3 className="font-medium text-foreground mt-4 mb-2">Usage Data</h3>
            <p>
              We collect information about how you interact with the Service, including which projects you create,
              your progress through assembly steps, credit transactions (purchases, usage, and refunds), and any
              step feedback you submit. This data helps us operate, maintain, and improve the Service.
            </p>

            <h3 className="font-medium text-foreground mt-4 mb-2">Payment Information</h3>
            <p>
              Payments are processed entirely by Stripe. We store only a Stripe Customer ID to link your account
              to your payment history. We never receive, process, or store your full card number, CVV, expiration
              date, or other sensitive payment details — these are handled directly by Stripe in accordance with
              PCI DSS standards.
            </p>

            <h3 className="font-medium text-foreground mt-4 mb-2">Automatically Collected Information</h3>
            <p>
              When you access the Service, our servers automatically log standard request information including
              your IP address, browser type, referring URL, and timestamps. This data is used for security monitoring,
              rate limiting, and diagnosing technical issues. It is not used for tracking or advertising.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Legal Basis for Processing</h2>
            <p>
              We process your personal data in accordance with Canada's Personal Information Protection and
              Electronic Documents Act (PIPEDA) and, where applicable to users in the European Economic Area (EEA),
              United Kingdom, or Switzerland, the General Data Protection Regulation (GDPR). Our legal bases
              for processing include:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Contract performance</strong> — processing your account data, uploaded files, and payment
                information is necessary to provide the Service you signed up for.</li>
              <li><strong>Legitimate interests</strong> — we process usage data and server logs to maintain security,
                prevent abuse, and improve the Service, where these interests are not overridden by your rights.</li>
              <li><strong>Legal obligation</strong> — we may process data to comply with applicable laws, such as
                tax reporting requirements for payment transactions.</li>
              <li><strong>Consent</strong> — where required, we rely on your consent (e.g., for optional communications),
                which you may withdraw at any time by contacting us.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Provide, operate, and improve the Service.</li>
              <li>Process payments and manage your credit balance.</li>
              <li>Generate AI-powered assembly guidance from your uploaded manuals.</li>
              <li>Send transactional emails (account verification, payment confirmations).</li>
              <li>Respond to support requests sent to our contact email.</li>
              <li>Monitor for and prevent fraud, abuse, and security threats.</li>
              <li>Comply with legal obligations.</li>
            </ul>
            <p className="mt-3">
              We do not sell, rent, or trade your personal information to third parties. We do not use your data
              for advertising or profiling purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. AI Processing</h2>
            <p>
              To generate assembly steps, pages from your uploaded PDF are rendered as images and sent to OpenAI's
              GPT-4o model for analysis. These images are transmitted securely via encrypted API connections. Under
              our API agreement with OpenAI, your data is not used by OpenAI to train or improve their models.
            </p>
            <p className="mt-3">
              Page images are retained in cloud storage only for as long as your project exists. When you delete
              a project, the associated images are removed. We do not retain copies of the AI model's input or
              output beyond what is stored as part of your project data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Data Retention</h2>
            <p>
              Your account data, uploaded manuals, and generated steps are retained for as long as your account
              is active. Specific retention periods:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Account data</strong> — retained until you request account deletion.</li>
              <li><strong>Project files and steps</strong> — retained until you delete the project or your account.</li>
              <li><strong>Credit transaction records</strong> — retained for the life of your account and for a
                reasonable period afterward as required for accounting and legal purposes.</li>
              <li><strong>Server logs</strong> — retained for up to 90 days for security and debugging purposes.</li>
            </ul>
            <p className="mt-3">
              You may request deletion of your account and all associated data by contacting us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">{CONTACT_EMAIL}</a>.
              We will process deletion requests within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Cookies and Tracking</h2>
            <p>
              We use a single, essential session cookie (<code>app_session_id</code>) to keep you logged in.
              This cookie is HttpOnly, Secure, and SameSite-protected. It expires after one year or when you log out.
            </p>
            <p className="mt-3">
              We do not use advertising cookies, third-party tracking pixels, or fingerprinting technologies.
              We may use basic, privacy-respecting analytics to understand aggregate usage patterns (e.g., page views);
              no personally identifiable information is included in these analytics.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Third-Party Services</h2>
            <p>The Service relies on the following third-party providers to operate. Each processes data in accordance
              with their own privacy policies:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Stripe</strong> — payment processing (<a href="https://stripe.com/privacy" className="underline underline-offset-2" target="_blank" rel="noopener noreferrer">stripe.com/privacy</a>)</li>
              <li><strong>OpenAI</strong> — AI model for step generation (<a href="https://openai.com/policies/privacy-policy" className="underline underline-offset-2" target="_blank" rel="noopener noreferrer">openai.com/policies/privacy-policy</a>)</li>
              <li><strong>Amazon Web Services (S3)</strong> — file storage (<a href="https://aws.amazon.com/privacy/" className="underline underline-offset-2" target="_blank" rel="noopener noreferrer">aws.amazon.com/privacy</a>)</li>
              <li><strong>Resend</strong> — transactional email delivery (<a href="https://resend.com/legal/privacy-policy" className="underline underline-offset-2" target="_blank" rel="noopener noreferrer">resend.com/legal/privacy-policy</a>)</li>
            </ul>
            <p className="mt-3">
              We do not share your personal information with any third parties beyond what is necessary
              to operate the Service as described above.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. International Data Transfers</h2>
            <p>
              The Service is operated from Canada. Your data may be transferred to and processed in Canada and
              the United States, where our servers and third-party providers are located. By using the Service,
              you consent to this transfer.
            </p>
            <p className="mt-3">
              For users in the EEA, UK, or Switzerland, we rely on Standard Contractual Clauses (SCCs) and
              the data processing agreements of our third-party providers to ensure appropriate safeguards
              for international data transfers. For Canadian users, data processing by our US-based third-party
              providers is conducted in accordance with PIPEDA's requirements for cross-border transfers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">10. Security</h2>
            <p>
              We implement industry-standard security measures to protect your data, including:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>HTTPS encryption for all data in transit.</li>
              <li>HTTP security headers enforced via Helmet.</li>
              <li>Passwords hashed with bcrypt (12 salt rounds) — we never store plaintext passwords.</li>
              <li>Cryptographically random file storage paths to prevent unauthorized access.</li>
              <li>Server-side authentication and authorization checks on all data access.</li>
              <li>Rate limiting to prevent brute-force and abuse attacks.</li>
            </ul>
            <p className="mt-3">
              No method of electronic transmission or storage is 100% secure. While we strive to use commercially
              acceptable means to protect your data, we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">11. Data Breach Notification</h2>
            <p>
              In the event of a data breach that affects your personal information, we will notify affected users
              via email within 72 hours of becoming aware of the breach, as required by applicable law. We will
              also notify relevant supervisory authorities where legally required.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">12. Children's Privacy</h2>
            <p>
              The Service is not directed at children under the age of 16. We do not knowingly collect personal
              information from children under 16. If you believe a child has provided us with personal information,
              please contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">{CONTACT_EMAIL}</a> and
              we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">13. Your Rights</h2>
            <p>
              Depending on your location, you may have the following rights under applicable privacy law:
            </p>

            <h3 className="font-medium text-foreground mt-4 mb-2">All Users</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Access</strong> — request a copy of the personal data we hold about you.</li>
              <li><strong>Correction</strong> — request correction of inaccurate or incomplete personal data.</li>
              <li><strong>Deletion</strong> — request deletion of your personal data and account.</li>
              <li><strong>Data portability</strong> — request your data in a structured, machine-readable format.</li>
            </ul>

            <h3 className="font-medium text-foreground mt-4 mb-2">EEA, UK, and Swiss Users (GDPR)</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Restriction</strong> — request that we restrict the processing of your personal data.</li>
              <li><strong>Objection</strong> — object to processing based on legitimate interests.</li>
              <li><strong>Withdraw consent</strong> — where processing is based on consent, withdraw it at any time.</li>
              <li><strong>Lodge a complaint</strong> — file a complaint with your local data protection authority.</li>
            </ul>

            <h3 className="font-medium text-foreground mt-4 mb-2">Canadian Users (PIPEDA)</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Access</strong> — request access to the personal information we hold about you.</li>
              <li><strong>Correction</strong> — challenge the accuracy of your personal information and have it corrected.</li>
              <li><strong>Withdrawal of consent</strong> — withdraw your consent to the collection, use, or disclosure
                of your personal information, subject to legal or contractual restrictions.</li>
              <li><strong>Complaint</strong> — file a complaint with the Office of the Privacy Commissioner of Canada
                if you believe your privacy rights have been violated.</li>
            </ul>

            <h3 className="font-medium text-foreground mt-4 mb-2">California Residents (CCPA/CPRA)</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Right to know</strong> — request details about what personal information we collect and how it is used.</li>
              <li><strong>Right to delete</strong> — request deletion of your personal information.</li>
              <li><strong>Right to opt out</strong> — we do not sell or share your personal information for cross-context
                behavioral advertising, so there is nothing to opt out of.</li>
              <li><strong>Non-discrimination</strong> — we will not discriminate against you for exercising your privacy rights.</li>
            </ul>

            <p className="mt-4">
              To exercise any of these rights, please contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">{CONTACT_EMAIL}</a>.
              We will respond within 30 days (or sooner if required by applicable law). We may ask you to verify
              your identity before processing your request.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">14. Do Not Track</h2>
            <p>
              The Service does not respond to "Do Not Track" browser signals because we do not engage in
              cross-site tracking. Our tracking practices are the same regardless of this setting.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">15. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we make material changes, we will update
              the effective date at the top of this page and, where appropriate, notify you via email or a
              prominent notice within the Service. We encourage you to review this page periodically. Your
              continued use of the Service after changes are posted constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">16. Contact</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices,
              please contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">{CONTACT_EMAIL}</a>.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-border/60 flex gap-4 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        </div>
      </main>
    </div>
  );
}
