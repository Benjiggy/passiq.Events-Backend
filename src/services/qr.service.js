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

  static async generateQrCodeBuffer(text) {
    try {
      return await QRCode.toBuffer(text, {
        errorCorrectionLevel: 'H',
        type: 'png',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        width: 300
      });
    } catch (err) {
      console.error('Failed to generate QR Code Buffer:', err);
      return null;
    }
  }
}

module.exports = QrService;
