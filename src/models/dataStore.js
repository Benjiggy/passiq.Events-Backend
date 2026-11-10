/**
 * Hybrid Data Repository
 * Provides unified interface across MongoDB models and robust in-memory data store.
 */
const mongoose = require("mongoose");
const crypto = require("crypto");
const { isDbConnected } = require("../config/db");
const User = require("./User");
const Event = require("./Event");
const Ticket = require("./Ticket");
const Order = require("./Order");
const Payment = require("./Payment");
const Withdrawal = require("./Withdrawal");
const Discount = require("./Discount");
const Blog = require("./Blog");
const Category = require("./Category");
const { Memory, Newsletter } = require("./Memory");
const Scan = require("./Scan");

// In-Memory Storage Cache
const memoryStore = {
  users: [],
  events: [],
  tickets: [],
  orders: [],
  payments: [],
  withdrawals: [],
  discounts: [],
  blogs: [],
  categories: [],
  memories: [],
  newsletters: [],
  scans: [],
};

const dataStore = {
  memory: memoryStore,

  // User Operations
  async findUserByEmail(email) {
    if (isDbConnected()) {
      return await User.findOne({ email: email.toLowerCase() }).select(
        "+password",
      );
    }
    return (
      memoryStore.users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase(),
      ) || null
    );
  },

  async findUserById(id) {
    if (isDbConnected()) {
      return await User.findById(id);
    }
    return (
      memoryStore.users.find(
        (u) => (u.id || u._id)?.toString() === id?.toString(),
      ) || null
    );
  },

  async createUser(userData) {
    if (isDbConnected()) {
      const user = new User(userData);
      return await user.save();
    }
    const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const user = {
      id,
      _id: id,
      ...userData,
      role: userData.role || userData.accountType || "attendee",
      accountType: userData.accountType || userData.role || "attendee",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryStore.users.push(user);
    return user;
  },

  async verifyUserEmail(decodedToken, email) {
    const user = await User.findOne({ email });

    if (decodedToken.email !== email) {
      return res.status(400).json({ message: "Invalid verification link" });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    user.isEmailVerified = true;
    await user.save();

    return user;
  },

  async updateUser(id, updateData) {
    if (isDbConnected()) {
      return await User.findByIdAndUpdate(id, updateData, { new: true });
    }
    const index = memoryStore.users.findIndex(
      (u) => (u.id || u._id)?.toString() === id?.toString(),
    );
    if (index !== -1) {
      memoryStore.users[index] = {
        ...memoryStore.users[index],
        ...updateData,
        updatedAt: new Date().toISOString(),
      };
      return memoryStore.users[index];
    }
    return null;
  },

  async listUsers() {
    if (isDbConnected()) {
      return await User.find();
    }
    return memoryStore.users;
  },

  // Category Operations
  async listCategories() {
    if (isDbConnected()) {
      return await Category.find();
    }
    return memoryStore.categories;
  },

  async createCategory(categoryData) {
    if (isDbConnected()) {
      const category = new Category(categoryData);
      return await category.save();
    }
    const id = `category_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const category = {
      id,
      _id: id,
      ...categoryData,
    };
    memoryStore.categories.push(category);
    return category;
  },

  // Event Operations
  async listEvents(filter = {}) {
    if (isDbConnected()) {
      const query = {};
      if (filter.status) query.status = filter.status;
      if (filter.category && filter.category !== "All")
        query.category = filter.category;
      if (filter.ownerId) query.ownerId = filter.ownerId;
      if (filter.featured !== undefined) query.featured = filter.featured;
      return await Event.find(query)
        .populate("category")
        .sort({ date: 1, createdAt: -1 });
    }
    let results = [...memoryStore.events];
    if (filter.status)
      results = results.filter((e) => e.status === filter.status);
    if (filter.category && filter.category !== "All")
      results = results.filter((e) => e.category === filter.category);
    if (filter.ownerId)
      results = results.filter(
        (e) =>
          (e.ownerId?.id || e.ownerId)?.toString() ===
          filter.ownerId?.toString(),
      );
    if (filter.featured !== undefined)
      results = results.filter(
        (e) => Boolean(e.featured) === Boolean(filter.featured),
      );
    if (filter.search) {
      const term = filter.search.toLowerCase();
      results = results.filter(
        (e) =>
          e.title?.toLowerCase().includes(term) ||
          e.location?.toLowerCase().includes(term),
      );
    }
    return results;
  },

  async getEventByIdOrSlug(idOrSlug) {
    const target = String(idOrSlug || "")
      .trim()
      .toLowerCase();

    if (!target) return null;

    const isBeachTarget =
      target === "beach-vibez-and-music" || target.includes("beach-vibez");

    const beachFallbackSlug = "burna-boy-live-no-sign-of-weakness-tour";

    const beachFallbackId = "6ad685c5b93e2a37ef3dd857";

    if (isDbConnected()) {
      const orConditions = [{ slug: target }];

      // Check if the target is a valid MongoDB ObjectId
      if (mongoose.Types.ObjectId.isValid(target)) {
        orConditions.push({ _id: target });
      }

      // Handle the Beach Vibez legacy reference
      if (isBeachTarget) {
        orConditions.push(
          { slug: beachFallbackSlug },
          { _id: beachFallbackId },
        );
      }

      const foundEvent = await Event.findOne({
        $or: orConditions,
      }).populate("category");

      if (foundEvent) {
        if (!foundEvent.statsToken) {
          const raw = await mongoose.connection
            .collection("events")
            .findOne({ _id: foundEvent._id }, { projection: { statsToken: 1 } })
            .catch(() => null);

          if (raw && raw.statsToken) {
            foundEvent.statsToken = raw.statsToken;
          } else {
            const token = crypto.randomBytes(24).toString("hex");
            await mongoose.connection
              .collection("events")
              .updateOne(
                { _id: foundEvent._id },
                { $set: { statsToken: token } },
              )
              .catch(() => {});
            foundEvent.statsToken = token;
          }
        }
      }

      return foundEvent;
    }

    const foundMem = memoryStore.events.find((e) => {
      const eventId = (e.id || e._id)?.toString().toLowerCase();
      const eventSlug = e.slug?.toLowerCase();

      return (
        eventId === target ||
        eventSlug === target ||
        (isBeachTarget &&
          (eventSlug === beachFallbackSlug || eventId === beachFallbackId))
      );
    }) || null;

    if (foundMem && !foundMem.statsToken) {
      foundMem.statsToken = crypto.randomBytes(24).toString("hex");
    }

    return foundMem;
  },

  async createEvent(eventData) {
    if (isDbConnected()) {
      const event = new Event(eventData);
      return await event.save();
    }
    const id = `event_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const event = {
      id,
      _id: id,
      slug: eventData.slug || id,
      statsToken: eventData.statsToken || crypto.randomBytes(24).toString("hex"),
      ...eventData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryStore.events.unshift(event);
    return event;
  },

  async updateEvent(id, updateData) {
    if (isDbConnected()) {
      return await Event.findByIdAndUpdate(id, updateData, { new: true });
    }
    const index = memoryStore.events.findIndex(
      (e) => (e.id || e._id)?.toString() === id?.toString(),
    );
    if (index !== -1) {
      memoryStore.events[index] = {
        ...memoryStore.events[index],
        ...updateData,
        updatedAt: new Date().toISOString(),
      };
      return memoryStore.events[index];
    }
    return null;
  },

  async deleteEvent(id) {
    if (isDbConnected()) {
      return await Event.findByIdAndDelete(id);
    }
    const index = memoryStore.events.findIndex(
      (e) => (e.id || e._id)?.toString() === id?.toString(),
    );
    if (index !== -1) {
      return memoryStore.events.splice(index, 1)[0];
    }
    return null;
  },

  // Ticket Operations
  async createTicket(ticketData) {
    if (isDbConnected()) {
      const ticket = new Ticket(ticketData);
      return await ticket.save();
    }
    const id = `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const ticket = {
      id,
      _id: id,
      ...ticketData,
      createdAt: new Date().toISOString(),
    };
    memoryStore.tickets.push(ticket);
    return ticket;
  },

  async listTicketsByUser(userId, email) {
    if (isDbConnected()) {
      const conditions = [];
      if (userId) conditions.push({ buyerId: userId });
      if (email) conditions.push({ userEmail: email.toLowerCase() });
      return await Ticket.find(
        conditions.length ? { $or: conditions } : {},
      ).sort({ createdAt: -1 });
    }
    return memoryStore.tickets
      .filter(
        (t) =>
          (userId &&
            (t.buyerId?.id || t.buyerId)?.toString() === userId?.toString()) ||
          (email && t.userEmail?.toLowerCase() === email?.toLowerCase()),
      )
      .reverse();
  },

  async getTicketByCodeOrId(codeOrId) {
    if (!codeOrId) return null;
    const strCode = String(codeOrId || "").trim();
    const target = strCode.toUpperCase();
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(strCode);

    if (isDbConnected()) {
      const orConditions = [{ ticketCode: target }];
      if (isObjectId) {
        orConditions.push({ _id: strCode });
      }
      return await Ticket.findOne({ $or: orConditions });
    }
    return (
      memoryStore.tickets.find(
        (t) =>
          t.ticketCode?.toUpperCase() === target ||
          (t.id || t._id)?.toString() === strCode,
      ) || null
    );
  },

  async listTicketsByReference(reference) {
    if (isDbConnected()) {
      return await Ticket.find({ reference });
    }
    return memoryStore.tickets.filter((t) => t.reference === reference);
  },

  async updateTicket(id, updateData) {
    if (isDbConnected()) {
      return await Ticket.findByIdAndUpdate(id, updateData, { new: true });
    }
    const index = memoryStore.tickets.findIndex(
      (t) => (t.id || t._id)?.toString() === id?.toString(),
    );
    if (index !== -1) {
      memoryStore.tickets[index] = {
        ...memoryStore.tickets[index],
        ...updateData,
      };
      return memoryStore.tickets[index];
    }
    return null;
  },

  // Order Operations
  async createOrder(orderData) {
    if (isDbConnected()) {
      const order = new Order(orderData);
      return await order.save();
    }
    const id = `order_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const order = {
      id,
      _id: id,
      ...orderData,
      createdAt: new Date().toISOString(),
    };
    memoryStore.orders.push(order);
    return order;
  },

  async getOrderByReference(reference) {
    if (isDbConnected()) {
      return await Order.findOne({ reference });
    }
    return memoryStore.orders.find((o) => o.reference === reference) || null;
  },

  async updateOrder(reference, updateData) {
    if (isDbConnected()) {
      return await Order.findOneAndUpdate({ reference }, updateData, {
        new: true,
      });
    }
    const index = memoryStore.orders.findIndex(
      (o) => o.reference === reference,
    );
    if (index !== -1) {
      memoryStore.orders[index] = {
        ...memoryStore.orders[index],
        ...updateData,
      };
      return memoryStore.orders[index];
    }
    return null;
  },

  async listOrdersByOwner(ownerId) {
    if (isDbConnected()) {
      return await Order.find({ ownerId, status: "success" }).sort({
        createdAt: -1,
      });
    }
    return memoryStore.orders.filter(
      (o) =>
        (o.ownerId?.id || o.ownerId)?.toString() === ownerId?.toString() &&
        o.status === "success",
    );
  },

  // Payment Operations
  async createPayment(paymentData) {
    if (isDbConnected()) {
      const payment = new Payment(paymentData);
      return await payment.save();
    }
    const id = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const payment = {
      id,
      _id: id,
      ...paymentData,
      createdAt: new Date().toISOString(),
    };
    memoryStore.payments.push(payment);
    return payment;
  },

  async getPaymentByReference(reference) {
    if (isDbConnected()) {
      return await Payment.findOne({ reference });
    }
    return memoryStore.payments.find((p) => p.reference === reference) || null;
  },

  async updatePayment(reference, updateData) {
    if (isDbConnected()) {
      return await Payment.findOneAndUpdate({ reference }, updateData, {
        new: true,
      });
    }
    const index = memoryStore.payments.findIndex(
      (p) => p.reference === reference,
    );
    if (index !== -1) {
      memoryStore.payments[index] = {
        ...memoryStore.payments[index],
        ...updateData,
      };
      return memoryStore.payments[index];
    }
    return null;
  },

  // Withdrawal Operations
  async createWithdrawal(data) {
    if (isDbConnected()) {
      const withdrawal = new Withdrawal(data);
      return await withdrawal.save();
    }
    const id = `with_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const withdrawal = {
      id,
      _id: id,
      ...data,
      createdAt: new Date().toISOString(),
    };
    memoryStore.withdrawals.unshift(withdrawal);
    return withdrawal;
  },

  async listWithdrawals(filter = {}) {
    if (isDbConnected()) {
      const query = {};
      if (filter.ownerId) query.ownerId = filter.ownerId;
      if (filter.status && filter.status !== "all")
        query.status = filter.status;
      return await Withdrawal.find(query).sort({ createdAt: -1 });
    }
    let list = [...memoryStore.withdrawals];
    if (filter.ownerId)
      list = list.filter(
        (w) =>
          (w.ownerId?.id || w.ownerId)?.toString() ===
          filter.ownerId?.toString(),
      );
    if (filter.status && filter.status !== "all")
      list = list.filter((w) => w.status === filter.status);
    return list;
  },

  async getWithdrawalById(id) {
    if (isDbConnected()) {
      return await Withdrawal.findById(id);
    }
    return (
      memoryStore.withdrawals.find(
        (w) => (w.id || w._id)?.toString() === id?.toString(),
      ) || null
    );
  },

  async updateWithdrawal(id, updateData) {
    if (isDbConnected()) {
      return await Withdrawal.findByIdAndUpdate(id, updateData, { new: true });
    }
    const index = memoryStore.withdrawals.findIndex(
      (w) => (w.id || w._id)?.toString() === id?.toString(),
    );
    if (index !== -1) {
      memoryStore.withdrawals[index] = {
        ...memoryStore.withdrawals[index],
        ...updateData,
      };
      return memoryStore.withdrawals[index];
    }
    return null;
  },

  // Discounts
  async listDiscounts(ownerId) {
    if (isDbConnected()) {
      return await Discount.find(ownerId ? { ownerId } : {});
    }
    return ownerId
      ? memoryStore.discounts.filter(
          (d) =>
            (d.ownerId?.id || d.ownerId)?.toString() === ownerId?.toString(),
        )
      : memoryStore.discounts;
  },

  async findDiscountByCode(code) {
    if (isDbConnected()) {
      return await Discount.findOne({
        code: code.toUpperCase(),
        isActive: true,
      });
    }
    return (
      memoryStore.discounts.find(
        (d) => d.code?.toUpperCase() === code.toUpperCase() && d.isActive,
      ) || null
    );
  },

  async createDiscount(discountData) {
    if (isDbConnected()) {
      const discount = new Discount(discountData);
      return await discount.save();
    }
    const id = `disc_${Date.now()}`;
    const discount = {
      id,
      _id: id,
      ...discountData,
      createdAt: new Date().toISOString(),
    };
    memoryStore.discounts.push(discount);
    return discount;
  },

  // Blogs & Content
  async listBlogs(category) {
    if (isDbConnected()) {
      const query = category && category !== "All" ? { category } : {};
      return await Blog.find(query).sort({ createdAt: -1 });
    }
    if (category && category !== "All") {
      return memoryStore.blogs.filter((b) => b.category === category);
    }
    return memoryStore.blogs;
  },

  async getBlogBySlug(slug) {
    if (isDbConnected()) {
      return await Blog.findOne({ slug: slug.toLowerCase() });
    }
    return (
      memoryStore.blogs.find(
        (b) =>
          b.slug?.toLowerCase() === slug.toLowerCase() ||
          (b.id || b._id)?.toString() === slug,
      ) || null
    );
  },

  async createBlog(blogData) {
    if (isDbConnected()) {
      const blog = new Blog(blogData);
      return await blog.save();
    }
    const id = `blog_${Date.now()}`;
    const blog = {
      id,
      _id: id,
      ...blogData,
      createdAt: new Date().toISOString(),
    };
    memoryStore.blogs.push(blog);
    return blog;
  },

  // Memories
  async listMemories() {
    if (isDbConnected()) {
      return await Memory.find().sort({ createdAt: -1 });
    }
    return memoryStore.memories;
  },

  async createMemory(memoryData) {
    if (isDbConnected()) {
      const memory = new Memory(memoryData);
      return await memory.save();
    }
    const id = `mem_${Date.now()}`;
    const memory = { id, _id: id, ...memoryData };
    memoryStore.memories.push(memory);
    return memory;
  },

  // Newsletter
  async subscribeNewsletter(email) {
    if (isDbConnected()) {
      return await Newsletter.findOneAndUpdate(
        { email: email.toLowerCase() },
        {
          email: email.toLowerCase(),
          subscribedAt: new Date(),
          isActive: true,
        },
        { upsert: true, new: true },
      );
    }
    const existing = memoryStore.newsletters.find(
      (n) => n.email.toLowerCase() === email.toLowerCase(),
    );
    if (existing) return existing;
    const sub = {
      email: email.toLowerCase(),
      subscribedAt: new Date().toISOString(),
      isActive: true,
    };
    memoryStore.newsletters.push(sub);
    return sub;
  },

  // Check-in & Scanner Operations
  async atomicScanTicket({ code, eventId, operator = 'Scanner', scannerLabel = 'Main Gate', ip = '' }) {
    const cleanCode = String(code || '').trim().toUpperCase();
    const cleanEventId = eventId && eventId !== 'all' ? eventId.toString() : null;

    if (isDbConnected()) {
      // 1. ATOMIC findOneAndUpdate guarantees only one scan succeeds
      const query = {
        $or: [{ code: cleanCode }, { ticketCode: cleanCode }],
        status: 'valid'
      };
      if (cleanEventId) {
        query.eventId = cleanEventId;
      }

      const updatedDoc = await Ticket.findOneAndUpdate(
        query,
        {
          $set: {
            status: 'used',
            usedAt: new Date(),
            checkedInAt: new Date(),
            usedBy: operator,
            checkedInBy: operator
          }
        },
        { new: true }
      ).populate('eventId');

      if (updatedDoc) {
        const eventName = updatedDoc.eventId?.title || updatedDoc.eventTitle || 'Event';
        const scan = await Scan.create({
          ticketId: updatedDoc._id,
          code: cleanCode,
          eventId: updatedDoc.eventId?._id || updatedDoc.eventId,
          result: 'success',
          scannedAt: new Date(),
          operator,
          scannerLabel,
          ip,
          holderName: updatedDoc.holderName || updatedDoc.userName,
          holderEmail: updatedDoc.holderEmail || updatedDoc.userEmail,
          ticketType: updatedDoc.ticketType || updatedDoc.tierName,
          eventTitle: eventName,
          firstScanAt: updatedDoc.usedAt || updatedDoc.checkedInAt
        });

        return {
          result: 'success',
          status: 'valid',
          message: 'Valid ticket pass.',
          attendeeName: updatedDoc.holderName || updatedDoc.userName,
          attendeeEmail: updatedDoc.holderEmail || updatedDoc.userEmail,
          ticketType: updatedDoc.ticketType || updatedDoc.tierName,
          eventTitle: eventName,
          scannedAt: scan.scannedAt,
          ticketId: updatedDoc._id,
          scan
        };
      }

      // If atomic update returned null, inspect the ticket to determine exact state
      const existingTicket = await Ticket.findOne({
        $or: [{ code: cleanCode }, { ticketCode: cleanCode }]
      }).populate('eventId');

      if (!existingTicket) {
        const scan = await Scan.create({
          code: cleanCode,
          eventId: cleanEventId || null,
          result: 'invalid',
          scannedAt: new Date(),
          operator,
          scannerLabel,
          ip
        });
        return {
          result: 'invalid',
          status: 'invalid',
          message: 'Unknown or invalid ticket code.',
          scan
        };
      }

      const tktEventId = (existingTicket.eventId?._id || existingTicket.eventId)?.toString();
      if (cleanEventId && tktEventId !== cleanEventId) {
        const scan = await Scan.create({
          ticketId: existingTicket._id,
          code: cleanCode,
          eventId: cleanEventId,
          result: 'invalid',
          scannedAt: new Date(),
          operator,
          scannerLabel,
          ip,
          holderName: existingTicket.holderName || existingTicket.userName,
          holderEmail: existingTicket.holderEmail || existingTicket.userEmail,
          ticketType: existingTicket.ticketType || existingTicket.tierName,
          eventTitle: existingTicket.eventId?.title || existingTicket.eventTitle
        });
        return {
          result: 'invalid',
          status: 'invalid',
          message: `Ticket is registered for a different event (${existingTicket.eventId?.title || 'Another Event'}).`,
          scan
        };
      }

      if (existingTicket.status === 'used') {
        const scan = await Scan.create({
          ticketId: existingTicket._id,
          code: cleanCode,
          eventId: existingTicket.eventId?._id || existingTicket.eventId,
          result: 'duplicate',
          scannedAt: new Date(),
          operator,
          scannerLabel,
          ip,
          holderName: existingTicket.holderName || existingTicket.userName,
          holderEmail: existingTicket.holderEmail || existingTicket.userEmail,
          ticketType: existingTicket.ticketType || existingTicket.tierName,
          eventTitle: existingTicket.eventId?.title || existingTicket.eventTitle,
          firstScanAt: existingTicket.usedAt || existingTicket.checkedInAt
        });
        return {
          result: 'duplicate',
          status: 'used',
          message: 'Ticket already used.',
          attendeeName: existingTicket.holderName || existingTicket.userName,
          attendeeEmail: existingTicket.holderEmail || existingTicket.userEmail,
          ticketType: existingTicket.ticketType || existingTicket.tierName,
          eventTitle: existingTicket.eventId?.title || existingTicket.eventTitle,
          usedAt: existingTicket.usedAt || existingTicket.checkedInAt,
          scan
        };
      }

      if (existingTicket.status === 'void' || existingTicket.status === 'revoked') {
        const scan = await Scan.create({
          ticketId: existingTicket._id,
          code: cleanCode,
          eventId: existingTicket.eventId?._id || existingTicket.eventId,
          result: 'void',
          scannedAt: new Date(),
          operator,
          scannerLabel,
          ip,
          holderName: existingTicket.holderName || existingTicket.userName,
          holderEmail: existingTicket.holderEmail || existingTicket.userEmail,
          ticketType: existingTicket.ticketType || existingTicket.tierName,
          eventTitle: existingTicket.eventId?.title || existingTicket.eventTitle
        });
        return {
          result: 'void',
          status: 'void',
          message: 'Ticket has been voided or revoked.',
          attendeeName: existingTicket.holderName || existingTicket.userName,
          attendeeEmail: existingTicket.holderEmail || existingTicket.userEmail,
          ticketType: existingTicket.ticketType || existingTicket.tierName,
          scan
        };
      }

      return {
        result: 'invalid',
        status: 'invalid',
        message: 'Ticket status is invalid for entry.'
      };
    }

    // In-memory fallback
    const matchIndex = memoryStore.tickets.findIndex(t => {
      const codeMatch = (t.code?.toUpperCase() === cleanCode || t.ticketCode?.toUpperCase() === cleanCode);
      const eventMatch = !cleanEventId || (t.eventId?._id || t.eventId)?.toString() === cleanEventId;
      return codeMatch && eventMatch && t.status === 'valid';
    });

    if (matchIndex !== -1) {
      const t = memoryStore.tickets[matchIndex];
      t.status = 'used';
      t.usedAt = new Date();
      t.checkedInAt = t.usedAt;
      t.usedBy = operator;
      t.checkedInBy = operator;

      const scan = {
        id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ticketId: t.id || t._id,
        code: cleanCode,
        eventId: t.eventId?._id || t.eventId,
        result: 'success',
        scannedAt: new Date().toISOString(),
        operator,
        scannerLabel,
        ip,
        holderName: t.holderName || t.userName,
        holderEmail: t.holderEmail || t.userEmail,
        ticketType: t.ticketType || t.tierName,
        eventTitle: t.eventTitle,
        firstScanAt: t.usedAt
      };
      memoryStore.scans.push(scan);

      return {
        result: 'success',
        status: 'valid',
        message: 'Valid ticket pass.',
        attendeeName: t.holderName || t.userName,
        attendeeEmail: t.holderEmail || t.userEmail,
        ticketType: t.ticketType || t.tierName,
        eventTitle: t.eventTitle,
        scannedAt: scan.scannedAt,
        ticketId: t.id || t._id,
        scan
      };
    }

    const existingTkt = memoryStore.tickets.find(t => 
      t.code?.toUpperCase() === cleanCode || t.ticketCode?.toUpperCase() === cleanCode
    );

    if (!existingTkt) {
      const scan = {
        id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        code: cleanCode,
        eventId: cleanEventId,
        result: 'invalid',
        scannedAt: new Date().toISOString(),
        operator,
        scannerLabel,
        ip
      };
      memoryStore.scans.push(scan);
      return { result: 'invalid', status: 'invalid', message: 'Unknown or invalid ticket code.', scan };
    }

    const tktEvId = (existingTkt.eventId?._id || existingTkt.eventId)?.toString();
    if (cleanEventId && tktEvId !== cleanEventId) {
      const scan = {
        id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ticketId: existingTkt.id || existingTkt._id,
        code: cleanCode,
        eventId: cleanEventId,
        result: 'invalid',
        scannedAt: new Date().toISOString(),
        operator,
        scannerLabel,
        ip,
        holderName: existingTkt.holderName || existingTkt.userName,
        holderEmail: existingTkt.holderEmail || existingTkt.userEmail,
        ticketType: existingTkt.ticketType || existingTkt.tierName,
        eventTitle: existingTkt.eventTitle
      };
      memoryStore.scans.push(scan);
      return {
        result: 'invalid',
        status: 'invalid',
        message: 'Ticket is registered for a different event.',
        scan
      };
    }

    if (existingTkt.status === 'used') {
      const scan = {
        id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ticketId: existingTkt.id || existingTkt._id,
        code: cleanCode,
        eventId: existingTkt.eventId?._id || existingTkt.eventId,
        result: 'duplicate',
        scannedAt: new Date().toISOString(),
        operator,
        scannerLabel,
        ip,
        holderName: existingTkt.holderName || existingTkt.userName,
        holderEmail: existingTkt.holderEmail || existingTkt.userEmail,
        ticketType: existingTkt.ticketType || existingTkt.tierName,
        eventTitle: existingTkt.eventTitle,
        firstScanAt: existingTkt.usedAt || existingTkt.checkedInAt
      };
      memoryStore.scans.push(scan);
      return {
        result: 'duplicate',
        status: 'used',
        message: 'Ticket already used.',
        attendeeName: existingTkt.holderName || existingTkt.userName,
        attendeeEmail: existingTkt.holderEmail || existingTkt.userEmail,
        ticketType: existingTkt.ticketType || existingTkt.tierName,
        eventTitle: existingTkt.eventTitle,
        usedAt: existingTkt.usedAt || existingTkt.checkedInAt,
        scan
      };
    }

    const scan = {
      id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ticketId: existingTkt.id || existingTkt._id,
      code: cleanCode,
      eventId: existingTkt.eventId?._id || existingTkt.eventId,
      result: existingTkt.status === 'void' ? 'void' : 'invalid',
      scannedAt: new Date().toISOString(),
      operator,
      scannerLabel,
      ip,
      holderName: existingTkt.holderName || existingTkt.userName,
      holderEmail: existingTkt.holderEmail || existingTkt.userEmail,
      ticketType: existingTkt.ticketType || existingTkt.tierName,
      eventTitle: existingTkt.eventTitle
    };
    memoryStore.scans.push(scan);
    return {
      result: existingTkt.status === 'void' ? 'void' : 'invalid',
      status: existingTkt.status,
      message: existingTkt.status === 'void' ? 'Ticket has been voided.' : 'Invalid ticket status.',
      attendeeName: existingTkt.holderName || existingTkt.userName,
      attendeeEmail: existingTkt.holderEmail || existingTkt.userEmail,
      ticketType: existingTkt.ticketType || existingTkt.tierName,
      scan
    };
  },

  async listRecentScans(eventId, limit = 10) {
    const cleanEventId = eventId && eventId !== 'all' ? eventId.toString() : null;
    const lim = parseInt(limit, 10) || 10;
    if (isDbConnected()) {
      const filter = cleanEventId ? { eventId: cleanEventId } : {};
      return await Scan.find(filter).sort({ scannedAt: -1 }).limit(lim);
    }
    let scans = [...memoryStore.scans];
    if (cleanEventId) {
      scans = scans.filter(s => (s.eventId?._id || s.eventId)?.toString() === cleanEventId);
    }
    scans.sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt));
    return scans.slice(0, lim);
  },

  async getCheckinStats(eventId) {
    const cleanEventId = eventId && eventId !== 'all' ? eventId.toString() : null;
    if (isDbConnected()) {
      const filter = cleanEventId ? { eventId: cleanEventId } : {};
      const total = await Ticket.countDocuments({ ...filter, status: { $in: ['valid', 'used'] } });
      const scanned = await Ticket.countDocuments({ ...filter, status: 'used' });
      const remaining = Math.max(0, total - scanned);
      return { scanned, total, remaining };
    }
    const tickets = cleanEventId
      ? memoryStore.tickets.filter(t => (t.eventId?._id || t.eventId)?.toString() === cleanEventId)
      : memoryStore.tickets;
    const total = tickets.filter(t => ['valid', 'used'].includes(t.status)).length;
    const scanned = tickets.filter(t => t.status === 'used').length;
    const remaining = Math.max(0, total - scanned);
    return { scanned, total, remaining };
  },

  async listAllScans({ eventId, result, search, page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (p - 1) * l;
    const cleanEventId = eventId && eventId !== 'all' ? eventId.toString() : null;

    if (isDbConnected()) {
      const query = {};
      if (cleanEventId) query.eventId = cleanEventId;
      if (result && result !== 'all') query.result = result;
      if (search) {
        const regex = new RegExp(search.trim(), 'i');
        query.$or = [
          { code: regex },
          { holderName: regex },
          { holderEmail: regex },
          { ticketType: regex },
          { operator: regex }
        ];
      }
      const [scans, totalCount] = await Promise.all([
        Scan.find(query).sort({ scannedAt: -1 }).skip(skip).limit(l),
        Scan.countDocuments(query)
      ]);
      return {
        scans,
        totalCount,
        page: p,
        totalPages: Math.ceil(totalCount / l) || 1
      };
    }

    let filtered = [...memoryStore.scans];
    if (cleanEventId) {
      filtered = filtered.filter(s => (s.eventId?._id || s.eventId)?.toString() === cleanEventId);
    }
    if (result && result !== 'all') {
      filtered = filtered.filter(s => s.result === result);
    }
    if (search) {
      const term = search.toLowerCase().trim();
      filtered = filtered.filter(s =>
        s.code?.toLowerCase().includes(term) ||
        s.holderName?.toLowerCase().includes(term) ||
        s.holderEmail?.toLowerCase().includes(term) ||
        s.ticketType?.toLowerCase().includes(term) ||
        s.operator?.toLowerCase().includes(term)
      );
    }
    filtered.sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt));
    const totalCount = filtered.length;
    const scans = filtered.slice(skip, skip + l);
    return {
      scans,
      totalCount,
      page: p,
      totalPages: Math.ceil(totalCount / l) || 1
    };
  }
};

module.exports = dataStore;
