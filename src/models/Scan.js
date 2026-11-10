const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      default: null,
      index: true
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      default: null,
      index: true
    },
    result: {
      type: String,
      enum: ['success', 'duplicate', 'invalid', 'void'],
      required: true,
      index: true
    },
    scannedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    operator: {
      type: String,
      default: 'Scanner'
    },
    scannerLabel: {
      type: String,
      default: 'Main Gate'
    },
    ip: {
      type: String,
      default: ''
    },
    holderName: {
      type: String,
      default: ''
    },
    holderEmail: {
      type: String,
      default: ''
    },
    ticketType: {
      type: String,
      default: ''
    },
    eventTitle: {
      type: String,
      default: ''
    },
    firstScanAt: {
      type: Date,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

const Scan = mongoose.models.Scan || mongoose.model('Scan', scanSchema);
module.exports = Scan;
