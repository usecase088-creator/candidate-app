/**
 * ApronHanger — Brevo Transactional Email Service
 *
 * Sends branded emails for hospital onboarding status changes.
 * Errors are logged but never re-thrown — callers should not
 * crash the API response if an email fails to send.
 *
 * Required .env vars:
 *   BREVO_API_KEY          — Brevo v3 API key
 *   BREVO_SENDER_EMAIL     — Verified sender address in Brevo
 *   BREVO_SENDER_NAME      — Display name for sender
 */

import logger from './logger';

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function getBrevoConfig() {
  const apiKey       = process.env.BREVO_API_KEY || '';
  const senderEmail  = process.env.BREVO_SENDER_EMAIL || 'noreply@apronhanger.in';
  const senderName   = process.env.BREVO_SENDER_NAME  || 'ApronHanger Onboarding Team';
  return { apiKey, senderEmail, senderName };
}

// ─── Core Brevo sender ───────────────────────────────────────────────────────

async function sendEmail(payload: {
  to: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent: string;
}): Promise<void> {
  const { apiKey, senderEmail, senderName } = getBrevoConfig();

  if (!apiKey) {
    logger.warn('[Email] BREVO_API_KEY is not set — skipping email send.');
    return;
  }

  const body = JSON.stringify({
    sender:      { name: senderName, email: senderEmail },
    to:          payload.to,
    subject:     payload.subject,
    htmlContent: payload.htmlContent,
  });

  const res = await fetch(BREVO_API_URL, {
    method:  'POST',
    headers: {
      'accept':       'application/json',
      'api-key':      apiKey,
      'content-type': 'application/json',
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Brevo API error ${res.status}: ${errText}`);
  }

  logger.info(`[Email] Sent "${payload.subject}" → ${payload.to.map(t => t.email).join(', ')}`);
}

// ─── Template helpers ────────────────────────────────────────────────────────

/** Resolve destination email — prefer the hospital's contact email */
function resolveEmail(hospital: { email?: string | null; submittedEmail?: string | null }) {
  return hospital.email || hospital.submittedEmail || '';
}

// ─── Template 1: Approval (client-provided) ──────────────────────────────────

function buildApprovalHtml(institutionName: string, activationCode: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ApronHanger Activation</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
body{margin:0;padding:0;background:#f5f8fc;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;}
.wrapper{width:100%;padding:40px 20px;background:linear-gradient(135deg,#071829 0%,#0D2746 50%,#144A7A 100%);}
.container{max-width:640px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,0.12);}
.header{padding:48px 56px;background:linear-gradient(135deg,#0D2746,#144A7A);position:relative;}
.header::after{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:repeating-linear-gradient(90deg,transparent,transparent 58px,rgba(255,255,255,0.03) 60px);pointer-events:none;}
.brand{position:relative;z-index:2;}
.brand-name{color:#ffffff;font-size:30px;font-weight:700;letter-spacing:-0.5px;}
.brand-name span{color:#74C7FF;}
.brand-tag{margin-top:10px;color:#A6D8FF;font-size:11px;text-transform:uppercase;letter-spacing:2px;}
.hero-title{margin-top:32px;color:#ffffff;font-size:34px;line-height:1.2;font-weight:600;}
.hero-subtitle{margin-top:16px;color:#D6E7F7;font-size:15px;line-height:1.8;max-width:450px;}
.content{padding:48px 56px;}
.welcome{color:#334155;font-size:15px;line-height:1.8;}
.institution{font-weight:600;color:#0D2746;}
.code-box{margin:36px 0;background:#F8FBFF;border:1px solid #D9EAF8;border-radius:20px;text-align:center;padding:32px;}
.code-label{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#4A90C2;margin-bottom:18px;}
.activation-code{font-size:34px;font-weight:700;color:#0D2746;letter-spacing:4px;font-family:'Courier New',monospace;}
.code-validity{margin-top:18px;color:#64748B;font-size:13px;}
.trust-bar{display:flex;justify-content:center;flex-wrap:wrap;gap:16px;margin-bottom:40px;}
.trust-item{font-size:13px;color:#475569;}
.section-title{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#4A90C2;margin-bottom:24px;}
.step{display:flex;margin-bottom:22px;}
.step-number{width:32px;height:32px;border-radius:10px;background:#E9F4FD;color:#0D2746;font-weight:600;display:flex;align-items:center;justify-content:center;margin-right:16px;flex-shrink:0;}
.step-text{color:#475569;font-size:14px;line-height:1.8;}
.cta-wrapper{text-align:center;margin:40px 0;}
.cta{display:inline-block;background:#ffffff;color:#0D2746;border:1.5px solid #0D2746;text-decoration:none;padding:15px 35px;border-radius:999px;font-size:14px;font-weight:600;}
.support{text-align:center;color:#64748B;font-size:14px;line-height:1.8;}
.signature{margin-top:36px;color:#334155;line-height:1.8;}
.footer{background:#F8FAFC;padding:28px;text-align:center;border-top:1px solid #E2E8F0;}
.footer-brand{color:#0D2746;font-weight:700;}
.footer-brand span{color:#1D74C7;}
.footer-text{margin-top:10px;font-size:12px;color:#94A3B8;}
</style>
</head>
<body>
<div class="wrapper">
<div class="container">
<div class="header">
<div class="brand">
<div class="brand-name">Apron<span>hanger</span></div>
<div class="brand-tag">Healthcare Talent Platform</div>
</div>
<div class="hero-title">Complete Your Institution Activation</div>
<div class="hero-subtitle">Your healthcare organization has been successfully onboarded. Use the secure activation code below to access the ApronHanger platform.</div>
</div>
<div class="content">
<div class="welcome">
Dear <span class="institution">${institutionName}</span>,<br><br>
Thank you for joining ApronHanger. We are excited to partner with your institution and support your healthcare recruitment initiatives.
</div>
<div class="code-box">
<div class="code-label">Activation Code</div>
<div class="activation-code">${activationCode}</div>
<div class="code-validity">Valid for 72 hours &bull; Single institution use</div>
</div>
<div class="trust-bar">
<div class="trust-item">&#10003; Encrypted Verification</div>
<div class="trust-item">&#10003; Secure Onboarding</div>
<div class="trust-item">&#10003; Single Use Activation</div>
</div>
<div class="section-title">How To Activate</div>
<div class="step"><div class="step-number">1</div><div class="step-text">Visit the ApronHanger recruiter portal.</div></div>
<div class="step"><div class="step-number">2</div><div class="step-text">Enter the activation code exactly as displayed above.</div></div>
<div class="step"><div class="step-number">3</div><div class="step-text">Complete your institution profile and begin posting healthcare opportunities.</div></div>
<div class="cta-wrapper"><a href="https://apronhanger.org/auth/signup" class="cta">Begin Platform Setup</a></div>
<div class="support">If you did not request this activation, please ignore this email or contact our support team.</div>
<div class="signature">Warm regards,<br><strong>ApronHanger Onboarding Team</strong><br>Healthcare Talent Platform</div>
</div>
<div class="footer">
<div class="footer-brand">Apron<span>hanger</span></div>
<div class="footer-text">Connecting Hospitals, Clinics and Healthcare Professionals<br><br>&copy; 2026 ApronHanger. All Rights Reserved.</div>
</div>
</div>
</div>
</body>
</html>`;
}

// ─── Template 2: Rejection ───────────────────────────────────────────────────

function buildRejectionHtml(institutionName: string, reason: string): string {
  const reasonBlock = reason
    ? `<div class="reason-box">
        <div class="reason-label">Reason for Decision</div>
        <div class="reason-text">${escapeHtml(reason).replace(/\n/g, '<br>')}</div>
       </div>`
    : `<div class="reason-box">
        <div class="reason-text">Your application did not meet our current onboarding requirements. Please review the documents submitted and contact our support team for further guidance.</div>
       </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ApronHanger — Application Update</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
body{margin:0;padding:0;background:#f5f8fc;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;}
.wrapper{width:100%;padding:40px 20px;background:linear-gradient(135deg,#071829 0%,#0D2746 50%,#144A7A 100%);}
.container{max-width:640px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,0.12);}
.header{padding:48px 56px;background:linear-gradient(135deg,#0D2746,#144A7A);position:relative;}
.brand-name{color:#ffffff;font-size:30px;font-weight:700;letter-spacing:-0.5px;}
.brand-name span{color:#74C7FF;}
.brand-tag{margin-top:10px;color:#A6D8FF;font-size:11px;text-transform:uppercase;letter-spacing:2px;}
.hero-title{margin-top:32px;color:#ffffff;font-size:30px;line-height:1.2;font-weight:600;}
.hero-subtitle{margin-top:16px;color:#D6E7F7;font-size:15px;line-height:1.8;}
.status-chip{display:inline-block;margin-top:24px;background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.4);color:#FCA5A5;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;padding:6px 16px;border-radius:999px;}
.content{padding:48px 56px;}
.welcome{color:#334155;font-size:15px;line-height:1.8;}
.institution{font-weight:600;color:#0D2746;}
.reason-box{margin:32px 0;background:#FFF8F8;border:1px solid #FEE2E2;border-left:4px solid #EF4444;border-radius:12px;padding:24px 28px;}
.reason-label{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#EF4444;margin-bottom:12px;font-weight:600;}
.reason-text{color:#475569;font-size:14px;line-height:1.8;}
.next-steps{margin:32px 0;}
.section-title{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#4A90C2;margin-bottom:20px;font-weight:600;}
.step{display:flex;margin-bottom:18px;align-items:flex-start;}
.step-dot{width:8px;height:8px;border-radius:50%;background:#144A7A;margin-top:7px;margin-right:14px;flex-shrink:0;}
.step-text{color:#475569;font-size:14px;line-height:1.7;}
.cta-wrapper{text-align:center;margin:36px 0;}
.cta{display:inline-block;background:#ffffff;color:#0D2746;border:1.5px solid #0D2746;text-decoration:none;padding:13px 31px;border-radius:999px;font-size:14px;font-weight:600;}
.divider{height:1px;background:#E2E8F0;margin:32px 0;}
.support{text-align:center;color:#64748B;font-size:13px;line-height:1.8;}
.signature{margin-top:32px;color:#334155;line-height:1.8;font-size:14px;}
.footer{background:#F8FAFC;padding:28px;text-align:center;border-top:1px solid #E2E8F0;}
.footer-brand{color:#0D2746;font-weight:700;}
.footer-brand span{color:#1D74C7;}
.footer-text{margin-top:10px;font-size:12px;color:#94A3B8;}
</style>
</head>
<body>
<div class="wrapper">
<div class="container">
<div class="header">
<div class="brand-name">Apron<span>hanger</span></div>
<div class="brand-tag">Healthcare Talent Platform</div>
<div class="hero-title">Application Status Update</div>
<div class="hero-subtitle">We have reviewed your onboarding application and have an update regarding your institution's registration.</div>
<div class="status-chip">Application Not Approved</div>
</div>
<div class="content">
<div class="welcome">
Dear <span class="institution">${institutionName}</span>,<br><br>
Thank you for your interest in joining the ApronHanger platform. After a thorough review of your onboarding application, we are unable to proceed with your registration at this time.
</div>
${reasonBlock}
<div class="next-steps">
<div class="section-title">What You Can Do Next</div>
<div class="step"><div class="step-dot"></div><div class="step-text">Review the reason provided above and address any gaps in your application.</div></div>
<div class="step"><div class="step-dot"></div><div class="step-text">Reach out to our support team if you have any questions or need clarification.</div></div>
<div class="step"><div class="step-dot"></div><div class="step-text">You may submit a fresh onboarding application once the issues are resolved.</div></div>
</div>
<div class="cta-wrapper"><a href="mailto:support@apronhanger.in" class="cta">Contact Support</a></div>
<div class="divider"></div>
<div class="support">If you believe this decision was made in error, please reach out to us at<br><strong>support@apronhanger.in</strong></div>
<div class="signature">Regards,<br><strong>ApronHanger Onboarding Team</strong><br>Healthcare Talent Platform</div>
</div>
<div class="footer">
<div class="footer-brand">Apron<span>hanger</span></div>
<div class="footer-text">Connecting Hospitals, Clinics and Healthcare Professionals<br><br>&copy; 2026 ApronHanger. All Rights Reserved.</div>
</div>
</div>
</div>
</body>
</html>`;
}

// ─── Template 3: Request More Documents ─────────────────────────────────────

function buildRequestMoreDocsHtml(institutionName: string, requestedDocs: string): string {
  // Convert newline-separated doc list into styled checklist items
  const docItems = requestedDocs
    .split('\n')
    .map(d => d.trim())
    .filter(Boolean)
    .map(d => `<div class="doc-item"><div class="doc-icon">&#9744;</div><div class="doc-name">${escapeHtml(d)}</div></div>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ApronHanger — Action Required</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
body{margin:0;padding:0;background:#f5f8fc;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;}
.wrapper{width:100%;padding:40px 20px;background:linear-gradient(135deg,#071829 0%,#0D2746 50%,#144A7A 100%);}
.container{max-width:640px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,0.12);}
.header{padding:48px 56px;background:linear-gradient(135deg,#0D2746,#144A7A);position:relative;}
.brand-name{color:#ffffff;font-size:30px;font-weight:700;letter-spacing:-0.5px;}
.brand-name span{color:#74C7FF;}
.brand-tag{margin-top:10px;color:#A6D8FF;font-size:11px;text-transform:uppercase;letter-spacing:2px;}
.hero-title{margin-top:32px;color:#ffffff;font-size:30px;line-height:1.2;font-weight:600;}
.hero-subtitle{margin-top:16px;color:#D6E7F7;font-size:15px;line-height:1.8;}
.status-chip{display:inline-block;margin-top:24px;background:rgba(245,158,11,0.2);border:1px solid rgba(245,158,11,0.4);color:#FDE68A;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;padding:6px 16px;border-radius:999px;}
.content{padding:48px 56px;}
.welcome{color:#334155;font-size:15px;line-height:1.8;}
.institution{font-weight:600;color:#0D2746;}
.docs-box{margin:32px 0;background:#FFFBEB;border:1px solid #FDE68A;border-radius:20px;padding:28px 32px;}
.docs-label{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#D97706;margin-bottom:20px;font-weight:600;}
.doc-item{display:flex;align-items:flex-start;gap:14px;margin-bottom:14px;padding:12px 16px;background:#ffffff;border:1px solid #FEF3C7;border-radius:10px;}
.doc-icon{font-size:18px;color:#D97706;flex-shrink:0;line-height:1;}
.doc-name{color:#334155;font-size:14px;line-height:1.6;font-weight:500;}
.section-title{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#4A90C2;margin-bottom:20px;font-weight:600;}
.step{display:flex;margin-bottom:18px;align-items:flex-start;}
.step-number{width:32px;height:32px;border-radius:10px;background:#E9F4FD;color:#0D2746;font-weight:600;display:flex;align-items:center;justify-content:center;margin-right:16px;flex-shrink:0;font-size:13px;}
.step-text{color:#475569;font-size:14px;line-height:1.8;}
.cta-wrapper{text-align:center;margin:36px 0;}
.cta{display:inline-block;background:#ffffff;color:#0D2746;border:1.5px solid #0D2746;text-decoration:none;padding:13px 31px;border-radius:999px;font-size:14px;font-weight:600;}
.divider{height:1px;background:#E2E8F0;margin:32px 0;}
.support{text-align:center;color:#64748B;font-size:13px;line-height:1.8;}
.signature{margin-top:32px;color:#334155;line-height:1.8;font-size:14px;}
.footer{background:#F8FAFC;padding:28px;text-align:center;border-top:1px solid #E2E8F0;}
.footer-brand{color:#0D2746;font-weight:700;}
.footer-brand span{color:#1D74C7;}
.footer-text{margin-top:10px;font-size:12px;color:#94A3B8;}
</style>
</head>
<body>
<div class="wrapper">
<div class="container">
<div class="header">
<div class="brand-name">Apron<span>hanger</span></div>
<div class="brand-tag">Healthcare Talent Platform</div>
<div class="hero-title">Additional Documents Required</div>
<div class="hero-subtitle">Your application is under review. Our team requires a few additional documents to complete the verification process.</div>
<div class="status-chip">Action Required</div>
</div>
<div class="content">
<div class="welcome">
Dear <span class="institution">${institutionName}</span>,<br><br>
Thank you for submitting your onboarding application to ApronHanger. Our verification team has reviewed your submission and requires the following additional documents to proceed.
</div>
<div class="docs-box">
<div class="docs-label">Documents Required</div>
${docItems || `<div class="doc-item"><div class="doc-icon">&#9744;</div><div class="doc-name">Please contact our support team for the full list of required documents.</div></div>`}
</div>
<div class="section-title">How To Submit</div>
<div class="step"><div class="step-number">1</div><div class="step-text">Gather all the documents listed above in PDF or image format.</div></div>
<div class="step"><div class="step-number">2</div><div class="step-text">Reply to this email with the documents attached, or send them to <strong>onboarding@apronhanger.in</strong>.</div></div>
<div class="step"><div class="step-number">3</div><div class="step-text">Our team will review your submission and update you within 48 business hours.</div></div>
<div class="cta-wrapper"><a href="mailto:onboarding@apronhanger.in" class="cta">Submit Documents</a></div>
<div class="divider"></div>
<div class="support">Questions? Contact us at <strong>support@apronhanger.in</strong><br>We are here to help you get started.</div>
<div class="signature">Warm regards,<br><strong>ApronHanger Onboarding Team</strong><br>Healthcare Talent Platform</div>
</div>
<div class="footer">
<div class="footer-brand">Apron<span>hanger</span></div>
<div class="footer-text">Connecting Hospitals, Clinics and Healthcare Professionals<br><br>&copy; 2026 ApronHanger. All Rights Reserved.</div>
</div>
</div>
</div>
</body>
</html>`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Send the approval email with the institution's activation code.
 * Called after the hospital record is updated in the DB.
 */
export async function sendApprovalEmail(hospital: {
  name: string;
  email?: string | null;
  submittedEmail?: string | null;
  inviteCode?: string | null;
}): Promise<void> {
  const toEmail = resolveEmail(hospital);
  if (!toEmail) {
    logger.warn(`[Email] Approval email skipped — no email on record for "${hospital.name}"`);
    return;
  }

  const institutionName = hospital.name;
  const activationCode  = hospital.inviteCode || 'N/A';

  await sendEmail({
    to:          [{ email: toEmail, name: institutionName }],
    subject:     `Your ApronHanger Account is Approved — Activation Code Inside`,
    htmlContent: buildApprovalHtml(institutionName, activationCode),
  });
}

/**
 * Send the rejection email with the admin's reason.
 */
export async function sendRejectionEmail(hospital: {
  name: string;
  email?: string | null;
  submittedEmail?: string | null;
}, reason: string): Promise<void> {
  const toEmail = resolveEmail(hospital);
  if (!toEmail) {
    logger.warn(`[Email] Rejection email skipped — no email on record for "${hospital.name}"`);
    return;
  }

  await sendEmail({
    to:          [{ email: toEmail, name: hospital.name }],
    subject:     `ApronHanger — Application Status Update`,
    htmlContent: buildRejectionHtml(hospital.name, reason),
  });
}

/**
 * Send the "request more documents" email with the admin's document list.
 */
export async function sendRequestMoreDocsEmail(hospital: {
  name: string;
  email?: string | null;
  submittedEmail?: string | null;
}, requestedDocs: string): Promise<void> {
  const toEmail = resolveEmail(hospital);
  if (!toEmail) {
    logger.warn(`[Email] Docs-request email skipped — no email on record for "${hospital.name}"`);
    return;
  }

  await sendEmail({
    to:          [{ email: toEmail, name: hospital.name }],
    subject:     `Action Required: Additional Documents Needed — ApronHanger`,
    htmlContent: buildRequestMoreDocsHtml(hospital.name, requestedDocs),
  });
}

// ─── Template 4: Offer Letter Notification ───────────────────────────────────

function buildOfferLetterHtml(
  candidateName: string,
  hospitalName: string,
  jobRole: string,
  offerLetterUrl: string,
  portalUrl: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ApronHanger — You've Received an Offer Letter</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
body{margin:0;padding:0;background:#f5f8fc;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;}
.wrapper{width:100%;padding:40px 20px;background:linear-gradient(135deg,#071829 0%,#0D2746 50%,#144A7A 100%);}
.container{max-width:640px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,0.12);}
.header{padding:48px 56px;background:linear-gradient(135deg,#0D2746,#144A7A);position:relative;}
.brand-name{color:#ffffff;font-size:30px;font-weight:700;letter-spacing:-0.5px;}
.brand-name span{color:#74C7FF;}
.brand-tag{margin-top:10px;color:#A6D8FF;font-size:11px;text-transform:uppercase;letter-spacing:2px;}
.hero-title{margin-top:32px;color:#ffffff;font-size:32px;line-height:1.2;font-weight:600;}
.hero-subtitle{margin-top:16px;color:#D6E7F7;font-size:15px;line-height:1.8;}
.status-chip{display:inline-block;margin-top:24px;background:rgba(52,211,153,0.2);border:1px solid rgba(52,211,153,0.4);color:#6EE7B7;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;padding:6px 16px;border-radius:999px;}
.content{padding:48px 56px;}
.welcome{color:#334155;font-size:15px;line-height:1.8;}
.highlight{font-weight:600;color:#0D2746;}
.offer-box{margin:32px 0;background:#F0FDF4;border:1px solid #86EFAC;border-left:4px solid #22C55E;border-radius:12px;padding:24px 28px;}
.offer-label{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#16A34A;margin-bottom:12px;font-weight:600;}
.offer-role{font-size:20px;font-weight:700;color:#0D2746;}
.offer-hospital{font-size:14px;color:#475569;margin-top:4px;}
.section-title{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#4A90C2;margin-bottom:20px;font-weight:600;margin-top:32px;}
.step{display:flex;margin-bottom:18px;align-items:flex-start;}
.step-number{width:32px;height:32px;border-radius:10px;background:#E9F4FD;color:#0D2746;font-weight:600;display:flex;align-items:center;justify-content:center;margin-right:16px;flex-shrink:0;font-size:13px;}
.step-text{color:#475569;font-size:14px;line-height:1.8;}
.cta-wrapper{text-align:center;margin:40px 0 24px;}
.cta-primary{display:inline-block;background:linear-gradient(135deg,#16A34A,#15803D);color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:999px;font-size:14px;font-weight:600;margin-right:12px;}
.cta-secondary{display:inline-block;background:transparent;color:#0D2746;text-decoration:none;padding:15px 28px;border-radius:999px;font-size:14px;font-weight:600;border:1.5px solid #0D2746;}
.divider{height:1px;background:#E2E8F0;margin:32px 0;}
.support{text-align:center;color:#64748B;font-size:13px;line-height:1.8;}
.signature{margin-top:32px;color:#334155;line-height:1.8;font-size:14px;}
.footer{background:#F8FAFC;padding:28px;text-align:center;border-top:1px solid #E2E8F0;}
.footer-brand{color:#0D2746;font-weight:700;}
.footer-brand span{color:#1D74C7;}
.footer-text{margin-top:10px;font-size:12px;color:#94A3B8;}
</style>
</head>
<body>
<div class="wrapper">
<div class="container">
<div class="header">
<div class="brand-name">Apron<span>hanger</span></div>
<div class="brand-tag">Healthcare Talent Platform</div>
<div class="hero-title">Congratulations! You've Received an Offer</div>
<div class="hero-subtitle">A healthcare institution has reviewed your application and extended a job offer to you.</div>
<div class="status-chip">Offer Letter Ready</div>
</div>
<div class="content">
<div class="welcome">
Dear <span class="highlight">${candidateName}</span>,<br><br>
We are pleased to inform you that <span class="highlight">${hospitalName}</span> has sent you an offer letter for the position below. Please review the offer carefully and respond at your earliest convenience.
</div>
<div class="offer-box">
<div class="offer-label">Job Offer Details</div>
<div class="offer-role">${jobRole}</div>
<div class="offer-hospital">${hospitalName}</div>
</div>
<div class="section-title">Next Steps</div>
<div class="step"><div class="step-number">1</div><div class="step-text">Log in to your ApronHanger candidate portal to view and download the offer letter.</div></div>
<div class="step"><div class="step-number">2</div><div class="step-text">Review all terms and conditions in the offer document carefully.</div></div>
<div class="step"><div class="step-number">3</div><div class="step-text">Accept or decline the offer through your portal. Your response will be notified to the recruiter.</div></div>
<div class="cta-wrapper">
<a href="https://apronhanger.work" class="cta-primary">View Offer Letter</a>
</div>
<div class="divider"></div>
<div class="support">If you have any questions regarding this offer, please reach out to the recruiter directly or contact us at<br><strong>support@apronhanger.in</strong></div>
<div class="signature">Best wishes,<br><strong>ApronHanger Team</strong><br>Healthcare Talent Platform</div>
</div>
<div class="footer">
<div class="footer-brand">Apron<span>hanger</span></div>
<div class="footer-text">Connecting Hospitals, Clinics and Healthcare Professionals<br><br>&copy; 2026 ApronHanger. All Rights Reserved.</div>
</div>
</div>
</div>
</body>
</html>`;
}

/**
 * Send the offer letter notification email to a candidate.
 * Called when recruiter sets application status to OfferSent.
 * Only email trigger in the recruitment workflow (per product decision).
 */
export async function sendOfferLetterEmail(
  candidate: { name: string; email: string },
  job: { role: string; hospitalName: string },
  offerLetterUrl: string,
): Promise<void> {
  if (!candidate.email) {
    logger.warn('[Email] Offer letter email skipped — no email for candidate');
    return;
  }

  const portalUrl = process.env.CANDIDATE_PORTAL_URL || 'https://app.apronhanger.com/applications';

  await sendEmail({
    to: [{ email: candidate.email, name: candidate.name }],
    subject: `You've Received a Job Offer from ${job.hospitalName} — ApronHanger`,
    htmlContent: buildOfferLetterHtml(
      candidate.name,
      job.hospitalName,
      job.role,
      offerLetterUrl,
      portalUrl,
    ),
  });
}

