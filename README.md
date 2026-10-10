# Passiq Events Backend

Modern, production-grade REST API backend for the **Passiq Events** ticketing and event management platform.

Built with **Node.js, Express, and JavaScript (ES6+)**.

---

## Features

- **Authentication & RBAC**: JWT Bearer tokens & HTTP cookies, role management (`attendee`, `host`, `admin`).
- **Events Engine**: Category filtering, dynamic ticket tiers, capacity tracking, slug routing.
- **Multi-Payment Gateways**:
  - **Paystack** (NGN, GHS, KES, ZAR cards, USSD, bank transfer).
  - **Flutterwave** (Pan-African payments & Mobile Money).
  - **Stripe** (International USD, EUR, GBP, Apple Pay, Google Pay).
  - **Crypto Payments** (USDT TRC20/ERC20, USDC, BTC, ETH, SOL with on-chain conversion and QR codes).
- **Automated Digital Passes**: Unique ticket codes, secure QR tokens, QR image data URLs, and gate check-in scanning.
- **Host Financial Ledger**: Locked vs available balances, 10% platform fee deduction upon event conclusion.
- **Withdrawals & Payouts**: Host withdrawal requests, NUBAN bank verification, admin approval workflows.
- **Box Office**: Gate staff scanner mobile app validation and walk-up POS/cash sales.
- **Hybrid Storage Mode**: Runs seamlessly in in-memory mode with rich pre-seeded demonstration data out-of-the-box, or connects automatically to MongoDB in production.

---

## Getting Started

### 1. Installation

```bash
cd Passiq-Events-Backend
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your payment keys and secrets in `.env`:

```env
PORT=5000
NODE_ENV=development
API_PREFIX=/api
FRONTEND_URL=http://localhost:5173

# Optional: Set MongoDB connection URI (falls back automatically to in-memory store if offline)
MONGODB_URI=mongodb://127.0.0.1:27017/passiq_events

JWT_SECRET=passiq_super_secure_jwt_secret_key_2026_x7a9
PLATFORM_DEDUCTION_PERCENT=10

# Multi-Payment Gateways
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxxxxxxxxxxxxxxxxx-X
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxxxxxxxxxxxxxxxxx-X

STRIPE_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Crypto Gateways
CRYPTO_GATEWAY_PROVIDER=simulated # options: nowpayments, coinbase, web3_custom, simulated
NOWPAYMENTS_API_KEY=
COINBASE_COMMERCE_API_KEY=
CRYPTO_RECEIVER_USDT_TRC20=TXsampleCryptoWalletTRC20Passiq
CRYPTO_RECEIVER_BTC=bc1qsamplebtcwalletaddressforpassiqevents
```

### 3. Run Server

```bash
# Start development server with hot-reload
npm run dev

# Or standard production start
npm start
```

Server starts at: `http://localhost:5000`

---

## Seed Accounts

The backend automatically pre-seeds the following test accounts:

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@passiq.test` | `passiq123` |
| **Host** | `host@passiq.test` | `passiq123` |
| **Attendee** | `attendee@passiq.test` | `passiq123` |

---

## Full API Documentation

For the full endpoint reference, schemas, query parameters, and code snippets, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).
