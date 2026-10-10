# Passiq Events REST API Documentation

Comprehensive API documentation for the **Passiq Events** backend platform.

---

## 1. Overview & Base URLs

- **Default Local Server**: `http://localhost:5000`
- **Primary API Prefix**: `/api` (also supports `/api/v1`)
- **Format**: `application/json`
- **Authentication**: JWT Bearer Tokens in `Authorization` header (`Bearer <access_token>`) or `accessToken` cookie.

### Standard Response Structure

#### Success Response
```json
{
  "success": true,
  "status": "success",
  "message": "Operation successful",
  "data": { ... }
}
```

#### Error Response
```json
{
  "success": false,
  "status": "error",
  "message": "Error description message",
  "errors": [ ... ]
}
```

---

## 2. Authentication & User Management

### 2.1 Register New Account
- **Endpoint**: `POST /api/auth/register` (or `POST /api/v1/auth/register`)
- **Access**: Public
- **Request Body**:
```json
{
  "name": "Bolanle Adeleke",
  "email": "bolanle@example.com",
  "password": "password123",
  "accountType": "host", // "attendee" | "host" | "admin"
  "phone": "+2348012345678"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "status": "success",
  "message": "Registration successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "user_m7a9x",
      "name": "Bolanle Adeleke",
      "email": "bolanle@example.com",
      "role": "host",
      "accountType": "host",
      "phone": "+2348012345678"
    }
  }
}
```

### 2.2 User Sign In (Login)
- **Endpoint**: `POST /api/auth/login` (or `POST /api/v1/auth/login`)
- **Access**: Public
- **Request Body**:
```json
{
  "email": "host@passiq.test",
  "password": "passiq123"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "demo-user",
      "name": "Bolanle Adeleke (Host)",
      "email": "host@passiq.test",
      "role": "host",
      "accountType": "host",
      "phone": "+2348098765432"
    }
  }
}
```

### 2.3 Get Current User Profile
- **Endpoint**: `GET /api/auth/me`
- **Access**: Protected (`Bearer <token>`)
- **Response `200 OK`**:
```json
{
  "success": true,
  "status": "success",
  "message": "User profile retrieved",
  "data": {
    "user": {
      "id": "demo-user",
      "name": "Bolanle Adeleke (Host)",
      "email": "host@passiq.test",
      "role": "host",
      "accountType": "host",
      "phone": "+2348098765432",
      "payoutAccount": {
        "bankName": "Access Bank",
        "accountNumber": "0987654321",
        "accountName": "Bolanle Adeleke",
        "isVerified": true
      }
    }
  }
}
```

### 2.4 Update Profile Details
- **Endpoint**: `PUT /api/auth/profile`
- **Access**: Protected
- **Request Body**:
```json
{
  "name": "Bolanle Adeleke-Smith",
  "phone": "+2348098765432"
}
```

### 2.5 Refresh JWT Token
- **Endpoint**: `POST /api/auth/refresh`
- **Access**: Public / Bearer
- **Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsIn..."
}
```

---

## 3. Events Endpoints

### 3.1 List Public Events
- **Endpoint**: `GET /api/events`
- **Access**: Public
- **Query Parameters**:
  - `category` (string, e.g. `Music & Concerts`, `Career & Business`, `Nightlife`, `All`)
  - `search` (string, searches title and venue)
  - `status` (`published` | `draft` | `completed`)
  - `featured` (`true` | `false`)
- **Response `200 OK`**:
```json
{
  "success": true,
  "status": "success",
  "events": [
    {
      "id": "event-burna-lagos-2026",
      "title": "Burna Boy Live: No Sign of Weakness Tour",
      "slug": "burna-boy-live-no-sign-of-weakness-tour",
      "category": "Music & Concerts",
      "date": "2026-12-28",
      "time": "19:00",
      "location": "Landmark Beach Arena, Water Corporation Drive, Victoria Island",
      "price": 15000,
      "minPrice": 15000,
      "maxPrice": 150000,
      "capacity": 5000,
      "soldCount": 1420,
      "image": "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=80",
      "status": "published",
      "ticketTiers": [
        {
          "id": "tier_ga",
          "name": "General Admission",
          "price": 15000,
          "capacity": 4000,
          "sold": 1200,
          "description": "Standard arena standing pass."
        },
        {
          "id": "tier_vip",
          "name": "VIP Access Pass",
          "price": 50000,
          "capacity": 800,
          "sold": 200,
          "description": "Elevated VIP deck, express lane entry."
        }
      ]
    }
  ],
  "total": 1
}
```

### 3.2 Get Event by ID or Slug
- **Endpoint**: `GET /api/events/:idOrSlug`
- **Access**: Public
- **Example**: `GET /api/events/burna-boy-live-no-sign-of-weakness-tour`

### 3.3 Get Event Categories
- **Endpoint**: `GET /api/events/categories`
- **Access**: Public
- **Response `200 OK`**:
```json
{
  "success": true,
  "status": "success",
  "data": {
    "categories": [
      { "id": "all", "name": "All Events", "count": 12 },
      { "id": "music-concerts", "name": "Music & Concerts", "count": 5 },
      { "id": "career-business", "name": "Career & Business", "count": 3 },
      { "id": "nightlife", "name": "Nightlife", "count": 4 }
    ]
  }
}
```

### 3.4 Create New Event (Hosts & Admins)
- **Endpoint**: `POST /api/events`
- **Access**: Protected (`host` or `admin`)
- **Request Body**:
```json
{
  "title": "Afrobeats Summer Jam 2026",
  "category": "Music & Concerts",
  "date": "2026-12-20",
  "time": "18:00",
  "location": "Landmark Centre, Water Corporation Drive",
  "city": "Lagos",
  "country": "Nigeria",
  "price": 5000,
  "capacity": 500,
  "status": "published",
  "description": "High energy festival bringing Africa together.",
  "ticketTiers": [
    {
      "name": "General Admission",
      "price": 5000,
      "capacity": 400,
      "description": "Regular admission"
    },
    {
      "name": "VIP Pass",
      "price": 20000,
      "capacity": 100,
      "description": "VIP Lounge and welcome drinks"
    }
  ]
}
```

### 3.5 Host List Own Events
- **Endpoint**: `GET /api/events/user/my-events`
- **Access**: Protected (`host` or `admin`)

### 3.6 Update Event Details
- **Endpoint**: `PUT /api/events/:id`
- **Access**: Protected (Event owner or admin)

### 3.7 Change Event Status
- **Endpoint**: `PATCH /api/events/:id/status`
- **Access**: Protected
- **Request Body**: `{ "status": "draft" }` or `{ "status": "published" }` or `{ "status": "completed" }`

---

## 4. Multi-Payment & Crypto Integration

Passiq backend natively supports **Paystack, Flutterwave, Stripe, and Crypto Assets (USDT TRC20/ERC20, USDC, BTC, ETH, SOL)**.

### 4.1 Initialize Payment Order
- **Endpoint**: `POST /api/paystack/initialize` or `POST /api/payments/initialize`
- **Access**: Public / Authenticated
- **Request Body**:
```json
{
  "eventId": "event-burna-lagos-2026",
  "tierId": "tier_ga",
  "quantity": 2,
  "attendeeName": "Chidi Okafor",
  "email": "chidi@example.com",
  "phone": "+2348012345678",
  "provider": "paystack" // "paystack" | "flutterwave" | "stripe" | "crypto" | "free"
}
```

#### Paystack Response `200 OK`:
```json
{
  "status": "success",
  "success": true,
  "data": {
    "reference": "PASSIQ_1791590022027_R3ZVK6Y",
    "mode": "live",
    "publicKey": "pk_test_xxxxxxxxxxxxxxxxxxxxxx",
    "amount": 3000000, // Amount in kobo
    "currency": "NGN",
    "authorizationUrl": "http://localhost:5173/payment/callback?reference=PASSIQ_1791590022027_R3ZVK6Y",
    "accessCode": "mock_code_1791590022028"
  }
}
```

---

### 4.2 Initialize Multi-Crypto Payment
- **Endpoint**: `POST /api/payments/crypto/initialize` (or `POST /api/payments/initialize` with `"provider": "crypto"`)
- **Access**: Public / Authenticated
- **Request Body**:
```json
{
  "eventId": "event-burna-lagos-2026",
  "tierId": "tier_vip",
  "quantity": 1,
  "attendeeName": "David Adeleke",
  "email": "david@crypto.xyz",
  "cryptoCurrency": "USDT_TRC20" // "USDT_TRC20" | "USDT_ERC20" | "USDC" | "BTC" | "ETH" | "SOL"
}
```
- **Response `200 OK`**:
```json
{
  "status": "success",
  "success": true,
  "message": "Crypto payment order initialized",
  "data": {
    "paymentId": "crypto_PASSIQ_1791590061962_VN10OOK",
    "reference": "PASSIQ_1791590061962_VN10OOK",
    "payAddress": "TXsampleCryptoWalletTRC20Passiq",
    "network": "TRON (TRC20)",
    "cryptoCurrency": "USDT_TRC20",
    "cryptoAmount": 32.26,
    "fiatAmount": 50000,
    "fiatCurrency": "NGN",
    "amountInUSD": 32.26,
    "qrCode": "data:image/png;base64,iVBORw0KGgo...",
    "checkoutUrl": "http://localhost:5173/payment/callback?reference=PASSIQ_1791590061962_VN10OOK&provider=crypto",
    "instructions": "Send exactly 32.26 USDT_TRC20 to the address above on the TRON (TRC20) network.",
    "mode": "crypto"
  }
}
```

---

### 4.3 Verify Payment & Issue Digital Passes
- **Endpoint**: `POST /api/paystack/verify` or `POST /api/payments/verify` or `POST /api/payments/crypto/verify`
- **Access**: Public / Authenticated
- **Request Body**:
```json
{
  "reference": "PASSIQ_1791590022027_R3ZVK6Y",
  "txHash": "0x8898129831928391289312983129831293" // (Optional for crypto)
}
```
- **Response `200 OK`**:
```json
{
  "status": "success",
  "success": true,
  "message": "Payment successfully verified. Tickets issued!",
  "reference": "PASSIQ_1791590022027_R3ZVK6Y",
  "tickets": [
    {
      "id": "tkt_1791590032795_ybm2",
      "ticketCode": "BURN-G4ND-Q30LD",
      "reference": "PASSIQ_1791590022027_R3ZVK6Y",
      "qrToken": "PASSIQ-LIVE:BURN-G4ND-Q30LD:PASSIQ_1791590022027_R3ZVK6Y",
      "qrDataUrl": "data:image/png;base64,iVBORw0KG...",
      "eventTitle": "Burna Boy Live: No Sign of Weakness Tour",
      "eventDate": "2026-12-28",
      "eventTime": "19:00",
      "eventLocation": "Landmark Beach Arena, Water Corporation Drive, Victoria Island",
      "tierName": "General Admission",
      "userName": "Chidi Okafor",
      "userEmail": "chidi@example.com",
      "unitPrice": 15000,
      "totalAmount": 15000,
      "currency": "NGN",
      "status": "valid",
      "issuedAt": "2026-10-09T23:53:52.795Z"
    }
  ]
}
```

### 4.4 Webhook Ingestion
- **Endpoints**:
  - `POST /api/payments/webhook/paystack`
  - `POST /api/payments/webhook/flutterwave`
  - `POST /api/payments/webhook/stripe`
  - `POST /api/payments/webhook/crypto`

---

## 5. Tickets & Gate QR Scanning

### 5.1 Get My Tickets
- **Endpoint**: `GET /api/tickets/my-tickets`
- **Access**: Protected (Returns all passes belonging to authenticated attendee)

### 5.2 Get Ticket Details
- **Endpoint**: `GET /api/tickets/:idOrCode`
- **Access**: Public / Authenticated

### 5.3 Scan & Validate Gate QR Ticket
- **Endpoint**: `POST /api/tickets/scan`
- **Access**: Protected (`host` or `admin`)
- **Request Body**:
```json
{
  "codeOrToken": "BURN-G4ND-Q30LD",
  "scannerStaff": "Gate 1 Attendant"
}
```
- **Successful Check-in Response `200 OK`**:
```json
{
  "success": true,
  "status": "checked_in",
  "message": "Welcome, Chidi Okafor! Ticket successfully validated.",
  "ticket": {
    "ticketCode": "BURN-G4ND-Q30LD",
    "status": "used",
    "checkedInAt": "2026-10-09T23:54:01.947Z",
    "checkedInBy": "Gate 1 Attendant"
  }
}
```
- **Already Used Rejection `400 Bad Request`**:
```json
{
  "success": false,
  "status": "already_used",
  "message": "Ticket already checked in at 00:54:01."
}
```

---

## 6. Financial Ledger & Earnings

### 6.1 Get Host Balance & Earnings Breakdown
- **Endpoint**: `GET /api/finance/balance`
- **Access**: Protected (`host` or `admin`)
- **Response `200 OK`**:
```json
{
  "status": "success",
  "success": true,
  "data": {
    "balance": {
      "earnedKobo": 50000000,
      "completedGrossKobo": 30000000,
      "feeDeductionKobo": 3000000, // 10% platform deduction on concluded events
      "eligibleKobo": 27000000,
      "lockedKobo": 20000000, // Upcoming event proceeds locked until conclusion
      "availableKobo": 27000000,
      "reservedKobo": 0,
      "paidKobo": 0,
      "ticketsSold": 1420
    },
    "earnings": [
      {
        "eventId": "event-burna-lagos-2026",
        "title": "Burna Boy Live: No Sign of Weakness Tour",
        "conclusion": "upcoming",
        "concluded": false,
        "tickets": 1420,
        "grossKobo": 20000000,
        "deductionKobo": 0,
        "netKobo": 20000000
      }
    ],
    "payoutAccount": {
      "bankName": "Access Bank",
      "accountNumber": "0987654321",
      "accountName": "Bolanle Adeleke",
      "isVerified": true
    }
  }
}
```

### 6.2 Save Host Payout Bank Details
- **Endpoint**: `POST /api/finance/payout-account`
- **Access**: Protected (`host`)
- **Request Body**:
```json
{
  "bankName": "Guaranty Trust Bank (GTB)",
  "accountNumber": "0123456789",
  "accountName": "Bolanle Adeleke"
}
```

---

## 7. Withdrawals & Admin Payouts

### 7.1 Request Host Withdrawal
- **Endpoint**: `POST /api/withdrawals/request`
- **Access**: Protected (`host`)
- **Request Body**:
```json
{
  "amount": "50000.00"
}
```

### 7.2 List My Withdrawals
- **Endpoint**: `GET /api/withdrawals/my-withdrawals`
- **Access**: Protected (`host`)

### 7.3 Admin List All Withdrawals
- **Endpoint**: `GET /api/admin/withdrawals`
- **Access**: Protected (`admin`)
- **Query Parameters**: `status` (`pending` | `reviewed` | `approved` | `paid` | `simulated_paid` | `rejected`)

### 7.4 Admin Transition Withdrawal State
- **Endpoint**: `POST /api/admin/withdrawals/:id/transition`
- **Access**: Protected (`admin`)
- **Request Body**:
```json
{
  "target": "approved", // "reviewed" | "approved" | "paid" | "simulated_paid" | "rejected"
  "note": "Approved for processing"
}
```

---

## 8. Box Office & Walk-up Sales

### 8.1 Record Walk-up Gate Sale
- **Endpoint**: `POST /api/box-office/walkup-sale`
- **Access**: Protected (`host` or `admin`)
- **Request Body**:
```json
{
  "eventId": "event-burna-lagos-2026",
  "tierId": "tier_ga",
  "quantity": 1,
  "attendeeName": "Walk-up Fan",
  "paymentMethod": "cash" // "cash" | "pos"
}
```

---

## 9. Discounts & Promo Codes

### 9.1 List Organizer Promo Codes
- **Endpoint**: `GET /api/discounts`
- **Access**: Protected (`host` or `admin`)

### 9.2 Create Promo Code
- **Endpoint**: `POST /api/discounts`
- **Access**: Protected (`host` or `admin`)
- **Request Body**:
```json
{
  "code": "EARLYBIRD20",
  "type": "percentage", // "percentage" | "fixed"
  "value": 20,
  "maxUses": 100
}
```

### 9.3 Validate Promo Code
- **Endpoint**: `POST /api/discounts/validate`
- **Access**: Public
- **Request Body**:
```json
{
  "code": "EARLYBIRD20",
  "orderAmount": 15000
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "code": "EARLYBIRD20",
    "type": "percentage",
    "value": 20,
    "discountAmount": 3000,
    "finalAmount": 12000
  }
}
```

---

## 10. Platform Administration

### 10.1 Platform Summary Metrics
- **Endpoint**: `GET /api/admin/platform/summary`
- **Access**: Protected (`admin`)
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "totals": {
      "eventCount": 3,
      "ticketsSold": 3260,
      "grossKobo": 98500000
    },
    "events": [ ... ]
  }
}
```

### 10.2 List All Event Hosts
- **Endpoint**: `GET /api/admin/hosts`
- **Access**: Protected (`admin`)

---

## 11. Editorial Blogs, Memories & Newsletter

### 11.1 List Blog Articles
- **Endpoint**: `GET /api/blogs`
- **Query Parameter**: `category` (e.g. `Nightlife`, `Career & Business`, `All`)

### 11.2 Get Blog Article Details
- **Endpoint**: `GET /api/blogs/:slug`

### 11.3 List Memories Showcase
- **Endpoint**: `GET /api/memories`

### 11.4 Newsletter Subscribe
- **Endpoint**: `POST /api/newsletter/subscribe`
- **Request Body**: `{ "email": "fan@passiq.events" }`
