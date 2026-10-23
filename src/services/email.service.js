require("dotenv").config();
const { Resend } = require("resend");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");
const { formatCurrency } = require("../utils/formatters");
const QrService = require("./qr.service");

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  throw new Error(
    "RESEND_API_KEY is not set. Add it to your .env or hosting environment variables.",
  );
}
const ADMIN_NOTIFICATION_EMAIL =
  process.env.ADMIN_NOTIFICATION_EMAIL || "Passiq.events@gmail.com";
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Passiq Events <onboarding@resend.dev>";
const RESEND_ACCOUNT_DEV_EMAIL = "darkseid692@gmail.com";
// const RESEND_ACCOUNT_DEV_EMAIL = "agboe4102@gmail.com";
const nodemailer = require("nodemailer");

// ============================================================================
// 👉 PASTE YOUR CLOUDINARY TICKET/EVENT BANNER URL HERE (Line 24):
// Example: "https://res.cloudinary.com/your-cloud/image/upload/v12345/banner.png"
// (Leave as empty string "" if you want it to use the event/tier picture automatically)
// ============================================================================
const CUSTOM_CLOUDINARY_IMAGE_URL =
  process.env.CLOUDINARY_TICKET_IMAGE_URL ||
  "https://res.cloudinary.com/dxrk4tydc/image/upload/v1792584411/marlian-fest-poster2.png";

function createSmtpTransporter() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransporter
    ? nodemailer.createTransporter({
        service: "gmail",
        auth: { user, pass },
      })
    : nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
      });
}

const resend = new Resend(RESEND_API_KEY);

/**
 * Resolve relative or Cloudinary image paths to full public URLs
 */
function resolveImageUrl(imagePath) {
  if (!imagePath) return "";
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  const baseUrl = (process.env.FRONTEND_URL || "https://passiq.events").replace(
    /\/+$/,
    "",
  );
  return `${baseUrl}/${imagePath.replace(/^\/+/, "")}`;
}

/**
 * Escape user-supplied text before it goes into an HTML template
 */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Load an HTML template from ../templates and swap {{placeholders}}.
 * Placeholder keys are written exactly as they appear in the template,
 * e.g. { "{{fullName}}": "Agbo Emmanuel" }
 */
function renderTemplate(templateName, placeholders = {}) {
  const templatePath = path.join(
    __dirname,
    "../templates",
    `${templateName}.html`,
  );
  const html = fs.readFileSync(templatePath, "utf-8");

  // Single pass so a replaced value can never be re-processed as a placeholder
  return html.replace(/\{\{\s*\w+\s*\}\}/g, (match) =>
    Object.prototype.hasOwnProperty.call(placeholders, match)
      ? placeholders[match]
      : match,
  );
}

class EmailService {
  /**
   * Expose the template renderer (handy for testing templates on their own)
   */
  static renderTemplate(templateName, placeholders) {
    return renderTemplate(templateName, placeholders);
  }

  /**
   * Safe email sender with Resend sandbox/testing fallback
   */
  static async sendEmailSafe({
    from,
    to,
    subject,
    html,
    attachments = [],
    replyTo = "Passiq.events@gmail.com",
  }) {
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
        throw new Error(
          response.error.message || JSON.stringify(response.error),
        );
      }

      logger.info(
        `[EmailService] Email successfully sent to ${to}. Message ID: ${response.data?.id}`,
      );
      return { success: true, data: response.data };
    } catch (error) {
      logger.warn(
        `[EmailService] Failed to send email to ${to}: ${error.message}`,
      );

      // Handle Resend testing restriction (403: domain not verified, only allowed to the account owner email)
      if (
        error.message?.includes(
          "only send testing emails to your own email address",
        ) ||
        error.message?.includes("validation_error") ||
        error.message?.includes("verify a domain")
      ) {
        const transporter = createSmtpTransporter();
        if (transporter) {
          try {
            logger.info(
              `[EmailService] Sending directly to ${to} via Gmail SMTP fallback...`,
            );
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
            logger.info(
              `[EmailService] Successfully delivered directly to ${to} via Gmail SMTP!`,
            );
            return { success: true, data: mailRes, smtpFallback: true };
          } catch (smtpErr) {
            logger.warn(
              `[EmailService] Gmail SMTP fallback failed: ${smtpErr.message}`,
            );
          }
        }

        logger.info(
          `[EmailService] Resend unverified domain restriction active. Rerouting sandbox copy to verified address (${RESEND_ACCOUNT_DEV_EMAIL}). To deliver directly to ${to}, verify your domain at resend.com/domains.`,
        );

        const sandboxNotice = renderTemplate("sandbox-notice", {
          "{{to}}": escapeHtml(to),
          "{{devEmail}}": escapeHtml(RESEND_ACCOUNT_DEV_EMAIL),
        });

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
            `[EmailService] Fallback test email delivered to ${RESEND_ACCOUNT_DEV_EMAIL}. Message ID: ${fallbackRes.data?.id}`,
          );
          return {
            success: true,
            data: fallbackRes.data,
            sandboxFallback: true,
          };
        } catch (fallbackErr) {
          logger.error(
            `[EmailService] Sandbox fallback also failed: ${fallbackErr.message}`,
          );
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
      const currency = order.currency || event?.currency || "NGN";
      const formattedTotal = formatCurrency(order.amount, currency);
      const tierName = tier?.name || order.tierId || "General Admission";
      const submissionTime = new Date().toLocaleString("en-NG", {
        timeZone: "Africa/Lagos",
        dateStyle: "full",
        timeStyle: "medium",
      });

      const attachments = [];
      let hasImageAttachment = false;
      let proofCid = "proof-of-payment";

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

      // Proof block: screenshot attached, or "recorded in metadata" note
      const proofSection = hasImageAttachment
        ? renderTemplate("proof-attached", { "{{proofCid}}": proofCid })
        : renderTemplate("proof-recorded");

      const html = renderTemplate("local-transfer-proof", {
        "{{formattedTotal}}": escapeHtml(formattedTotal),
        "{{eventTitle}}": escapeHtml(event?.title || "Event Registration"),
        "{{reference}}": escapeHtml(order.reference),
        "{{attendeeName}}": escapeHtml(order.attendeeName),
        "{{attendeeEmail}}": escapeHtml(order.email),
        "{{attendeePhone}}": escapeHtml(order.phone || "Not provided"),
        "{{tierName}}": escapeHtml(tierName),
        "{{quantityText}}": `${order.quantity} ticket${order.quantity > 1 ? "s" : ""}`,
        "{{submissionTime}}": escapeHtml(submissionTime),
        "{{proofSection}}": proofSection,
        "{{year}}": String(new Date().getFullYear()),
      });

      return await EmailService.sendEmailSafe({
        to: recipient,
        subject: `[Passiq Events] New Local Transfer Proof: ${formattedTotal} - ${order.attendeeName} (${order.reference})`,
        html,
        attachments,
      });
    } catch (err) {
      logger.error(
        "[EmailService] Error in sendLocalTransferProofNotification:",
        err,
      );
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
      const currency = order.currency || event?.currency || "NGN";
      const formattedTotal = formatCurrency(order.amount, currency);
      const tierName = tier?.name || order.tierId || "Regular Pass";
      const ticketCount = tickets.length || order.quantity || 1;
      const ticketCountText = `${ticketCount} Ticket${ticketCount > 1 ? "s" : ""}`;

      // Resolve Cloudinary or public picture for the purchased tier / pass
      // Prioritizes CUSTOM_CLOUDINARY_IMAGE_URL if pasted at the top of this file
      const rawTierImage =
        tier?.image ||
        event?.image ||
        event?.poster ||
        CUSTOM_CLOUDINARY_IMAGE_URL ||
        "";
      const tierCloudinaryUrl = resolveImageUrl(rawTierImage);

      const attachments = [];

      // Generate individual QR code buffers & public image URLs for every ticket purchased
      const ticketsWithCid = [];
      for (let i = 0; i < tickets.length; i++) {
        const tkt = tickets[i];
        const qrBuffer = await QrService.generateQrCodeBuffer(tkt.qrToken);
        const cid = `qr-${tkt.ticketCode}`;
        const qrImageUrl = QrService.getPublicQrImageUrl(tkt.qrToken, 320);

        if (qrBuffer) {
          attachments.push({
            filename: `Passiq-Ticket-${tkt.ticketCode}-QR.png`,
            content: qrBuffer,
            cid: cid,
          });
        }

        ticketsWithCid.push({
          ...tkt,
          cid,
          qrImageUrl,
          formattedPrice: formatCurrency(
            tkt.unitPrice || order.amount / ticketCount,
            currency,
          ),
        });
      }

      const paymentDate = new Date().toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      // Build each purchased ticket card (1, 2, 3 or more tickets)
      const ticketCardsHtml = ticketsWithCid
        .map((t, index) => {
          const passTierName = escapeHtml(t.tierName || tierName);

          // Cloudinary tier picture on each pass (if available)
          const ticketImage = tierCloudinaryUrl
            ? renderTemplate("ticket-image", {
                "{{tierImageUrl}}": tierCloudinaryUrl,
                "{{passTierName}}": passTierName,
              })
            : "";

          return renderTemplate("ticket-card", {
            "{{index}}": String(index + 1),
            "{{ticketCount}}": String(ticketCount),
            "{{passTierName}}": passTierName,
            "{{ticketImage}}": ticketImage,
            "{{qrImageUrl}}": t.qrImageUrl,
            "{{qrToken}}": t.qrToken,
            "{{ticketCode}}": escapeHtml(t.ticketCode),
            "{{formattedPrice}}": escapeHtml(t.formattedPrice),
          });
        })
        .join("");

      // Cloudinary purchased tier banner (if available)
      const tierBanner = tierCloudinaryUrl
        ? renderTemplate("tier-banner", {
            "{{tierImageUrl}}": tierCloudinaryUrl,
            "{{tierName}}": escapeHtml(tierName),
            "{{ticketCountText}}": ticketCountText,
          })
        : "";

      const html = renderTemplate("ticket-confirmation", {
        "{{formattedTotal}}": escapeHtml(formattedTotal),
        "{{tierBanner}}": tierBanner,
        "{{eventTitle}}": escapeHtml(event?.title || "Event Registration"),
        "{{reference}}": escapeHtml(order.reference),
        "{{paymentDate}}": paymentDate,
        "{{attendeeName}}": escapeHtml(order.attendeeName),
        "{{tierName}}": escapeHtml(tierName),
        "{{ticketCountText}}": ticketCountText,
        "{{eventDate}}": escapeHtml(event?.date || "As announced"),
        "{{eventTime}}": escapeHtml(event?.time || "18:00"),
        "{{eventLocation}}": escapeHtml(event?.location || "Venue on pass"),
        "{{ticketCards}}": ticketCardsHtml,
        "{{year}}": String(new Date().getFullYear()),
      });

      return await EmailService.sendEmailSafe({
        to: recipient,
        replyTo: "Passiq.events@gmail.com",
        subject: `Your Tickets for ${event?.title || "Event"} - PASSIQ GLOBAL VENTURES LTD [${order.reference}]`,
        html,
        attachments,
      });
    } catch (err) {
      logger.error(
        "[EmailService] Error in sendTicketPurchaseConfirmation:",
        err,
      );
      return { success: false, error: err.message };
    }
  }
}

module.exports = EmailService;
