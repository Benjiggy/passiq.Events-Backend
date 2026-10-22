const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    provider: {
      type: String,
      enum: ['paystack', 'flutterwave', 'stripe', 'crypto', 'cash', 'free', 'bank_transfer', 'local_transfer'],
      required: true
    },
    providerReference: {
      type: String,
      default: ''
    },
    amount: {
      type: Number,
      required: true
    },
    amountKobo: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'NGN'
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'cancelled'],
      default: 'pending'
    },
    // Crypto Specific Metadata
    cryptoDetails: {
      cryptoCurrency: String, // USDT_TRC20, USDC, BTC, ETH, SOL
      cryptoAmount: Number,
      payAddress: String,
      txHash: String,
      network: String,
      paymentStatus: String
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    customer: {
      name: String,
      email: String,
      phone: String
    },
    paidAt: {
      type: Date,
      default: null
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

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
module.exports = Payment;
