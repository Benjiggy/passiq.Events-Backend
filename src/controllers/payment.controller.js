const dataStore = require("../models/dataStore");
const ApiResponse = require("../utils/apiResponse");
const PaystackService = require("../services/paystack.service");
const FlutterwaveService = require("../services/flutterwave.service");
const StripeService = require("../services/stripe.service");
const CryptoService = require("../services/crypto.service");
const TicketService = require("../services/ticket.service");
const { generateReference, toKobo } = require("../utils/formatters");
const logger = require("../utils/logger");

class PaymentController {
  /**
   * Unified Payment Initialization (Paystack, Flutterwave, Stripe, Crypto)
   * POST /api/paystack/initialize or /api/payments/initialize
   */
  static async initializePayment(req, res, next) {
    try {
      const {
        eventId,
        tierId,
        quantity = 1,
        attendeeName,
        email,
        phone,
        provider = "paystack",
        cryptoCurrency = "USDT_TRC20",
        useTestSimulator = false,
      } = req.body;

      if (!eventId || !attendeeName || !email) {
        return ApiResponse.error(
          res,
          "Event ID, attendee name, and email address are required.",
          400,
        );
      }

      const numQuantity = Number(quantity);
      if (
        !Number.isSafeInteger(numQuantity) ||
        numQuantity < 1 ||
        numQuantity > 20
      ) {
        return ApiResponse.error(
          res,
          "Quantity must be between 1 and 20 tickets.",
          400,
        );
      }

      const event = await dataStore.getEventByIdOrSlug(eventId);
      if (!event)
        return ApiResponse.error(res, "Event not found or unavailable.", 404);

      if (event.status !== "published") {
        return ApiResponse.error(
          res,
          "This event is not currently accepting ticket registrations.",
          400,
        );
      }

      const tiers = event.ticketTiers || [];
      const tier =
        tiers.find((t) => (t.id || t._id)?.toString() === tierId?.toString()) ||
        tiers[0];
      if (!tier) return ApiResponse.error(res, "Ticket tier not found.", 404);

      // Check capacity
      if (tier.sold + numQuantity > tier.capacity) {
        return ApiResponse.error(
          res,
          "Sorry, there are not enough tickets remaining for this tier.",
          400,
        );
      }

      const unitPrice = tier.price || 0;
      const unitAmountKobo = tier.unitAmountKobo || toKobo(unitPrice);
      const totalAmountKobo = unitAmountKobo * numQuantity;
      const totalAmount = unitPrice * numQuantity;

      const reference = generateReference("PASSIQ");

      // Create initial order record
      const order = await dataStore.createOrder({
        reference,
        buyerId: req.user ? req.user.id : null,
        ownerId: event.ownerId,
        eventId: event.id || event._id,
        tierId: tier.id || tier._id || "general",
        quantity: numQuantity,
        attendeeName: attendeeName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : "",
        unitAmountKobo,
        amountKobo: totalAmountKobo,
        amount: totalAmount,
        currency: event.currency || "NGN",
        paymentProvider: totalAmount === 0 ? "free" : provider,
        status: "initialized",
        metadata: {
          eventTitle: event.title,
          tierName: tier.name,
        },
      });

      // 1. Handle Free Tickets
      if (totalAmount === 0) {
        return res.status(200).json({
          status: "success",
          success: true,
          message: "Free ticket registration initialized",
          data: {
            reference,
            amount: 0,
            amountKobo: 0,
            currency: event.currency || "NGN",
            mode: "free",
            publicKey: "free_checkout",
          },
        });
      }

      // 2. Handle Crypto Payments
      if (provider === "crypto") {
        const cryptoInit = await CryptoService.initializeCryptoPayment({
          orderReference: reference,
          amount: totalAmount,
          currency: event.currency || "NGN",
          cryptoCurrency,
          customerEmail: email,
          eventTitle: event.title,
        });

        return res.status(200).json({
          status: "success",
          success: true,
          message: "Crypto payment order initialized",
          data: {
            ...cryptoInit.data,
            mode: "crypto",
          },
        });
      }

      // 3. Handle Flutterwave
      if (provider === "flutterwave") {
        const flwInit = await FlutterwaveService.initializePayment({
          amount: totalAmount,
          currency: event.currency || "NGN",
          email: email.trim(),
          name: attendeeName.trim(),
          phone: phone || "",
          reference,
          redirectUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment/callback?reference=${reference}&provider=flutterwave`,
          title: event.title,
        });

        return res.status(200).json({
          status: "success",
          success: true,
          data: {
            reference,
            amount: totalAmountKobo,
            currency: event.currency || "NGN",
            authorizationUrl: flwInit.data?.link,
            mode: "flutterwave",
          },
        });
      }

      // 4. Handle Stripe
      if (provider === "stripe") {
        const stripeSession = await StripeService.createCheckoutSession({
          amount: totalAmount,
          currency: "usd",
          reference,
          customerEmail: email.trim(),
          eventTitle: event.title,
          successUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment/callback?reference=${reference}&provider=stripe`,
          cancelUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/events/${event.slug || event.id}`,
        });

        return res.status(200).json({
          status: "success",
          success: true,
          data: {
            reference,
            sessionId: stripeSession.id,
            authorizationUrl: stripeSession.url,
            mode: "stripe",
          },
        });
      }

      // 5. Default: Paystack
      const callbackUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment/callback?reference=${reference}`;
      const paystackRes = await PaystackService.initializePayment({
        email: email.trim(),
        amountKobo: totalAmountKobo,
        reference,
        callbackUrl,
        metadata: {
          eventTitle: event.title,
          tierName: tier.name,
          quantity: numQuantity,
        },
      });

      return res.status(200).json({
        status: "success",
        success: true,
        data: {
          reference,
          mode: "live",
          publicKey:
            paystackRes.data?.publicKey || process.env.PAYSTACK_PUBLIC_KEY,
          amount: totalAmountKobo,
          currency: event.currency || "NGN",
          authorizationUrl: paystackRes.data?.authorization_url,
          accessCode: paystackRes.data?.access_code,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unified Payment Verification & Ticket Issuance
   * POST /api/paystack/verify or /api/payments/verify
   */
  static async verifyPayment(req, res, next) {
    try {
      const { reference, provider = "paystack", txHash } = req.body;

      if (!reference) {
        return ApiResponse.error(
          res,
          "Transaction reference is required for verification.",
          400,
        );
      }

      const order = await dataStore.getOrderByReference(reference);
      if (!order) {
        return ApiResponse.error(
          res,
          "Order not found with the specified reference.",
          404,
        );
      }

      // If already verified and tickets exist, return tickets directly
      if (order.status === "success") {
        const tickets = await dataStore.listTicketsByReference(reference);
        return res.status(200).json({
          status: "success",
          success: true,
          message: "Payment verified and tickets retrieved.",
          reference,
          tickets,
        });
      }

      // Verify with appropriate provider
      let verificationSuccessful = false;

      if (order.amount === 0 || order.paymentProvider === "free") {
        verificationSuccessful = true;
      } else if (order.paymentProvider === "crypto" || provider === "crypto") {
        const cryptoVer = await CryptoService.verifyCryptoPayment(
          reference,
          txHash,
        );
        verificationSuccessful = cryptoVer.confirmed;
      } else if (
        order.paymentProvider === "flutterwave" ||
        provider === "flutterwave"
      ) {
        const flwVer = await FlutterwaveService.verifyPayment(reference);
        verificationSuccessful =
          flwVer.status === "success" || flwVer.data?.status === "successful";
      } else if (order.paymentProvider === "stripe" || provider === "stripe") {
        const stripeVer = await StripeService.verifySession(reference);
        verificationSuccessful =
          stripeVer.payment_status === "paid" ||
          stripeVer.status === "complete";
      } else {
        // Paystack
        const paystackVer = await PaystackService.verifyPayment(reference);
        verificationSuccessful =
          paystackVer.status === true || paystackVer.data?.status === "success";
      }

      if (!verificationSuccessful) {
        await dataStore.updateOrder(reference, { status: "failed" });
        return ApiResponse.error(
          res,
          "Payment verification failed. Please try again or contact support.",
          400,
        );
      }

      // Mark order successful
      await dataStore.updateOrder(reference, { status: "success" });

      // Create Payment log
      await dataStore.createPayment({
        reference,
        orderId: order.id || order._id,
        provider: order.paymentProvider,
        providerReference: reference,
        amount: order.amount,
        amountKobo: order.amountKobo,
        currency: order.currency,
        status: "success",
        paidAt: new Date(),
      });

      // Issue Tickets
      const tickets = await TicketService.issueTicketsForOrder(order);

      return res.status(200).json({
        status: "success",
        success: true,
        message: "Payment successfully verified. Tickets issued!",
        reference,
        tickets,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Webhook Handler for Payment Gateways
   * POST /api/payments/webhook/:provider
   */
  static async handleWebhook(req, res) {
    try {
      const { provider } = req.params;
      const payload = req.body;
      logger.info(`Incoming Webhook from ${provider}:`, payload);

      if (provider === "paystack") {
        const ref = payload.data?.reference;
        if (payload.event === "charge.success" && ref) {
          const order = await dataStore.getOrderByReference(ref);
          if (order && order.status !== "success") {
            await dataStore.updateOrder(ref, { status: "success" });
            await TicketService.issueTicketsForOrder(order);
          }
        }
      }

      return res.status(200).json({ received: true });
    } catch (err) {
      logger.error("Webhook Error:", err.message);
      return res.status(200).json({ received: false, error: err.message });
    }
  }
}

module.exports = PaymentController;
