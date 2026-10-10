const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    description: { type: String, default: '' },
    location: { type: String, default: 'Lagos, Nigeria' },
    date: { type: String, default: '' },
    tag: { type: String, default: 'Festival' },
    coverImage: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    attendeeCount: { type: String, default: '1,000+' },
    gallery: [{ type: String }],
    quote: {
      text: String,
      author: String
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

const newsletterSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    subscribedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const Memory = mongoose.models.Memory || mongoose.model('Memory', memorySchema);
const Newsletter = mongoose.models.Newsletter || mongoose.model('Newsletter', newsletterSchema);

module.exports = { Memory, Newsletter };
