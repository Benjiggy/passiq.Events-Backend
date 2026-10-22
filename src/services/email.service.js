const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { formatCurrency } = require('../utils/formatters');
const QrService = require('./qr.service');

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not set in environment variables');
}

const ADMIN_NOTIFICATION_EMAIL =
  process.env.ADMIN_NOTIFICATION_EMAIL || 'Passiq.events@gmail.com';
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'Passiq Events <onboarding@resend.dev>';
const RESEND_ACCOUNT_DEV_EMAIL = 'darkseid692@gmail.com';
const resend = new Resend(RESEND_API_KEY);

class EmailService {
  /**
   * Safe email sender with Resend sandbox/testing fallback
   */
  static async sendEmailSafe({ from, to, subject, html, attachments = [] }) {
    const fromAddress = from || RESEND_FROM_EMAIL;
    try {
      const response = await resend.emails.send({
        from: fromAddress,
        to,
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
        logger.info(
          `[EmailService] Resend unverified domain restriction active. Rerouting sandbox copy to verified address (${RESEND_ACCOUNT_DEV_EMAIL}). To deliver directly to ${to}, verify your domain at resend.com/domains.`
        );

        const sandboxNotice = `
          <div style="background:#fff3cd;color:#856404;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-family:sans-serif;font-size:13px;border:1px solid #ffeeba;">
            <strong>⚠️ Resend Sandbox Notice:</strong> This email was intended for <strong>${to}</strong>.<br/>
            Because this Resend account is currently in sandbox testing mode, it was forwarded to the account owner (<strong>${RESEND_ACCOUNT_DEV_EMAIL}</strong>).<br/>
            <em>To deliver directly to ${to} and attendee emails, please verify your custom domain (e.g. passiq.events) at <a href="https://resend.com/domains" target="_blank" style="color:#0056b3;">resend.com/domains</a> and set RESEND_FROM_EMAIL in .env.</em>
          </div>
        `;

        try {
          const fallbackRes = await resend.emails.send({
            from: fromAddress,
            to: RESEND_ACCOUNT_DEV_EMAIL,
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

      // Attach proof file if available
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
              <span class="badge">PROVIdUS BANK TRANSFER</span>
              
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
   * Send Ticket Confirmation with Random QR Codes and ticket amounts to the attendee
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

      const attachments = [];

      // Generate QR buffers for every ticket and prepare inline CID attachments
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
          formattedPrice: formatCurrency(tkt.unitPrice || (order.amount / order.quantity), currency),
        });
      }

      // Build Ticket Pass cards HTML
      const ticketCardsHtml = ticketsWithCid
        .map(
          (t, index) => `
          <div style="background:#181d24;border:1px solid #2d3644;border-radius:18px;padding:24px;margin-bottom:20px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid #262e3b;padding-bottom:10px;">
              <span style="font-size:11px;font-weight:700;color:#ccff00;text-transform:uppercase;letter-spacing:1px;">Ticket ${index + 1} of ${tickets.length}</span>
              <span style="font-size:11px;font-weight:600;color:#94a3b8;">${t.tierName || tierName}</span>
            </div>

            <div style="background:#ffffff;padding:12px;border-radius:14px;display:inline-block;margin:10px 0;">
              <img src="cid:${t.cid}" alt="QR Code for Ticket ${t.ticketCode}" width="180" height="180" style="display:block;margin:0 auto;" />
            </div>

            <div style="margin-top:12px;">
              <div style="font-size:12px;color:#94a3b8;margin-bottom:2px;">Ticket Number</div>
              <div style="font-family:monospace;font-size:17px;font-weight:900;color:#ccff00;letter-spacing:2px;">${t.ticketCode}</div>
            </div>

            <div style="margin-top:10px;font-size:12px;color:#cbd5e1;">
              Admission Price: <strong style="color:#ffffff;">${t.formattedPrice}</strong>
            </div>

            <div style="margin-top:10px;font-size:11px;color:#64748b;border-top:1px dashed #283241;padding-top:10px;">
              🔒 Unique Gate QR Pass • Valid for 1 single admission scan
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
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0d10; color: #f1f5f9; margin: 0; padding: 24px; }
            .container { max-width: 620px; margin: 0 auto; background: #13171d; border-radius: 20px; border: 1px solid #232933; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            .header { background: #181d24; padding: 28px 32px; border-bottom: 1px solid #232933; text-align: center; }
            .header h1 { margin: 0; font-size: 22px; color: #ccff00; letter-spacing: -0.5px; }
            .header p { margin: 6px 0 0; color: #94a3b8; font-size: 14px; }
            .content { padding: 32px; }
            .event-card { background: #181d24; border: 1px solid #283241; border-radius: 16px; padding: 20px; margin-bottom: 24px; }
            .event-title { font-size: 18px; font-weight: 800; color: #ffffff; margin: 0 0 10px; }
            .event-detail { font-size: 13px; color: #94a3b8; margin: 4px 0; }
            .event-detail strong { color: #ffffff; }
            .summary-box { background: rgba(204,255,0,0.06); border: 1px solid rgba(204,255,0,0.2); border-radius: 14px; padding: 18px; margin-bottom: 28px; }
            .summary-row { display: flex; justify-content: space-between; font-size: 13px; margin: 6px 0; }
            .summary-row.total { border-top: 1px solid rgba(204,255,0,0.2); padding-top: 10px; margin-top: 10px; font-size: 15px; font-weight: 800; color: #ccff00; }
            .footer { background: #0e1115; padding: 24px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e242c; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>You're In! Here Are Your Event Tickets</h1>
              <p>Confirmed Passiq Ticket Purchase — Present QR Codes at the gate</p>
            </div>
            
            <div class="content">
              <!-- Event Information -->
              <div class="event-card">
                <div class="event-title">${event?.title || 'Event Admission'}</div>
                <div class="event-detail">📅 Date: <strong>${event?.date || 'As announced'}</strong></div>
                <div class="event-detail">⏰ Time: <strong>${event?.time || 'Doors open 18:00'}</strong></div>
                <div class="event-detail">📍 Venue: <strong>${event?.location || 'Venue announced on pass'}</strong></div>
              </div>

              <!-- Order Summary -->
              <div class="summary-box">
                <div style="font-size:11px;font-weight:700;color:#ccff00;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Order Details</div>
                <div style="font-size:13px;color:#94a3b8;margin-bottom:4px;">Attendee: <strong style="color:#ffffff;">${order.attendeeName}</strong></div>
                <div style="font-size:13px;color:#94a3b8;margin-bottom:4px;">Order Reference: <strong style="color:#ccff00;font-family:monospace;">${order.reference}</strong></div>
                <div style="font-size:13px;color:#94a3b8;margin-bottom:4px;">Number of Tickets: <strong style="color:#ffffff;">${order.quantity} ticket${order.quantity > 1 ? 's' : ''} (${tierName})</strong></div>
                <div style="font-size:15px;font-weight:800;color:#ccff00;margin-top:10px;border-top:1px solid rgba(204,255,0,0.2);padding-top:8px;">
                  Total Amount Paid: ${formattedTotal}
                </div>
              </div>

              <h2 style="font-size:16px;font-weight:800;color:#ffffff;margin:24px 0 16px;text-align:center;">Your Admission Passes & QR Codes</h2>
              
              <!-- Ticket Passes -->
              ${ticketCardsHtml}

              <div style="background:#131a24;border:1px solid #1e2c3d;border-radius:12px;padding:14px;text-align:center;font-size:12px;color:#94a3b8;margin-top:20px;">
                💡 <strong>Gate Tip:</strong> You can show this email directly on your phone at the gate, or save the attached QR code image(s) to your photo library for quick check-in.
              </div>
            </div>

            <div class="footer">
              <p>Sent to <strong>${recipient}</strong> for order ${order.reference}.</p>
              <p>© ${new Date().getFullYear()} Passiq Events. Instant QR Ticketing Infrastructure.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await this.sendEmailSafe({
        to: recipient,
        subject: `🎟️ Your Tickets for ${event?.title || 'Event'} - Passiq Events [Ref: ${order.reference}]`,
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

