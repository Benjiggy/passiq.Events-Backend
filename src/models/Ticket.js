const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    ticketCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true
    },
    reference: {
      type: String,
      required: true,
      index: true
    },
    paymentReference: {
      type: String,
      default: ''
    },
    qrToken: {
      type: String,
      required: true
    },
    qrDataUrl: {
      type: String,
      default: ''
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    tierId: {
      type: String,
      required: true
    },
    eventTitle: String,
    eventDate: String,
    eventTime: String,
    eventLocation: String,
    eventImage: String,
    tierName: String,
    userName: {
      type: String,
      required: true
    },
    userEmail: {
      type: String,
      required: true
    },
    userPhone: {
      type: String,
      default: ''
    },
    unitPrice: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'NGN'
    },
    status: {
      type: String,
      enum: ['valid', 'used', 'revoked', 'demo'],
      default: 'valid'
    },
    isDemo: {
      type: Boolean,
      default: false
    },
    checkedInAt: {
      type: Date,
      default: null
    },
    checkedInBy: {
      type: String,
      default: null
    },
    issuedAt: {
      type: Date,
      default: Date.now
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

const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);
module.exports = Ticket;
