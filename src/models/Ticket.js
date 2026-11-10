const mongoose = require('mongoose');
const crypto = require('crypto');

const ticketSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      uppercase: true,
      trim: true
    },
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
      required: true,
      index: true
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
    tierImage: String,
    tierName: String,
    ticketType: {
      type: String,
      default: 'Regular'
    },
    userName: {
      type: String,
      required: true
    },
    holderName: {
      type: String,
      default: ''
    },
    userEmail: {
      type: String,
      required: true
    },
    holderEmail: {
      type: String,
      default: ''
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
      enum: ['valid', 'used', 'void', 'revoked', 'demo'],
      default: 'valid',
      index: true
    },
    isDemo: {
      type: Boolean,
      default: false
    },
    checkedInAt: {
      type: Date,
      default: null
    },
    usedAt: {
      type: Date,
      default: null
    },
    checkedInBy: {
      type: String,
      default: null
    },
    usedBy: {
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

ticketSchema.pre('validate', function (next) {
  if (!this.code) {
    if (this.ticketCode) {
      this.code = this.ticketCode;
    } else {
      this.code = 'PASSIQ-' + crypto.randomBytes(6).toString('hex').toUpperCase();
    }
  }
  if (!this.ticketCode) {
    this.ticketCode = this.code;
  }
  this.code = this.code.toUpperCase().trim();
  this.ticketCode = this.ticketCode.toUpperCase().trim();

  if (!this.holderName) this.holderName = this.userName || 'Attendee';
  if (!this.userName) this.userName = this.holderName;

  if (!this.holderEmail) this.holderEmail = this.userEmail || '';
  if (!this.userEmail) this.userEmail = this.holderEmail;

  if (!this.ticketType) this.ticketType = this.tierName || 'Regular';
  if (!this.tierName) this.tierName = this.ticketType;

  if (this.usedAt && !this.checkedInAt) this.checkedInAt = this.usedAt;
  if (this.checkedInAt && !this.usedAt) this.usedAt = this.checkedInAt;

  if (this.usedBy && !this.checkedInBy) this.checkedInBy = this.usedBy;
  if (this.checkedInBy && !this.usedBy) this.usedBy = this.checkedInBy;

  next();
});

const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);
module.exports = Ticket;
