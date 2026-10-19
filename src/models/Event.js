const mongoose = require("mongoose");
const slugify = require("slugify");

const ticketTierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    unitAmountKobo: {
      type: Number,
      default: 0,
    },
    capacity: {
      type: Number,
      required: true,
      default: 100,
    },
    sold: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      default: "",
    },
  },
  { _id: true },
);

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    subtitle: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category", // must match the model name you used in mongoose.model('Category', ...)
      required: [true, "Category is required"],
      index: true, // you'll likely filter events by category often
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    time: {
      type: String, // HH:MM
      default: "18:00",
    },
    location: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "Lagos",
    },
    country: {
      type: String,
      default: "Nigeria",
    },
    currency: {
      type: String,
      default: "NGN",
    },
    price: {
      type: Number,
      default: 0,
    },
    minPrice: {
      type: Number,
      default: 0,
    },
    maxPrice: {
      type: Number,
      default: 0,
    },
    capacity: {
      type: Number,
      default: 100,
    },
    soldCount: {
      type: Number,
      default: 0,
    },
    image: {
      type: String,
      default: "",
    },
    poster: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "published", "cancelled", "completed"],
      default: "published",
    },
    completionStatus: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },
    featured: {
      type: Boolean,
      default: false,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organizer: {
      name: { type: String, default: "Passiq Organizer" },
      handle: { type: String, default: "organizer" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      avatar: { type: String, default: "" },
      verified: { type: Boolean, default: true },
    },
    directions: {
      venueName: String,
      shortCode: String,
      address: String,
      rating: { type: Number, default: 0 },
      reviewCount: { type: Number, default: 0 },
      googleMapsUrl: String,
    },
    ticketTiers: [ticketTierSchema],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

eventSchema.pre("validate", async function () {
  if (!this.isModified("title") && this.slug) return;

  const base = slugify(this.title, { lower: true, strict: true });
  let slug = base;
  let count = 1;

  while (await this.constructor.exists({ slug, _id: { $ne: this._id } })) {
    slug = `${base}-${count++}`;
  }
  this.slug = slug;
});

const Event = mongoose.models.Event || mongoose.model("Event", eventSchema);
module.exports = Event;
