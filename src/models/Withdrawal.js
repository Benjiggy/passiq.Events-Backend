const mongoose = require('mongoose');

const withdrawalHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true
    },
    actorId: {
      type: String,
      required: true
    },
    note: {
      type: String,
      default: ''
    },
    at: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const withdrawalSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    hostSnapshot: {
      id: String,
      name: String,
      email: String,
      phone: String
    },
    amountKobo: {
      type: Number,
      required: true
    },
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'NGN'
    },
    payoutSnapshot: {
      bankName: String,
      accountNumber: String,
      accountName: String,
      cryptoWallet: String,
      network: String
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'approved', 'paid', 'simulated_paid', 'rejected'],
      default: 'pending'
    },
    history: [withdrawalHistorySchema]
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

const Withdrawal = mongoose.models.Withdrawal || mongoose.model('Withdrawal', withdrawalSchema);
module.exports = Withdrawal;
