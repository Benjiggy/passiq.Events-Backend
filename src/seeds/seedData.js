const bcrypt = require('bcryptjs');
const dataStore = require('../models/dataStore');
const { toKobo } = require('../utils/formatters');

const seedInitialData = async () => {
  console.log('[Seed] Populating initial demonstration data...');

  const hashedPassword = await bcrypt.hash('passiq123', 10);

  // 1. Seed Users
  const usersToSeed = [
    {
      id: 'demo-admin',
      name: 'Agbo Emmanuel (Admin)',
      email: 'admin@passiq.test',
      password: hashedPassword,
      role: 'admin',
      accountType: 'admin',
      phone: '+2348012345678',
      payoutAccount: {
        bankName: 'Guaranty Trust Bank (GTB)',
        accountNumber: '0123456789',
        accountName: 'Agbo Emmanuel',
        isVerified: true
      }
    },
    {
      id: 'demo-user',
      name: 'Bolanle Adeleke (Host)',
      email: 'host@passiq.test',
      password: hashedPassword,
      role: 'host',
      accountType: 'host',
      phone: '+2348098765432',
      payoutAccount: {
        bankName: 'Access Bank',
        accountNumber: '0987654321',
        accountName: 'Bolanle Adeleke',
        isVerified: true
      }
    },
    {
      id: 'demo-attendee',
      name: 'Chidi Okafor (Attendee)',
      email: 'attendee@passiq.test',
      password: hashedPassword,
      role: 'attendee',
      accountType: 'attendee',
      phone: '+2348033334444'
    }
  ];

  for (const u of usersToSeed) {
    const exists = await dataStore.findUserByEmail(u.email);
    if (!exists) {
      await dataStore.createUser(u);
    }
  }

  // 2. Seed Events
  const eventsToSeed = [
    {
      id: 'event-burna-lagos-2026',
      title: 'Burna Boy Live: No Sign of Weakness Tour',
      slug: 'burna-boy-live-no-sign-of-weakness-tour',
      subtitle: 'The African Giant brings his legendary live arena concert home to Lagos.',
      description: 'Experience an unforgettable night of high-energy Afrobeats, state-of-the-art visual productions, and live orchestral arrangements as Burna Boy headlines Landmark Beach with special guest appearances.',
      category: 'Music & Concerts',
      date: '2026-12-28',
      time: '19:00',
      location: 'Landmark Beach Arena, Water Corporation Drive, Victoria Island',
      city: 'Lagos',
      country: 'Nigeria',
      currency: 'NGN',
      price: 15000,
      minPrice: 15000,
      maxPrice: 150000,
      capacity: 5000,
      soldCount: 1420,
      featured: true,
      image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=80',
      poster: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=80',
      status: 'published',
      completionStatus: 'upcoming',
      ownerId: 'demo-user',
      organizer: {
        name: 'Spaceship Entertainment & Passiq Live',
        email: 'host@passiq.test',
        phone: '+2348098765432',
        verified: true
      },
      directions: {
        venueName: 'Landmark Beach Arena',
        shortCode: 'LMK-MAIN',
        address: 'Water Corporation Drive, Victoria Island, Lagos',
        rating: 4.9,
        reviewCount: 312,
        googleMapsUrl: 'https://maps.google.com/?q=Landmark+Beach+Lagos'
      },
      ticketTiers: [
        { id: 'tier_ga', name: 'General Admission', price: 15000, unitAmountKobo: 1500000, capacity: 4000, sold: 1200, description: 'Standard arena standing pass.' },
        { id: 'tier_vip', name: 'VIP Access Pass', price: 50000, unitAmountKobo: 5000000, capacity: 800, sold: 200, description: 'Elevated VIP deck, express lane entry, and complimentary welcome cocktail.' },
        { id: 'tier_vvip', name: 'VVIP Table of 6', price: 150000, unitAmountKobo: 15000000, capacity: 200, sold: 20, description: 'Exclusive lounge booth, dedicated bottle service, security escort.' }
      ]
    },
    {
      id: 'event-afro-tech-fest-2026',
      title: 'AfroTech Summit Africa 2026',
      slug: 'afrotech-summit-africa-2026',
      subtitle: 'The premier conference uniting founders, builders, VC investors, and tech leaders.',
      description: 'Join over 3,000 innovators across fintech, artificial intelligence, climate-tech, and Web3 building the next generation of African digital unicorns.',
      category: 'Career & Business',
      date: '2026-11-15',
      time: '09:00',
      location: 'Eko Convention Centre, Victoria Island',
      city: 'Lagos',
      country: 'Nigeria',
      currency: 'NGN',
      price: 25000,
      minPrice: 25000,
      maxPrice: 75000,
      capacity: 3000,
      soldCount: 890,
      featured: true,
      image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
      poster: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
      status: 'published',
      completionStatus: 'upcoming',
      ownerId: 'demo-admin',
      organizer: {
        name: 'AfroTech Global & TechCabal',
        email: 'admin@passiq.test',
        phone: '+2348012345678',
        verified: true
      },
      directions: {
        venueName: 'Eko Convention Centre',
        shortCode: 'EKO-HALL',
        address: 'Plot 1415 Adetokunbo Ademola St, Victoria Island, Lagos',
        rating: 4.8,
        reviewCount: 450,
        googleMapsUrl: 'https://maps.google.com/?q=Eko+Hotels+and+Suites+Lagos'
      },
      ticketTiers: [
        { id: 'tier_student', name: 'Early Bird Student Pass', price: 10000, unitAmountKobo: 1000000, capacity: 500, sold: 300, description: 'Full conference access for verified students.' },
        { id: 'tier_standard', name: 'Standard Delegate Pass', price: 25000, unitAmountKobo: 2500000, capacity: 2000, sold: 500, description: 'Access to keynotes, breakout sessions, expo floor, and networking lounge.' },
        { id: 'tier_exec', name: 'Executive VIP Pass', price: 75000, unitAmountKobo: 7500000, capacity: 500, sold: 90, description: 'VIP Founders & Investors Dinner, exclusive private deal room access.' }
      ]
    },
    {
      id: 'event-palmwine-music-fest',
      title: 'Palmwine Music Festival Lagos 2026',
      slug: 'palmwine-music-festival-lagos-2026',
      subtitle: 'Show Dem Camp & Friends annual celebration of alternative African music and culture.',
      description: 'An open-air festival featuring food vendors, live art, chill vibes, and classic performances by Show Dem Camp, Ladipoe, BOJ, and surprise guests.',
      category: 'Nightlife',
      date: '2026-12-24',
      time: '16:00',
      location: 'Muri Okunola Park, Victoria Island',
      city: 'Lagos',
      country: 'Nigeria',
      currency: 'NGN',
      price: 12000,
      minPrice: 12000,
      maxPrice: 35000,
      capacity: 2500,
      soldCount: 950,
      featured: true,
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
      poster: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
      status: 'published',
      completionStatus: 'upcoming',
      ownerId: 'demo-user',
      organizer: {
        name: 'Show Dem Camp & Palmwine Collective',
        email: 'host@passiq.test',
        phone: '+2348098765432',
        verified: true
      },
      directions: {
        venueName: 'Muri Okunola Park',
        shortCode: 'MURI-PK',
        address: 'Ozumba Mbadiwe Ave, Victoria Island, Lagos',
        rating: 4.7,
        reviewCount: 180,
        googleMapsUrl: 'https://maps.google.com/?q=Muri+Okunola+Park'
      },
      ticketTiers: [
        { id: 'tier_pw_reg', name: 'Regular Entry', price: 12000, unitAmountKobo: 1200000, capacity: 2000, sold: 800, description: 'Standard festival entry pass.' },
        { id: 'tier_pw_vip', name: 'Palmwine VIP Cabana', price: 35000, unitAmountKobo: 3500000, capacity: 500, sold: 150, description: 'Complimentary Palmwine gourd, VIP seating, fast-track entrance.' }
      ]
    }
  ];

  for (const e of eventsToSeed) {
    const exists = await dataStore.getEventByIdOrSlug(e.id);
    if (!exists) {
      await dataStore.createEvent(e);
    }
  }

  // 3. Seed Discounts
  const discountsToSeed = [
    {
      code: 'EARLYBIRD20',
      ownerId: 'demo-user',
      type: 'percentage',
      value: 20,
      maxUses: 100,
      usedCount: 42,
      isActive: true
    },
    {
      code: 'VIPACCESS',
      ownerId: 'demo-user',
      type: 'fixed',
      value: 2500,
      maxUses: 50,
      usedCount: 18,
      isActive: true
    }
  ];

  for (const d of discountsToSeed) {
    const exists = await dataStore.findDiscountByCode(d.code);
    if (!exists) {
      await dataStore.createDiscount(d);
    }
  }

  // 4. Seed Blogs
  const blogsToSeed = [
    {
      slug: 'top-festivals-lagos-december-2026',
      title: 'The Ultimate Guide to Detty December 2026 in Lagos',
      category: 'Nightlife',
      readTime: '5 min read',
      publishedAt: '2026-10-01',
      heroImage: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80',
      excerpt: 'Everything you need to know about the biggest concerts, beach festivals, and cultural events taking over Lagos this holiday season.',
      content: 'Lagos in December is unmatched. From high-octane Afrobeats concerts to intimate palmwine listening sessions, here is our curated guide.'
    },
    {
      slug: 'how-to-organize-sold-out-tech-event',
      title: 'How Event Hosts are Selling Out Tech Summits with Crypto & Instant QR Passes',
      category: 'Career & Business',
      readTime: '6 min read',
      publishedAt: '2026-09-24',
      heroImage: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=80',
      excerpt: 'Discover modern ticketing strategies, dynamic pricing, and frictionless Web3 crypto checkout flows driving 3x ticket conversion.',
      content: 'Traditional ticket sales often suffer high checkout drop-offs. By integrating multi-currency fiat gateways alongside USDT and USDC crypto payments, organizers unlock international attendee demand.'
    }
  ];

  for (const b of blogsToSeed) {
    const exists = await dataStore.getBlogBySlug(b.slug);
    if (!exists) {
      await dataStore.createBlog(b);
    }
  }

  console.log('[Seed] Data initialization completed successfully.');
};

module.exports = { seedInitialData };
