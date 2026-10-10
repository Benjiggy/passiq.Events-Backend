/**
 * Application Constants
 */
module.exports = {
  USER_ROLES: {
    ATTENDEE: 'attendee',
    HOST: 'host',
    ADMIN: 'admin'
  },
  EVENT_STATUS: {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed'
  },
  EVENT_COMPLETION_STATUS: {
    UPCOMING: 'upcoming',
    ONGOING: 'ongoing',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  },
  ORDER_STATUS: {
    INITIALIZED: 'initialized',
    PENDING: 'pending',
    SUCCESS: 'success',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
  },
  TICKET_STATUS: {
    VALID: 'valid',
    USED: 'used',
    REVOKED: 'revoked',
    DEMO: 'demo'
  },
  PAYMENT_PROVIDERS: {
    PAYSTACK: 'paystack',
    FLUTTERWAVE: 'flutterwave',
    STRIPE: 'stripe',
    CRYPTO: 'crypto',
    CASH: 'cash'
  },
  CRYPTO_CURRENCIES: {
    USDT_TRC20: 'USDT_TRC20',
    USDT_ERC20: 'USDT_ERC20',
    USDC: 'USDC',
    BTC: 'BTC',
    ETH: 'ETH',
    SOL: 'SOL'
  },
  WITHDRAWAL_STATUS: {
    PENDING: 'pending',
    REVIEWED: 'reviewed',
    APPROVED: 'approved',
    PAID: 'paid',
    SIMULATED_PAID: 'simulated_paid',
    REJECTED: 'rejected'
  },
  DEFAULT_CATEGORIES: [
    'Music & Concerts',
    'Career & Business',
    'Nightlife',
    'Art & Culture',
    'Food & Drink',
    'Festivals',
    'Tech & Innovation',
    'Sports & Fitness',
    'Workshops & Classes'
  ],
  PLATFORM_POLICY: {
    DEDUCTION_PERCENT: 10, // 10% platform fee on concluded events
    RESERVE_STATUSES: ['pending', 'reviewed', 'approved'],
    PAID_STATUSES: ['paid', 'simulated_paid']
  }
};
