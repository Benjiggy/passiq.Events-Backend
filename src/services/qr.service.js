const QRCode = require('qrcode');

class QrService {
  static async generateQrCodeDataUrl(text) {
    try {
      return await QRCode.toDataURL(text, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        width: 300
      });
    } catch (err) {
      console.error('Failed to generate QR Code:', err);
      return '';
    }
  }
}

module.exports = QrService;
