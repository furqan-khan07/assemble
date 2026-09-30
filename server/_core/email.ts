import { Resend } from "resend";

const FROM_EMAIL = "AssembleAI <noreply@tryassembleai.com>";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/**
 * Send a verification email to a new user with a link to confirm their address.
 */
export async function sendVerificationEmail({
  to,
  token,
}: {
  to: string;
  token: string;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not set — skipping verification email.");
    return false;
  }

  const baseUrl = process.env.APP_URL || "https://www.tryassembleai.com";
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  console.log(`[Email] Sending verification email to ${to}`);

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Verify your email — AssembleAI",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Welcome to AssembleAI!</h2>
          <p>Please verify your email address by clicking the button below:</p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${verifyUrl}"
               style="background: #000; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Verify my email
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            Or copy and paste this link into your browser:<br/>
            <a href="${verifyUrl}">${verifyUrl}</a>
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 32px;">
            If you didn't create an account, you can ignore this email.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[Email] Resend error:", error);
      return false;
    }

    console.log(`[Email] Sent verification email to ${to}`);
    return true;
  } catch (err) {
    console.error("[Email] Failed to send verification email:", err);
    return false;
  }
}

/**
 * Send an email to the AssembleAI support/owner inbox.
 */
export async function sendOwnerEmail({
  subject,
  text,
}: {
  subject: string;
  text: string;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not set — skipping email notification.");
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: "helpfromassembleai@gmail.com",
      subject,
      text,
    });

    if (error) {
      console.error("[Email] Resend error:", error);
      return false;
    }

    console.log(`[Email] Sent owner email: "${subject}"`);
    return true;
  } catch (err) {
    console.error("[Email] Failed to send owner email:", err);
    return false;
  }
}
