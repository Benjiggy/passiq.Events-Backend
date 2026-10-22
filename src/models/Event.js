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
        if (ret.category && typeof ret.category === "object" && ret.category.name) {
          ret.categoryName = ret.category.name;
          ret.category =
            ret.category.name.toLowerCase() === "music & concerts"
              ? "Music & Concerts"
              : ret.category.name;
        } else if (ret.category && String(ret.category) === "6ad3dbd83ca63b1d2ed0db41") {
          ret.category = "Music & Concerts";
        }
        const rawTitle = ret.title || "";
        const isBurna =
          /burna\s*boy/i.test(rawTitle) ||
          /weakness/i.test(rawTitle) ||
          String(ret.id || ret._id) === "6ad685c5b93e2a37ef3dd857" ||
          ret.slug === "burna-boy-live-no-sign-of-weakness-tour";

        const isMarlian =
          /marlian/i.test(rawTitle) ||
          String(ret.id || ret._id) === "6ad8cdaa04730d435e513b1a";

        const isWetParty =
          /wet\s*party/i.test(rawTitle) ||
          String(ret.id || ret._id) === "event-wet-party-coming-soon";

        if (isBurna) {
          ret.title = "Beach Vibez and Music: Guest Artist Invited.";
          ret.subtitle = "Beach Vibez & Music with special guest artists invited live at Landmark Beach.";
          ret.description = "Experience an unforgettable beach party with high-energy live music, seaside chill vibes, and special guest artist performances at Landmark Beach Arena, Victoria Island.";
          ret.isClickable = false;
          ret.comingSoon = true;
          ret.priceDisplay = "Coming Soon";
          ret.displayDate = "Coming Soon";
          ret.formattedDate = "Coming Soon";
          ret.organizer = ret.organizer || {};
          ret.organizer.name = "Passiq Events";
          ret.organizer.handle = "Admin-Passiq";
          ret.organizer.avatar = "/passiq-logo.png";
          ret.organizer.verified = true;
          ret.organizer.partner = "";
          ret.organizer.officialPartner = "";
          ret.organizer.enquiries = "+234 916 063 7438, +234 708 819 8268";
        } else if (isWetParty) {
          ret.isClickable = false;
          ret.comingSoon = true;
          ret.priceDisplay = "Coming Soon";
          ret.displayDate = "Coming Soon";
          ret.formattedDate = "Coming Soon";
          ret.organizer = ret.organizer || {};
          ret.organizer.name = "Passiq Events";
          ret.organizer.handle = "Admin-Passiq";
          ret.organizer.avatar = "/passiq-logo.png";
          ret.organizer.verified = true;
          ret.organizer.enquiries = "+234 916 063 7438, +234 708 819 8268";
        } else if (
          ret.organizer &&
          (isMarlian ||
            ret.organizer.name === "agborex" ||
            !ret.organizer.name ||
            ret.organizer.name.includes("Sample"))
        ) {
          ret.organizer.name = "House Of Naya";
          if (
            !ret.organizer.handle ||
            ret.organizer.handle === "organizer" ||
            ret.organizer.handle.includes("sample")
          ) {
            ret.organizer.handle = "Admin-House Of Naya";
          }
          if (!ret.organizer.partner) {
            ret.organizer.partner = "KRD (Kelvin Records)";
            ret.organizer.officialPartner = "KRD (Kelvin Records)";
          }
          if (!ret.organizer.enquiries) {
            ret.organizer.enquiries = "+234 916 063 7438, +234 708 819 8268";
          }
        }
        return ret;
      },
    },
    toObject: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        if (ret.category && typeof ret.category === "object" && ret.category.name) {
          ret.categoryName = ret.category.name;
          ret.category =
            ret.category.name.toLowerCase() === "music & concerts"
              ? "Music & Concerts"
              : ret.category.name;
        } else if (ret.category && String(ret.category) === "6ad3dbd83ca63b1d2ed0db41") {
          ret.category = "Music & Concerts";
        }
        const rawTitle = ret.title || "";
        const isBurna =
          /burna\s*boy/i.test(rawTitle) ||
          /weakness/i.test(rawTitle) ||
          String(ret.id || ret._id) === "6ad685c5b93e2a37ef3dd857" ||
          ret.slug === "burna-boy-live-no-sign-of-weakness-tour";

        const isMarlian =
          /marlian/i.test(rawTitle) ||
          String(ret.id || ret._id) === "6ad8cdaa04730d435e513b1a";

        const isWetParty =
          /wet\s*party/i.test(rawTitle) ||
          String(ret.id || ret._id) === "event-wet-party-coming-soon";

        if (isBurna) {
          ret.title = "Beach Vibez and Music: Guest Artist Invited.";
          ret.subtitle = "Beach Vibez & Music with special guest artists invited live at Landmark Beach.";
          ret.description = "Experience an unforgettable beach party with high-energy live music, seaside chill vibes, and special guest artist performances at Landmark Beach Arena, Victoria Island.";
          ret.isClickable = false;
          ret.comingSoon = true;
          ret.priceDisplay = "Coming Soon";
          ret.displayDate = "Coming Soon";
          ret.formattedDate = "Coming Soon";
          ret.organizer = ret.organizer || {};
          ret.organizer.name = "Passiq Events";
          ret.organizer.handle = "Admin-Passiq";
          ret.organizer.avatar = "/passiq-logo.png";
          ret.organizer.verified = true;
          ret.organizer.partner = "";
          ret.organizer.officialPartner = "";
          ret.organizer.enquiries = "+234 916 063 7438, +234 708 819 8268";
        } else if (isWetParty) {
          ret.isClickable = false;
          ret.comingSoon = true;
          ret.priceDisplay = "Coming Soon";
          ret.displayDate = "Coming Soon";
          ret.formattedDate = "Coming Soon";
          ret.organizer = ret.organizer || {};
          ret.organizer.name = "Passiq Events";
          ret.organizer.handle = "Admin-Passiq";
          ret.organizer.avatar = "/passiq-logo.png";
          ret.organizer.verified = true;
          ret.organizer.enquiries = "+234 916 063 7438, +234 708 819 8268";
        } else if (
          ret.organizer &&
          (isMarlian ||
            ret.organizer.name === "agborex" ||
            !ret.organizer.name ||
            ret.organizer.name.includes("Sample"))
        ) {
          ret.organizer.name = "House Of Naya";
          if (
            !ret.organizer.handle ||
            ret.organizer.handle === "organizer" ||
            ret.organizer.handle.includes("sample")
          ) {
            ret.organizer.handle = "Admin-House Of Naya";
          }
          if (!ret.organizer.partner) {
            ret.organizer.partner = "KRD (Kelvin Records)";
            ret.organizer.officialPartner = "KRD (Kelvin Records)";
          }
          if (!ret.organizer.enquiries) {
            ret.organizer.enquiries = "+234 916 063 7438, +234 708 819 8268";
          }
        }
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
