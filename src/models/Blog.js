const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    title: {
      type: String,
      required: true
    },
    category: {
      type: String,
      default: 'Nightlife'
    },
    readTime: {
      type: String,
      default: '4 min read'
    },
    publishedAt: {
      type: String,
      default: () => new Date().toISOString().slice(0, 10)
    },
    author: {
      name: { type: String, default: 'Passiq Editorial' },
      avatar: { type: String, default: '' },
      role: { type: String, default: 'Staff Writer' }
    },
    heroImage: {
      type: String,
      default: ''
    },
    excerpt: {
      type: String,
      default: ''
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      default: []
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

const Blog = mongoose.models.Blog || mongoose.model('Blog', blogSchema);
module.exports = Blog;
