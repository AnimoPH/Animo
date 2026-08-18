/**
 * Mock public buyer profiles keyed by Mga Orders request ids.
 * Privacy-safe only: no phone, email, GCash number, wallet, or street address.
 */

export type BuyerPreferredPayment = 'GCash' | 'Cash';

export type BuyerPurchaseHistoryItem = {
  quantityKg: number;
  variety: string;
  caption: string;
};

export type BuyerFarmerReview = {
  quote: string;
};

export type BuyerPublicProfile = {
  buyerId: string;
  name: string;
  location: string;
  memberSince: string;
  completedTransactionsCount: number;
  averageRating: number;
  totalReviews: number;
  totalBoughtKg: number;
  typicalOrderKg: number;
  commonlyBoughtVarieties: string[];
  preferredPayment: BuyerPreferredPayment;
  reliabilityPct: number;
  currentRequest: {
    quantity: string;
    total: string;
  };
  recentPurchases: BuyerPurchaseHistoryItem[];
  farmerReviews: BuyerFarmerReview[];
};

const BUYER_PUBLIC_PROFILES: Record<string, BuyerPublicProfile> = {
  '1': {
    buyerId: '1',
    name: 'Bulacan Rice Traders',
    location: 'Pulilan, Bulacan',
    memberSince: 'Agosto 2025',
    completedTransactionsCount: 24,
    averageRating: 4.9,
    totalReviews: 18,
    totalBoughtKg: 18600,
    typicalOrderKg: 800,
    commonlyBoughtVarieties: ['Inbred (RC 160)', 'Hybrid (SL-8H)', 'Sinandomeng'],
    preferredPayment: 'GCash',
    reliabilityPct: 97,
    currentRequest: { quantity: '300 kg', total: '₱3,000.00' },
    recentPurchases: [
      { quantityKg: 2500, variety: 'Inbred (RC 160)', caption: 'Nakumpleto noong Hulyo 2026' },
      { quantityKg: 1800, variety: 'Hybrid (SL-8H)', caption: 'Nakumpleto noong Hunyo 2026' },
      { quantityKg: 2000, variety: 'Sinandomeng', caption: 'Nakumpleto noong Mayo 2026' },
    ],
    farmerReviews: [
      {
        quote:
          'Nagbayad agad sa GCash pagkatapos ng pickup. Malinaw ang usapan at walang atrasan.',
      },
      {
        quote: 'Maayos ang schedule ng kuha at eksakto ang dami. Maaasahang suki.',
      },
    ],
  },
  '2': {
    buyerId: '2',
    name: 'San Rafael Coop',
    location: 'San Rafael, Bulacan',
    memberSince: 'Oktubre 2025',
    completedTransactionsCount: 16,
    averageRating: 4.8,
    totalReviews: 12,
    totalBoughtKg: 12400,
    typicalOrderKg: 500,
    commonlyBoughtVarieties: ['Inbred (RC 222)', 'Tradisyonal', 'Hybrid (SL-8H)'],
    preferredPayment: 'Cash',
    reliabilityPct: 95,
    currentRequest: { quantity: '100 kg', total: '₱1,000.00' },
    recentPurchases: [
      { quantityKg: 1200, variety: 'Inbred (RC 222)', caption: 'Nakumpleto noong Hulyo 2026' },
      { quantityKg: 900, variety: 'Tradisyonal', caption: 'Nakumpleto noong Hunyo 2026' },
      { quantityKg: 750, variety: 'Hybrid (SL-8H)', caption: 'Nakumpleto noong Abril 2026' },
    ],
    farmerReviews: [
      {
        quote: 'Cash ang bayad at handa agad sa pickup. Walang paligoy-ligoy sa usapan.',
      },
      {
        quote: 'Maaga dumating at malinaw ang dami na kukunin. Maganda kausap.',
      },
    ],
  },
  '3': {
    buyerId: '3',
    name: 'Aling Nena Rice Mill',
    location: 'Baliwag, Bulacan',
    memberSince: 'Nobyembre 2025',
    completedTransactionsCount: 11,
    averageRating: 4.7,
    totalReviews: 9,
    totalBoughtKg: 8200,
    typicalOrderKg: 350,
    commonlyBoughtVarieties: ['Inbred (RC 160)', 'Dinorado'],
    preferredPayment: 'GCash',
    reliabilityPct: 94,
    currentRequest: { quantity: '100 kg', total: '₱1,000.00' },
    recentPurchases: [
      { quantityKg: 800, variety: 'Inbred (RC 160)', caption: 'Nakumpleto noong Hunyo 2026' },
      { quantityKg: 600, variety: 'Dinorado', caption: 'Nakumpleto noong Mayo 2026' },
    ],
    farmerReviews: [
      {
        quote: 'Maagap magbayad at malinaw kung kailan kukuha. Walang sorpresa sa dami.',
      },
      {
        quote: 'Magalang kausap at tumutupad sa oras ng pickup. Ireretoke ko ulit.',
      },
    ],
  },
  '4': {
    buyerId: '4',
    name: 'Aling Coring Rice Mill',
    location: 'Plaridel, Bulacan',
    memberSince: 'Enero 2026',
    completedTransactionsCount: 8,
    averageRating: 4.8,
    totalReviews: 7,
    totalBoughtKg: 6100,
    typicalOrderKg: 250,
    commonlyBoughtVarieties: ['Hybrid (SL-8H)', 'Inbred (RC 160)', 'Tradisyonal'],
    preferredPayment: 'Cash',
    reliabilityPct: 96,
    currentRequest: { quantity: '100 kg', total: '₱1,000.00' },
    recentPurchases: [
      { quantityKg: 700, variety: 'Hybrid (SL-8H)', caption: 'Nakumpleto noong Hulyo 2026' },
      { quantityKg: 500, variety: 'Inbred (RC 160)', caption: 'Nakumpleto noong Hunyo 2026' },
      { quantityKg: 400, variety: 'Tradisyonal', caption: 'Nakumpleto noong Mayo 2026' },
    ],
    farmerReviews: [
      {
        quote: 'Handa ang cash sa pickup at eksakto ang timbang na kinuha. Maayos ang transaksyon.',
      },
      {
        quote: 'Malinaw ang oras ng kuha at walang atrasan. Maaasahang mamimili.',
      },
    ],
  },
};

/** Looks up a mock public buyer profile by Mga Orders request id. */
export function getBuyerPublicProfile(id: string): BuyerPublicProfile | undefined {
  return BUYER_PUBLIC_PROFILES[id];
}
