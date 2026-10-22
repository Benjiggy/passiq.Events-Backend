require('dotenv').config();
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { formatCurrency } = require('../utils/formatters');
const QrService = require('./qr.service');

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not set. Add it to your .env or hosting environment variables.');
}
const ADMIN_NOTIFICATION_EMAIL =
  process.env.ADMIN_NOTIFICATION_EMAIL || 'Passiq.events@gmail.com';
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'Passiq Events <onboarding@resend.dev>';
const RESEND_ACCOUNT_DEV_EMAIL = 'darkseid692@gmail.com';
const nodemailer = require('nodemailer');

// ============================================================================
// 👉 PASTE YOUR CLOUDINARY TICKET/EVENT BANNER URL HERE (Line 24):
// Example: "https://res.cloudinary.com/your-cloud/image/upload/v12345/banner.png"
// (Leave as empty string "" if you want it to use the event/tier picture automatically)
// ============================================================================
const CUSTOM_CLOUDINARY_IMAGE_URL = process.env.CLOUDINARY_TICKET_IMAGE_URL || "https://res.cloudinary.com/dxrk4tydc/image/upload/v1792584411/marlian-fest-poster2.png";

function createSmtpTransporter() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransporter ? nodemailer.createTransporter({
    service: 'gmail',
    auth: { user, pass },
  }) : nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

const resend = new Resend(RESEND_API_KEY);

/**
 * Resolve relative or Cloudinary image paths to full public URLs
 */
function resolveImageUrl(imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const baseUrl = (process.env.FRONTEND_URL || 'https://passiq.events').replace(/\/+$/, '');
  return `${baseUrl}/${imagePath.replace(/^\/+/, '')}`;
}

class EmailService {
  /**
   * Safe email sender with Resend sandbox/testing fallback
   */
  static async sendEmailSafe({ from, to, subject, html, attachments = [], replyTo = 'Passiq.events@gmail.com' }) {
    const fromAddress = from || RESEND_FROM_EMAIL;
    try {
      const response = await resend.emails.send({
        from: fromAddress,
        to,
        replyTo,
        subject,
        html,
        attachments,
      });

      if (response.error) {
        throw new Error(response.error.message || JSON.stringify(response.error));
      }

      logger.info(`[EmailService] Email successfully sent to ${to}. Message ID: ${response.data?.id}`);
      return { success: true, data: response.data };
    } catch (error) {
      logger.warn(`[EmailService] Failed to send email to ${to}: ${error.message}`);

      // Handle Resend testing restriction (403: domain not verified, only allowed to darkseid692@gmail.com)
      if (
        error.message?.includes('only send testing emails to your own email address') ||
        error.message?.includes('validation_error') ||
        error.message?.includes('verify a domain')
      ) {
        const transporter = createSmtpTransporter();
        if (transporter) {
          try {
            logger.info(`[EmailService] Sending directly to ${to} via Gmail SMTP fallback...`);
            const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
            const mailRes = await transporter.sendMail({
              from: `Passiq Events <${smtpUser}>`,
              to,
              replyTo,
              subject,
              html,
              attachments: attachments.map((a) => ({
                filename: a.filename,
                content: a.content,
                cid: a.cid,
              })),
            });
            logger.info(`[EmailService] Successfully delivered directly to ${to} via Gmail SMTP!`);
            return { success: true, data: mailRes, smtpFallback: true };
          } catch (smtpErr) {
            logger.warn(`[EmailService] Gmail SMTP fallback failed: ${smtpErr.message}`);
          }
        }

        logger.info(
          `[EmailService] Resend unverified domain restriction active. Rerouting sandbox copy to verified address (${RESEND_ACCOUNT_DEV_EMAIL}). To deliver directly to ${to}, verify your domain at resend.com/domains.`
        );

        const sandboxNotice = `
          <div style="background:#fff3cd;color:#856404;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-family:sans-serif;font-size:13px;border:1px solid #ffeeba;">
            <strong>⚠️ Resend Sandbox Notice:</strong> This receipt & ticket pass was intended for <strong>${to}</strong>.<br/>
            Because this Resend account is currently in sandbox testing mode, it was forwarded to the account owner (<strong>${RESEND_ACCOUNT_DEV_EMAIL}</strong>).<br/>
            <em>To deliver directly to ${to} and all attendee emails, please verify your custom domain (e.g. passiq.events) at <a href="https://resend.com/domains" target="_blank" style="color:#0056b3;">resend.com/domains</a> and set RESEND_FROM_EMAIL in .env.</em>
          </div>
        `;

        try {
          const fallbackRes = await resend.emails.send({
            from: fromAddress,
            to: RESEND_ACCOUNT_DEV_EMAIL,
            replyTo,
            subject: `[FORWARDED TO DEV - FOR ${to}] ${subject}`,
            html: sandboxNotice + html,
            attachments,
          });

          logger.info(
            `[EmailService] Fallback test email delivered to ${RESEND_ACCOUNT_DEV_EMAIL}. Message ID: ${fallbackRes.data?.id}`
          );
          return { success: true, data: fallbackRes.data, sandboxFallback: true };
        } catch (fallbackErr) {
          logger.error(`[EmailService] Sandbox fallback also failed: ${fallbackErr.message}`);
          return { success: false, error: fallbackErr.message };
        }
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to Passiq Admin when an attendee pays via Local Bank Transfer and uploads proof
   */
  static async sendLocalTransferProofNotification({
    order,
    event,
    tier,
    proofFile,
    proofBuffer,
  }) {
    try {
      const recipient = ADMIN_NOTIFICATION_EMAIL;
      const currency = order.currency || event?.currency || 'NGN';
      const formattedTotal = formatCurrency(order.amount, currency);
      const tierName = tier?.name || order.tierId || 'General Admission';
      const submissionTime = new Date().toLocaleString('en-NG', {
        timeZone: 'Africa/Lagos',
        dateStyle: 'full',
        timeStyle: 'medium',
      });

      const attachments = [];
      let hasImageAttachment = false;
      let proofCid = 'proof-of-payment';

      if (proofBuffer) {
        attachments.push({
          filename: proofFile?.originalname || `proof_${order.reference}.jpg`,
          content: proofBuffer,
          cid: proofCid,
        });
        hasImageAttachment = true;
      } else if (proofFile?.path && fs.existsSync(proofFile.path)) {
        const fileContent = fs.readFileSync(proofFile.path);
        attachments.push({
          filename: proofFile.originalname || path.basename(proofFile.path),
          content: fileContent,
          cid: proofCid,
        });
        hasImageAttachment = true;
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0d10; color: #f1f5f9; margin: 0; padding: 24px; }
            .container { max-width: 620px; margin: 0 auto; background: #13171d; border-radius: 20px; border: 1px solid #232933; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            .header { background: #181d24; padding: 24px 32px; border-bottom: 1px solid #232933; text-align: center; }
            .header h1 { margin: 0; font-size: 20px; color: #ccff00; letter-spacing: -0.5px; }
            .header p { margin: 6px 0 0; color: #94a3b8; font-size: 13px; }
            .content { padding: 32px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: rgba(204,255,0,0.15); color: #ccff00; border: 1px solid rgba(204,255,0,0.3); margin-bottom: 16px; }
            .amount-box { background: rgba(204,255,0,0.08); border: 1px solid rgba(204,255,0,0.25); border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px; }
            .amount-box .label { font-size: 11px; text-transform: uppercase; color: #ccff00; font-weight: 700; letter-spacing: 1px; }
            .amount-box .value { font-size: 28px; font-weight: 900; color: #ccff00; margin-top: 4px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            .table td { padding: 12px 0; border-bottom: 1px solid #1e242c; font-size: 13px; }
            .table td.label { color: #94a3b8; width: 38%; font-weight: 500; }
            .table td.value { color: #ffffff; font-weight: 600; text-align: right; }
            .proof-section { background: #181d24; border-radius: 14px; padding: 18px; border: 1px solid #28303d; text-align: center; margin-top: 20px; }
            .proof-section h3 { margin: 0 0 10px; font-size: 14px; color: #ffffff; }
            .proof-img { max-width: 100%; max-height: 400px; border-radius: 10px; border: 1px solid #333d4d; }
            .footer { background: #0e1115; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e242c; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Passiq.Events — Local Bank Transfer Received</h1>
              <p>Action Required: Review bank receipt and confirm ticket order</p>
            </div>
            <div class="content">
              <span class="badge">PROVIDUS BANK TRANSFER</span>
              
              <div class="amount-box">
                <div class="label">Total Amount Paid</div>
                <div class="value">${formattedTotal}</div>
              </div>

              <table class="table">
                <tr>
                  <td class="label">Event Title</td>
                  <td class="value">${event?.title || 'Event Registration'}</td>
                </tr>
                <tr>
                  <td class="label">Order Reference</td>
                  <td class="value"><code style="color:#ccff00;background:#0d1117;padding:2px 6px;border-radius:4px;">${order.reference}</code></td>
                </tr>
                <tr>
                  <td class="label">Attendee Full Name</td>
                  <td class="value">${order.attendeeName}</td>
                </tr>
                <tr>
                  <td class="label">Attendee Email</td>
                  <td class="value">${order.email}</td>
                </tr>
                <tr>
                  <td class="label">Attendee Phone</td>
                  <td class="value">${order.phone || 'Not provided'}</td>
                </tr>
                <tr>
                  <td class="label">Ticket Tier</td>
                  <td class="value">${tierName}</td>
                </tr>
                <tr>
                  <td class="label">Quantity</td>
                  <td class="value">${order.quantity} ticket${order.quantity > 1 ? 's' : ''}</td>
                </tr>
                <tr>
                  <td class="label">Beneficiary Account</td>
                  <td class="value">Providus Bank (1310926732) - PASSIQ GLOBAL VENTURES LTD</td>
                </tr>
                <tr>
                  <td class="label">Submission Date</td>
                  <td class="value">${submissionTime}</td>
                </tr>
              </table>

              ${
                hasImageAttachment
                  ? `
                <div class="proof-section">
                  <h3>Attached Proof of Payment</h3>
                  <p style="font-size:12px;color:#94a3b8;margin-bottom:14px;">The customer attached their bank transfer screenshot/receipt below:</p>
                  <img src="cid:${proofCid}" alt="Proof of Payment Receipt" class="proof-img" />
                </div>
              `
                  : `
                <div class="proof-section">
                  <p style="color:#94a3b8;font-size:12px;margin:0;">Proof file was recorded in system order metadata.</p>
                </div>
              `
              }
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Passiq Events. Automated Transfer Notification Desk.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await this.sendEmailSafe({
        to: recipient,
        subject: `[Passiq Events] New Local Transfer Proof: ${formattedTotal} - ${order.attendeeName} (${order.reference})`,
        html,
        attachments,
      });
    } catch (err) {
      logger.error('[EmailService] Error in sendLocalTransferProofNotification:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send Official Ticket Receipt & Admission Passes with QR Codes & Cloudinary Tier Artwork
   * Triggered upon confirmed payment (Paystack or Bank Transfer verification)
   */
  static async sendTicketPurchaseConfirmation({
    order,
    event,
    tier,
    tickets = [],
  }) {
    try {
      const recipient = order.email;
      const currency = order.currency || event?.currency || 'NGN';
      const formattedTotal = formatCurrency(order.amount, currency);
      const tierName = tier?.name || order.tierId || 'Regular Pass';
      const ticketCount = tickets.length || order.quantity || 1;

      // Resolve Cloudinary or public picture for the purchased tier / pass
      // Prioritizes CUSTOM_CLOUDINARY_IMAGE_URL if pasted at the top of this file
      const rawTierImage =
        CUSTOM_CLOUDINARY_IMAGE_URL ||
        tier?.image ||
        event?.image ||
        event?.poster ||
        '';
      const tierCloudinaryUrl = resolveImageUrl(rawTierImage);

      const attachments = [];

      // Generate individual QR code buffers for every ticket purchased
      const ticketsWithCid = [];
      for (let i = 0; i < tickets.length; i++) {
        const tkt = tickets[i];
        const qrBuffer = await QrService.generateQrCodeBuffer(tkt.qrToken);
        const cid = `qr-${tkt.ticketCode}`;

        if (qrBuffer) {
          attachments.push({
            filename: `ticket-${tkt.ticketCode}.png`,
            content: qrBuffer,
            cid: cid,
          });
        }

        ticketsWithCid.push({
          ...tkt,
          cid,
          formattedPrice: formatCurrency(tkt.unitPrice || (order.amount / ticketCount), currency),
        });
      }

      const paymentDate = new Date().toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      // Build each purchased ticket card (1, 2, 3 or more tickets)
      const ticketCardsHtml = ticketsWithCid
        .map(
          (t, index) => `
          <div style="background:#141921;border:1.5px solid #2d3748;border-radius:20px;padding:24px;margin-bottom:24px;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,0.4);position:relative;overflow:hidden;">
            <!-- Top Pass Bar -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px dashed #2d3748;padding-bottom:12px;">
              <span style="font-size:11px;font-weight:800;color:#ccff00;text-transform:uppercase;letter-spacing:1.5px;background:rgba(204,255,0,0.12);padding:4px 10px;border-radius:6px;">
                🎟️ Ticket Pass ${index + 1} of ${ticketCount}
              </span>
              <span style="font-size:12px;font-weight:700;color:#f1f5f9;letter-spacing:0.5px;">
                ${t.tierName || tierName}
              </span>
            </div>

            <!-- Cloudinary Tier Picture on each pass (if available) -->
            ${
              tierCloudinaryUrl
                ? `
              <div style="margin-bottom:16px;">
                <img src="${tierCloudinaryUrl}" alt="${t.tierName || tierName} Pass" style="width:100%;max-width:480px;height:auto;max-height:160px;object-fit:cover;border-radius:12px;border:1px solid #2d3748;display:block;margin:0 auto;" />
              </div>
            `
                : ''
            }

            <!-- Scannable Gate QR Code -->
            <div style="background:#ffffff;padding:14px;border-radius:16px;display:inline-block;margin:10px auto;box-shadow:0 4px 16px rgba(0,0,0,0.25);">
              <img src="cid:${t.cid}" alt="Gate QR Code for Ticket ${t.ticketCode}" width="190" height="190" style="display:block;margin:0 auto;" />
            </div>

            <!-- Ticket Identification Number -->
            <div style="margin-top:14px;">
              <div style="font-size:11px;text-transform:uppercase;color:#94a3b8;letter-spacing:1px;font-weight:600;margin-bottom:4px;">Official Ticket Number</div>
              <div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:19px;font-weight:900;color:#ccff00;letter-spacing:2.5px;background:#0d1117;display:inline-block;padding:6px 16px;border-radius:8px;border:1px solid #232b36;">
                ${t.ticketCode}
              </div>
            </div>

            <!-- Ticket Price & Admission Status -->
            <div style="margin-top:14px;display:flex;justify-content:space-around;font-size:12px;color:#cbd5e1;padding-top:12px;border-top:1px dashed #232b36;">
              <div>Tier: <strong style="color:#ffffff;">${t.tierName || tierName}</strong></div>
              <div>Price: <strong style="color:#ffffff;">${t.formattedPrice}</strong></div>
              <div>Status: <strong style="color:#4ade80;">Active Pass</strong></div>
            </div>

            <div style="margin-top:12px;font-size:11px;color:#64748b;">
              🔒 Valid for 1 single admission scan at the entrance gate
            </div>
          </div>
        `
        )
        .join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Passiq Events Receipt & Ticket Pass</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0d10; color: #f1f5f9; margin: 0; padding: 20px 10px; }
            .container { max-width: 600px; margin: 0 auto; background: #11151c; border-radius: 24px; border: 1px solid #232b38; overflow: hidden; box-shadow: 0 16px 40px rgba(0,0,0,0.6); }
            .brand-header { background: #161c24; padding: 24px 30px; text-align: center; border-bottom: 1px solid #242c38; }
            .brand-logo { font-size: 24px; font-weight: 900; color: #ccff00; letter-spacing: -0.5px; margin: 0; }
            .brand-subtitle { font-size: 12px; color: #94a3b8; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 1.5px; }
            
            /* Paystack Receipt Highlight Box */
            .receipt-banner { background: #1a222e; border: 1px solid #2d3848; border-radius: 18px; padding: 24px; margin: 24px; text-align: center; }
            .merchant-title { font-size: 13px; font-weight: 800; color: #cbd5e1; text-transform: uppercase; letter-spacing: 1.5px; }
            .receipt-note { font-size: 13px; color: #94a3b8; margin: 6px 0 10px; }
            .total-amount { font-size: 36px; font-weight: 900; color: #ccff00; letter-spacing: -1px; margin: 8px 0; }
            .verified-badge { display: inline-block; background: rgba(74,222,128,0.15); color: #4ade80; border: 1px solid rgba(74,222,128,0.3); padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }

            .content { padding: 0 24px 24px; }
            
            /* Cloudinary Tier Banner Feature */
            .tier-banner-box { margin-bottom: 24px; border-radius: 18px; overflow: hidden; border: 1px solid #2d3848; background: #161c24; }
            .tier-banner-img { width: 100%; height: auto; max-height: 240px; object-fit: cover; display: block; }
            .tier-banner-caption { padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; background: #161c24; font-size: 13px; }

            /* Transaction Details Table */
            .details-card { background: #161c24; border-radius: 16px; border: 1px solid #262e3b; padding: 18px 20px; margin-bottom: 28px; }
            .card-title { font-size: 12px; font-weight: 800; color: #ccff00; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 14px; border-bottom: 1px solid #232b38; padding-bottom: 8px; }
            .detail-row { display: flex; justify-content: space-between; font-size: 13px; padding: 7px 0; border-bottom: 1px solid #1c232d; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { color: #94a3b8; font-weight: 500; }
            .detail-value { color: #ffffff; font-weight: 700; text-align: right; }

            /* Pass Header */
            .passes-heading { text-align: center; margin: 28px 0 16px; }
            .passes-heading h2 { font-size: 18px; font-weight: 900; color: #ffffff; margin: 0; }
            .passes-heading p { font-size: 12px; color: #94a3b8; margin: 4px 0 0; }

            .gate-notice { background: rgba(204,255,0,0.06); border: 1px solid rgba(204,255,0,0.2); border-radius: 14px; padding: 16px; font-size: 12px; color: #cbd5e1; text-align: center; margin-top: 20px; }
            .footer { background: #0c0f14; padding: 24px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1c232d; }
            .footer a { color: #ccff00; text-decoration: none; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Brand Header -->
            <div class="brand-header">
              <div class="brand-logo">Passiq.Events</div>
              <div class="brand-subtitle">Official Ticket Receipt & Admission Pass</div>
            </div>

            <!-- Receipt from PASSIQ GLOBAL VENTURES LTD (Matching Paystack receipt in your screenshot) -->
            <div class="receipt-banner">
              <div class="merchant-title">PASSIQ GLOBAL VENTURES LTD</div>
              <div class="receipt-note">received your payment of</div>
              <div class="total-amount">${formattedTotal}</div>
              <div class="verified-badge">✓ Paid via Paystack • Confirmed</div>
            </div>

            <div class="content">
              <!-- Cloudinary Purchased Tier Banner (if available) -->
              ${
                tierCloudinaryUrl
                  ? `
                <div class="tier-banner-box">
                  <img src="${tierCloudinaryUrl}" alt="${tierName} Pass Artwork" class="tier-banner-img" />
                  <div class="tier-banner-caption">
                    <span style="color:#ffffff;font-weight:700;">${tierName}</span>
                    <span style="color:#ccff00;font-weight:800;">${ticketCount} Ticket${ticketCount > 1 ? 's' : ''} Issued</span>
                  </div>
                </div>
              `
                  : ''
              }

              <!-- Transaction & Event Details Card -->
              <div class="details-card">
                <div class="card-title">Transaction & Event Details</div>
                
                <div class="detail-row">
                  <span class="detail-label">Event</span>
                  <span class="detail-value">${event?.title || 'Event Registration'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Reference</span>
                  <span class="detail-value" style="font-family:monospace;color:#ccff00;">${order.reference}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Payment Date</span>
                  <span class="detail-value">${paymentDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Attendee Name</span>
                  <span class="detail-value">${order.attendeeName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Purchased Pass Tier</span>
                  <span class="detail-value">${tierName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Quantity</span>
                  <span class="detail-value">${ticketCount} Ticket${ticketCount > 1 ? 's' : ''}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Event Date & Time</span>
                  <span class="detail-value">${event?.date || 'As announced'} at ${event?.time || '18:00'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Venue</span>
                  <span class="detail-value">${event?.location || 'Venue on pass'}</span>
                </div>
              </div>

              <!-- Passes Heading -->
              <div class="passes-heading">
                <h2>Your Admission Passes & Gate QR Codes</h2>
                <p>Present the QR code(s) below at the gate scanner for admission</p>
              </div>

              <!-- Individual Ticket Pass Cards (1, 2, 3 or more tickets) -->
              ${ticketCardsHtml}

              <!-- Gate Tips -->
              <div class="gate-notice">
                💡 <strong>Gate Scanner Tip:</strong> You can open this email directly on your phone at the entrance, or save the attached QR code image(s) to your photo gallery for offline scanning.
              </div>
            </div>

            <!-- Footer & Support Notice (Matching Paystack screenshot support contact) -->
            <div class="footer">
              <p style="margin:0 0 8px;color:#94a3b8;">
                If you have any issues with payment or admission, kindly reply to this email or send an email to <a href="mailto:passiq.events@gmail.com">passiq.events@gmail.com</a>
              </p>
              <p style="margin:4px 0 0;font-size:11px;">
                © ${new Date().getFullYear()} PASSIQ GLOBAL VENTURES LTD. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await this.sendEmailSafe({
        to: recipient,
        replyTo: 'Passiq.events@gmail.com',
        subject: `🎟️ Your Tickets for ${event?.title || 'Event'} - PASSIQ GLOBAL VENTURES LTD [${order.reference}]`,
        html,
        attachments,
      });
    } catch (err) {
      logger.error('[EmailService] Error in sendTicketPurchaseConfirmation:', err);
      return { success: false, error: err.message };
    }
  }
}

module.exports = EmailService;
