const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

class QrService {
  /**
   * Generates Base64 Data URL for in-app and web display
   */
  static async generateQrCodeDataUrl(text) {
    try {
      return await QRCode.toDataURL(text, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        width: 320,
      });
    } catch (err) {
      console.error('Failed to generate QR Code Data URL:', err);
      return '';
    }
  }

  /**
   * Generates a binary PNG buffer for email attachments
   */
  static async generateQrCodeBuffer(text) {
    try {
      return await QRCode.toBuffer(text, {
        errorCorrectionLevel: 'H',
        type: 'png',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        width: 320,
      });
    } catch (err) {
      console.error('Failed to generate QR Code Buffer:', err);
      return null;
    }
  }

  /**
   * Generates a public HTTPS QR Code image URL that renders 100% reliably
   * in all email clients (Gmail, Outlook, Yahoo, Apple Mail) without broken image icons
   */
  static getPublicQrImageUrl(text, size = 300) {
    const encoded = encodeURIComponent(text);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&format=png&margin=8&data=${encoded}`;
  }

  /**
   * Saves the generated QR code to the server's public uploads directory
   */
  static async saveQrCodeToDisk(text, filename) {
    try {
      const uploadDir = path.join(__dirname, '../../uploads/qrcodes');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, filename);
      const buffer = await this.generateQrCodeBuffer(text);
      if (buffer) {
        fs.writeFileSync(filePath, buffer);
        return `/uploads/qrcodes/${filename}`;
      }
    } catch (e) {
      console.error('Failed to save QR code to disk:', e);
    }
    return '';
  }
}

module.exports = QrService;
