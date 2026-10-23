const { Resend } = require("resend");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
// const { sendEmailSafe, renderTemplate } = require("../services/mailer");
const EmailService = require("../services/email.service");

// const renderTemplate = (templateName, placeholders = {}) => {
//   const templatePath = path.join(
//     __dirname,
//     "../templates",
//     `${templateName}.html`,
//   );
//   const html = fs.readFileSync(templatePath, "utf-8");

//   // Single pass so a replaced value can never be re-processed as a placeholder
//   return html.replace(/\{\{\s*\w+\s*\}\}/g, (match) =>
//     Object.prototype.hasOwnProperty.call(placeholders, match)
//       ? placeholders[match]
//       : match,
//   );
// };

const html = EmailService.renderTemplate("ticket-confirmation", {
  "{{formattedTotal}}": "2000",
  "{{tierBanner}}": "",
  "{{eventTitle}}": "Event Registration",
  "{{reference}}": "24838yfz",
  "{{paymentDate}}": "today",
  "{{attendeeName}}": "agborex",
  "{{tierName}}": "regular pass",
  "{{ticketCountText}}": 1,
  "{{eventDate}}": "As announced",
  "{{eventTime}}": "18:00",
  "{{eventLocation}}": "Venue on pass",
  "{{ticketCards}}": "",
  "{{year}}": String(new Date().getFullYear()),
});

(async () => {
  const result = await EmailService.sendEmailSafe({
    to: "agboe4102@gmail.com",
    replyTo: "Passiq.events@gmail.com",
    subject: "Your Tickets for Event - PASSIQ GLOBAL VENTURES LTD [TEST]",
    html,
  });
  console.log(result);
})();
