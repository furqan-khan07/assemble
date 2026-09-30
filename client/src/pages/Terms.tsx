import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const EFFECTIVE_DATE = "April 6, 2025";
const CONTACT_EMAIL = "helpfromassembleai@gmail.com";

export default function Terms() {
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
        <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Effective date: {EFFECTIVE_DATE}</p>

        <div className="prose prose-neutral max-w-none space-y-8 text-sm leading-relaxed text-foreground/90">

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using AssembleAI ("the Service"), you agree to be bound by these Terms of Service ("Terms").
              If you do not agree to these Terms, please do not use the Service. These Terms apply to all users,
              including visitors, registered accounts, and paying customers.
            </p>
            <p className="mt-3">
              These Terms constitute a legally binding agreement between you and AssembleAI. You represent that you
              are at least 16 years of age and have the legal capacity to enter into these Terms. If you are using
              the Service on behalf of an organization, you represent that you have authority to bind that organization
              to these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p>
              AssembleAI is an AI-powered tool that processes PDF instruction manuals and generates step-by-step
              assembly guidance. The Service uses artificial intelligence to interpret text and images within uploaded
              documents. Results are provided for informational and convenience purposes only.
            </p>
            <p className="mt-3">
              The Service is provided via <a href="https://www.tryassembleai.com" className="underline underline-offset-2">tryassembleai.com</a>.
              We may modify, update, or discontinue features of the Service at any time. We will make reasonable
              efforts to notify users of material changes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. AI-Generated Content Disclaimer</h2>
            <p>
              All assembly steps, part lists, and guidance produced by AssembleAI are generated automatically by
              artificial intelligence and <strong>may contain errors, omissions, or inaccuracies</strong>. You are
              solely responsible for verifying all instructions against your original PDF manual before acting on them.
              AssembleAI does not guarantee the accuracy, completeness, or fitness of any AI-generated content for
              any particular purpose.
            </p>
            <p className="mt-3">
              <strong>Safety warning:</strong> Do not rely solely on AI-generated steps for safety-critical assemblies,
              including but not limited to structural, electrical, gas, or load-bearing installations. Always consult
              the original manufacturer's documentation and follow all applicable safety codes and regulations.
              AssembleAI accepts no responsibility for injury, damage, or loss resulting from reliance on
              AI-generated instructions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. User Accounts</h2>
            <p>
              To use certain features of the Service, you must create an account with a valid email address and password.
              You are responsible for:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Maintaining the confidentiality of your account credentials.</li>
              <li>All activities that occur under your account.</li>
              <li>Providing accurate and up-to-date account information.</li>
              <li>Notifying us immediately at{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">{CONTACT_EMAIL}</a> if
                you suspect unauthorized access to your account.</li>
            </ul>
            <p className="mt-3">
              You may not share your account credentials with others, create multiple accounts to circumvent
              restrictions, or transfer your account to another person without our consent.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Credits, Payments, and Refund Policy</h2>
            <p>
              The Service operates on a credit-based system. Credits are purchased through Stripe and are consumed
              when a PDF manual is submitted for processing. Credit costs are calculated based on file size and
              are displayed before you confirm processing.
            </p>
            <p className="mt-3">
              <strong>No monetary refunds.</strong> All credit purchases are final. We do not offer monetary refunds
              for unused credits or completed purchases under any circumstances, except where strictly required by
              applicable law.
            </p>
            <p className="mt-3">
              <strong>Credit refunds for failed processing.</strong> If your PDF upload fails to process due to a
              server-side error on our part, the credits consumed for that upload will be automatically refunded to
              your account balance immediately. No action is required on your part. This credit refund is the sole
              remedy available for a failed processing job and does not constitute a monetary refund.
            </p>
            <p className="mt-3">
              <strong>Disputes and exceptional cases.</strong> If you are unable to successfully process any manual
              after multiple attempts and believe the issue is caused by a platform-wide problem on our end, please
              contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">{CONTACT_EMAIL}</a> with
              a description of the issue and the file you attempted to upload. We will review your case in good faith
              and, at our sole discretion, may issue a credit or monetary remedy where we determine the platform
              failed to deliver the service as described. This does not create an automatic right to a refund.
            </p>
            <p className="mt-3">
              Credits do not expire. Prices are displayed in USD and are subject to change with reasonable notice.
              All payments are processed securely by Stripe; AssembleAI does not store your payment card details.
              You are responsible for any taxes applicable to your purchases.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Uploaded Content</h2>
            <p>
              You retain ownership of any PDF manuals you upload. By uploading a file, you grant AssembleAI a limited,
              non-exclusive, revocable licence to process, store, and transmit the file solely for the purpose of
              providing the Service to you. This licence terminates when you delete the project or your account.
            </p>
            <p className="mt-3">
              You represent and warrant that:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>You have the right to upload the file and grant this licence.</li>
              <li>The file does not infringe any third-party intellectual property rights.</li>
              <li>The file does not contain malicious code, viruses, or illegal content.</li>
            </ul>
            <p className="mt-3">
              We do not share your uploaded files with other users. Files are stored securely in encrypted cloud
              storage and are associated only with your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Intellectual Property</h2>
            <p>
              The Service, including its software, design, logos, and documentation, is owned by AssembleAI and
              protected by intellectual property laws. You are granted a limited, non-exclusive, non-transferable
              licence to use the Service for its intended purpose.
            </p>
            <p className="mt-3">
              AI-generated assembly steps are provided to you for personal use. You may use the generated content
              for your own assembly projects. You may not resell, redistribute, or commercially exploit the
              AI-generated output as a standalone product or service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Prohibited Uses</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Upload content that is illegal, harmful, or infringes third-party rights.</li>
              <li>Attempt to reverse-engineer, decompile, or disassemble any part of the Service.</li>
              <li>Scrape, crawl, or use automated means to access the Service without our consent.</li>
              <li>Circumvent credit requirements, manipulate account balances, or exploit bugs.</li>
              <li>Use the Service to develop a competing product or service.</li>
              <li>Interfere with or disrupt the Service's infrastructure or other users' access.</li>
              <li>Impersonate another person or misrepresent your affiliation with any entity.</li>
              <li>Use the Service for any purpose that violates applicable laws or regulations.</li>
            </ul>
            <p className="mt-3">
              We reserve the right to suspend or terminate accounts that violate these restrictions, with or
              without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Service Availability</h2>
            <p>
              We strive to keep the Service available at all times but do not guarantee uninterrupted access.
              The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond
              our control. We are not liable for any loss or inconvenience caused by downtime.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">10. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, AssembleAI and its operators, officers, employees, and
              affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive
              damages arising from your use of or inability to use the Service, including but not limited to:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Any reliance on AI-generated assembly instructions.</li>
              <li>Personal injury or property damage resulting from assembly activities.</li>
              <li>Loss of data, profits, or business opportunities.</li>
              <li>Service interruptions or unavailability.</li>
              <li>Unauthorized access to your account due to your failure to secure credentials.</li>
            </ul>
            <p className="mt-3">
              Our total aggregate liability for any claim arising out of or relating to these Terms or the Service
              shall not exceed the amount you have paid to AssembleAI in the twelve (12) months preceding the event
              giving rise to the claim, or fifty Canadian dollars (CAD $50), whichever is greater.
            </p>
            <p className="mt-3">
              Some jurisdictions do not allow the exclusion or limitation of certain damages. In such jurisdictions,
              our liability is limited to the maximum extent permitted by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">11. Disclaimer of Warranties</h2>
            <p>
              The Service is provided "as is" and "as available" without warranties of any kind, either express or
              implied, including but not limited to implied warranties of merchantability, fitness for a particular
              purpose, non-infringement, or accuracy. We do not warrant that:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>The Service will be uninterrupted, timely, secure, or error-free.</li>
              <li>AI-generated content will be accurate, complete, or suitable for any purpose.</li>
              <li>Any defects in the Service will be corrected.</li>
              <li>The Service will meet your specific requirements.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">12. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless AssembleAI and its operators from any claims,
              damages, losses, liabilities, and expenses (including reasonable legal fees) arising from:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Your use of or reliance on the Service.</li>
              <li>Your violation of these Terms.</li>
              <li>Your infringement of any third-party rights through uploaded content.</li>
              <li>Any assembly activities you undertake based on AI-generated instructions.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">13. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access to the Service at any time, with or without
              notice, if we believe you have violated these Terms or for any other reason at our discretion.
            </p>
            <p className="mt-3">
              You may stop using the Service and request account deletion at any time by contacting us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">{CONTACT_EMAIL}</a>.
              Unused credits are non-refundable upon termination unless required by applicable law.
            </p>
            <p className="mt-3">
              Upon termination, your right to use the Service ceases immediately. Sections that by their nature
              should survive termination (including Limitation of Liability, Disclaimer of Warranties,
              Indemnification, and Governing Law) will continue to apply.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">14. Governing Law and Dispute Resolution</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the Province of Ontario
              and the federal laws of Canada applicable therein, without regard to conflict of law principles.
            </p>
            <p className="mt-3">
              Any dispute arising from these Terms or your use of the Service shall first be attempted to be
              resolved through good-faith negotiation by contacting us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">{CONTACT_EMAIL}</a>.
              If a resolution cannot be reached within 30 days, either party may pursue binding arbitration
              or bring a claim in the courts located in Ontario, Canada, and you consent to the exclusive
              jurisdiction of those courts. You agree to waive any right to participate in a class action
              lawsuit or class-wide arbitration.
            </p>
            <p className="mt-3">
              Nothing in this section prevents you from filing a complaint with a consumer protection agency
              or exercising rights that cannot be waived under applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">15. Force Majeure</h2>
            <p>
              AssembleAI shall not be liable for any failure or delay in performing its obligations under these
              Terms due to circumstances beyond its reasonable control, including but not limited to natural
              disasters, acts of government, internet outages, third-party service failures, or cyberattacks.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">16. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. When we make material changes, we will update the
              effective date at the top of this page and, where appropriate, notify you via email or a prominent
              notice within the Service. Continued use of the Service after changes are posted constitutes your
              acceptance of the revised Terms. If you do not agree with the updated Terms, you must stop using
              the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">17. General Provisions</h2>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li><strong>Entire Agreement.</strong> These Terms, together with our Privacy Policy, constitute the
                entire agreement between you and AssembleAI regarding the Service and supersede all prior agreements.</li>
              <li><strong>Severability.</strong> If any provision of these Terms is found to be unenforceable or
                invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the
                remaining provisions shall remain in full force and effect.</li>
              <li><strong>Waiver.</strong> Our failure to enforce any right or provision of these Terms shall not
                constitute a waiver of that right or provision.</li>
              <li><strong>Assignment.</strong> You may not assign or transfer these Terms without our prior written
                consent. We may assign our rights and obligations without restriction.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">18. Contact</h2>
            <p>
              If you have questions about these Terms, please contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">{CONTACT_EMAIL}</a>.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-border/60 flex gap-4 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        </div>
      </main>
    </div>
  );
}
