const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
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
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    attendeeName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      default: ''
    },
    unitAmountKobo: {
      type: Number,
      default: 0
    },
    amountKobo: {
      type: Number,
      required: true
    },
    amount: {
      type: Number, // In major units (Naira, USD)
      default: 0
    },
    currency: {
      type: String,
      default: 'NGN'
    },
    paymentProvider: {
      type: String,
      enum: ['paystack', 'flutterwave', 'stripe', 'crypto', 'cash', 'free', 'bank_transfer', 'local_transfer'],
      default: 'paystack'
    },
    status: {
      type: String,
      enum: ['initialized', 'pending', 'success', 'failed', 'cancelled', 'refunded'],
      default: 'initialized'
    },
    proofOfPayment: {
      type: String,
      default: null
    },
    discountCode: {
      type: String,
      default: null
    },
    discountAmount: {
      type: Number,
      default: 0
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

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
module.exports = Order;
