/**
 * Multi-Payment Gateway Configuration
 */
module.exports = {
  paystack: {
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_sample',
    secretKey: process.env.PAYSTACK_SECRET_KEY || 'sk_test_sample',
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
    supportedCurrencies: ['NGN', 'GHS', 'KES', 'ZAR', 'USD']
  },
  flutterwave: {
    publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK_TEST-sample',
    secretKey: process.env.FLUTTERWAVE_SECRET_KEY || 'FLWSECK_TEST-sample',
    encryptionKey: process.env.FLUTTERWAVE_ENCRYPTION_KEY,
    webhookSecret: process.env.FLUTTERWAVE_WEBHOOK_SECRET,
    supportedCurrencies: ['NGN', 'GHS', 'KES', 'RWF', 'UGX', 'ZAR', 'USD', 'EUR', 'GBP']
  },
  stripe: {
    publicKey: process.env.STRIPE_PUBLIC_KEY || 'pk_test_sample',
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_sample',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  },
  crypto: {
    provider: process.env.CRYPTO_GATEWAY_PROVIDER || 'simulated', // 'nowpayments' | 'coinbase' | 'web3_custom' | 'simulated'
    nowpayments: {
      apiKey: process.env.NOWPAYMENTS_API_KEY,
      ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET,
      apiUrl: 'https://api.nowpayments.io/v1'
    },
    coinbase: {
      apiKey: process.env.COINBASE_COMMERCE_API_KEY,
      webhookSecret: process.env.COINBASE_COMMERCE_WEBHOOK_SECRET,
      apiUrl: 'https://api.commerce.coinbase.com'
    },
    wallets: {
      USDT_TRC20: process.env.CRYPTO_RECEIVER_USDT_TRC20 || 'TXsampleCryptoWalletTRC20Passiq',
      USDT_ERC20: process.env.CRYPTO_RECEIVER_USDT_ERC20 || '0x1234567890123456789012345678901234567890',
      BTC: process.env.CRYPTO_RECEIVER_BTC || 'bc1qsamplebtcwalletaddressforpassiqevents',
      SOL: process.env.CRYPTO_RECEIVER_SOL || 'SampleSolanaWalletAddressForPassiqTicketing123'
    },
    // Approximate conversion estimates against NGN & USD for crypto calculations
    ratesAgainstUSD: {
      USDT: 1.0,
      USDC: 1.0,
      BTC: 68500.0,
      ETH: 3500.0,
      SOL: 150.0
    },
    usdToNgnRate: 1550.0
  }
};
