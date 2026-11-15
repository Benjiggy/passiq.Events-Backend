const mongoose = require("mongoose");
const slugify = require("slugify");
const crypto = require("crypto");

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
    isSoldOut: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: "",
    },
    image: {
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
      ref: "Category", // must match the model name used in mongoose.model('Category', ...)
      required: [true, "Category is required"],
      index: true,
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
      // "ended" is included because the dashboard offers it as a status option
      type: String,
      enum: ["draft", "published", "ended", "cancelled", "completed"],
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
    // Stored flag for events that are announced but not yet on sale.
    // The API derives isClickable / priceDisplay / displayDate from it.
    comingSoon: {
      type: Boolean,
      default: false,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    statsToken: {
      type: String,
      index: true,
    },
    organizer: {
      name: { type: String, default: "Passiq Organizer" },
      handle: { type: String, default: "organizer" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      avatar: { type: String, default: "" },
      verified: { type: Boolean, default: true },
      // Editable from the dashboard, so they must live in the schema.
      // Without these fields Mongoose silently drops them on save.
      partner: { type: String, default: "" },
      officialPartner: { type: String, default: "" },
      enquiries: { type: String, default: "" },
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
    toJSON: { transform: transformEvent },
    toObject: { transform: transformEvent },
  },
);

// ──────────────────────────────────────
// Response shaping (shared by toJSON and toObject)
// Everything here is derived from the document itself. No event-specific values.
// ──────────────────────────────────────
function transformEvent(doc, ret) {
  ret.id = ret._id;
  delete ret._id;
  delete ret.__v;

  // Populated category -> readable name (id stays available as categoryId)
  if (ret.category && typeof ret.category === "object" && ret.category.name) {
    ret.categoryId = ret.category._id || ret.category.id;
    ret.categoryName = ret.category.name;
    ret.category = ret.category.name;
  }

  // Sales figures calculated from the ticket tiers stored in the database
  if (Array.isArray(ret.ticketTiers)) {
    ret.ticketTiers = ret.ticketTiers.map((t) => {
      const sold = Number(t.sold) || 0;
      const capacity = Number(t.capacity) || 0;
      return {
        ...t,
        sold,
        isSoldOut: t.isSoldOut === true || (capacity > 0 && sold >= capacity),
      };
    });

    if (ret.ticketTiers.length > 0) {
      const tierSold = ret.ticketTiers.reduce((s, t) => s + t.sold, 0);
      const revenue = ret.ticketTiers.reduce(
        (s, t) => s + t.sold * (Number(t.price) || 0),
        0,
      );
      ret.soldCount = tierSold;
      ret.ticketsSold = tierSold;
      ret.revenue = revenue;
      ret.earned = revenue;
      ret.earnedKobo = Math.round(revenue * 100);
      ret.grossKobo = Math.round(revenue * 100);
    }
  }

  if (ret.ticketsSold === undefined) ret.ticketsSold = ret.soldCount || 0;

  // "Coming soon" presentation comes from the stored flag
  if (ret.comingSoon) {
    ret.isClickable = false;
    ret.priceDisplay = "Coming Soon";
    ret.displayDate = "Coming Soon";
    ret.formattedDate = "Coming Soon";
  } else {
    ret.isClickable = true;
  }

  return ret;
}

// ──────────────────────────────────────
// Indexes
// ──────────────────────────────────────
eventSchema.index({ ownerId: 1, createdAt: -1 });
eventSchema.index({ status: 1, date: 1 });

// ──────────────────────────────────────
// Hooks
// ──────────────────────────────────────
eventSchema.pre("validate", async function () {
  if (!this.statsToken) {
    this.statsToken = crypto.randomBytes(24).toString("hex");
  }

  // Keep the stored summary fields in step with the tiers
  if (Array.isArray(this.ticketTiers) && this.ticketTiers.length > 0) {
    const prices = this.ticketTiers.map((t) => Number(t.price) || 0);
    this.minPrice = Math.min(...prices);
    this.maxPrice = Math.max(...prices);
    this.price = this.minPrice;
    this.soldCount = this.ticketTiers.reduce(
      (s, t) => s + (Number(t.sold) || 0),
      0,
    );
  }

  // Only generate / normalise the slug when it is new, empty or was edited.
  // Changing the title alone no longer rewrites an existing public URL.
  const needsSlug = !this.slug || this.isModified("slug");
  if (!needsSlug) return;

  const base =
    slugify(this.slug || this.title, { lower: true, strict: true }) || "event";
  let slug = base;
  let count = 1;

  while (await this.constructor.exists({ slug, _id: { $ne: this._id } })) {
    slug = `${base}-${count++}`;
  }
  this.slug = slug;
});

const Event = mongoose.models.Event || mongoose.model("Event", eventSchema);
module.exports = Event;
