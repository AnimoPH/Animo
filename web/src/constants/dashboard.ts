/**
 * Placeholder data for the LGU Console scaffold.
 *
 * Shapes mirror what the monitoring API is expected to return.
 */

export const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', sublabel: 'Pangunahing Tanaw', path: '/dashboard' },
  { key: 'advisory', label: 'Pagsubaybay sa Payo', sublabel: 'Advisory Monitoring', path: '/advisory' },
  { key: 'messages', label: 'Mensahe', sublabel: 'Notification', path: '/messages' },
  { key: 'farmers', label: 'Mga Magsasaka', sublabel: 'Farmers', path: '/farmers' },
  { key: 'buyers', label: 'Mga Mamimili', sublabel: 'Buyers', path: '/buyers' },
  { key: 'settings', label: 'Mga Setting', sublabel: 'Settings', path: '/settings' },
] as const;

/* ---------------- Dashboard Metrics ---------------- */

export type Metric = {
  key: string;
  label: string;
  value: string;
  delta: string;
  icon: 'forecast' | 'benchmark';
};

export const METRICS: Metric[] = [
  {
    key: 'forecast-accuracy',
    label: 'Forecast accuracy',
    value: '88.5%',
    delta: 'Batay sa 30-araw na tala',
    icon: 'forecast',
  },
  {
    key: 'farmgate-benchmark',
    label: 'Farmgate benchmark',
    value: '₱16.40',
    delta: 'kada kilo · Region III',
    icon: 'benchmark',
  },
];

export type PriceBar = {
  day: string;
  /** Relative bar height, 0–1. */
  level: number;
  active?: boolean;
};

export const PRICE_WEEK: PriceBar[] = [
  { day: 'Lun', level: 0.46 },
  { day: 'Mar', level: 0.52 },
  { day: 'Miy', level: 0.44 },
  { day: 'Huw', level: 0.62 },
  { day: 'Biy', level: 0.7 },
  { day: 'Sab', level: 0.58 },
  { day: 'Lin', level: 1, active: true },
];

/* ---------------- Reviews & Reports Models ---------------- */

export type UserReview = {
  id: string;
  reviewerName: string;
  reviewerRole: string;
  rating: number; // 1 to 5
  criteria: {
    quality: number;
    weight: number;
    communication: number;
    timeliness: number;
  };
  comment: string;
  date: string;
  transactionRef?: string;
};

export type UserReport = {
  id: string;
  reportedBy: string;
  role: string;
  reason: string;
  details: string;
  date: string;
  status: 'pending' | 'investigating' | 'resolved';
  evidence?: string;
};

export type UserTransactionRecord = {
  id: string;
  reference: string;
  variety: string;
  quantityKg: number;
  total: number;
  date: string;
  partnerName: string;
  status: 'completed' | 'cancelled' | 'active';
};

/* ---------------- Farmers ---------------- */

export type Farmer = {
  id: string;
  name: string;
  initials: string;
  barangay: string;
  phone: string;
  email?: string;
  farmSize: string;
  registeredDate: string;
  status: 'active' | 'inactive' | 'suspended';
  suspensionReason?: string;
  rating: number;
  totalTransactions: number;
  reviews: UserReview[];
  reports: UserReport[];
  transactions: UserTransactionRecord[];
};

export const FARMERS: Farmer[] = [
  {
    id: 'FRM-1042',
    name: 'Juan Dela Cruz',
    initials: 'JD',
    barangay: 'Brgy. San Jose',
    phone: '0917 555 0142',
    email: 'juan.delacruz@agri.ph',
    farmSize: '1.2 ha',
    registeredDate: 'Enero 15, 2024',
    status: 'active',
    rating: 4.9,
    totalTransactions: 28,
    reviews: [
      {
        id: 'rev-1',
        reviewerName: 'Maria Santos',
        reviewerRole: 'Mamimili',
        rating: 5,
        criteria: { quality: 5, weight: 5, communication: 5, timeliness: 5 },
        comment: 'Napakaganda ng kalidad ng Palay RC160. Sakto ang timbang at maayos kausap si Tatay Juan!',
        date: 'Oktubre 18, 2025',
        transactionRef: 'TXN-2025-0418-0094',
      },
      {
        id: 'rev-2',
        reviewerName: 'Eduardo Lim',
        reviewerRole: 'Wholesaler',
        rating: 5,
        criteria: { quality: 5, weight: 5, communication: 4, timeliness: 5 },
        comment: 'Tuyo at malinis ang mga sako ng palay. Maagap sa pickup schedule.',
        date: 'Setyembre 28, 2025',
        transactionRef: 'TXN-2025-0320-0081',
      },
      {
        id: 'rev-3',
        reviewerName: 'Roberto Tan',
        reviewerRole: 'Miller',
        rating: 4,
        criteria: { quality: 4, weight: 5, communication: 4, timeliness: 4 },
        comment: 'Mataas ang milling recovery rate. Inirekomenda para sa cooperative procurement.',
        date: 'Agosto 14, 2025',
        transactionRef: 'TXN-2025-0210-0055',
      },
    ],
    reports: [
      {
        id: 'rep-1',
        reportedBy: 'Mario Gomez',
        role: 'Mamimili',
        reason: 'Naantala ang pickup dahil sa ulan',
        details: 'Nagkaantala ng 1 oras ang pickup dahil sa biglaang pagbuhos ng ulan sa San Jose.',
        date: 'Hulyo 20, 2025',
        status: 'resolved',
      },
    ],
    transactions: [
      {
        id: 'txn-1',
        reference: 'TXN-2025-0418-0094',
        variety: 'Palay RC160',
        quantityKg: 500,
        total: 8000,
        date: 'Oktubre 18, 2025',
        partnerName: 'Maria Santos',
        status: 'completed',
      },
      {
        id: 'txn-2',
        reference: 'TXN-2025-0320-0081',
        variety: 'Palay RC 638 SR',
        quantityKg: 1000,
        total: 15500,
        date: 'Setyembre 28, 2025',
        partnerName: 'Eduardo Lim',
        status: 'completed',
      },
    ],
  },
  {
    id: 'FRM-1038',
    name: 'Rosa Mendoza',
    initials: 'RM',
    barangay: 'Brgy. San Jose',
    phone: '0918 555 0177',
    email: 'rosa.mendoza@agri.ph',
    farmSize: '0.8 ha',
    registeredDate: 'Marso 10, 2024',
    status: 'active',
    rating: 4.8,
    totalTransactions: 19,
    reviews: [
      {
        id: 'rev-4',
        reviewerName: 'Corazon Dizon',
        reviewerRole: 'Commercial Buyer',
        rating: 5,
        criteria: { quality: 5, weight: 5, communication: 5, timeliness: 4 },
        comment: 'Maganda ang butil ng palay, walang halo.',
        date: 'Oktubre 5, 2025',
        transactionRef: 'TXN-2025-0402-0088',
      },
    ],
    reports: [],
    transactions: [],
  },
  {
    id: 'FRM-1031',
    name: 'Pedro Santos',
    initials: 'PS',
    barangay: 'Brgy. Concepcion',
    phone: '0917 555 0198',
    email: 'pedro.santos@agri.ph',
    farmSize: '2.4 ha',
    registeredDate: 'Pebrero 22, 2024',
    status: 'active',
    rating: 4.7,
    totalTransactions: 34,
    reviews: [
      {
        id: 'rev-5',
        reviewerName: 'Manuel Pangilinan',
        reviewerRole: 'Coop Bulk Buyer',
        rating: 5,
        criteria: { quality: 4, weight: 5, communication: 5, timeliness: 5 },
        comment: 'Mabilis magkausap at tapat sa timbang.',
        date: 'Setyembre 12, 2025',
      },
    ],
    reports: [],
    transactions: [],
  },
  {
    id: 'FRM-1027',
    name: 'Ana Bautista',
    initials: 'AB',
    barangay: 'Brgy. Sta. Cruz',
    phone: '0920 555 0111',
    email: 'ana.bautista@agri.ph',
    farmSize: '1.6 ha',
    registeredDate: 'Abril 5, 2024',
    status: 'active',
    rating: 4.9,
    totalTransactions: 22,
    reviews: [],
    reports: [],
    transactions: [],
  },
  {
    id: 'FRM-1019',
    name: 'Mario Villanueva',
    initials: 'MV',
    barangay: 'Brgy. Tibag',
    phone: '0915 555 0163',
    email: 'mario.v@agri.ph',
    farmSize: '0.9 ha',
    registeredDate: 'Mayo 18, 2024',
    status: 'suspended',
    suspensionReason: 'Paulit-ulit na pagtanggi sa nakaiskedyul na inspeksyon nang walang abiso.',
    rating: 3.2,
    totalTransactions: 8,
    reviews: [
      {
        id: 'rev-6',
        reviewerName: 'Teresa Mendoza',
        reviewerRole: 'Retailer',
        rating: 2,
        criteria: { quality: 3, weight: 3, communication: 2, timeliness: 2 },
        comment: 'Hindi sumipot sa nakatakdang araw ng pickup. Mahirap tawagan.',
        date: 'Hulyo 15, 2025',
      },
    ],
    reports: [
      {
        id: 'rep-2',
        reportedBy: 'Teresa Mendoza',
        role: 'Mamimili',
        reason: 'Hindi sumipot sa pickup',
        details: 'Nakarating ang sasakyan sa bukid ngunit walang tao at nakasara ang bodega.',
        date: 'Hulyo 15, 2025',
        status: 'investigating',
      },
    ],
    transactions: [],
  },
  {
    id: 'FRM-1012',
    name: 'Lita Ramos',
    initials: 'LR',
    barangay: 'Brgy. Pagala',
    phone: '0919 555 0124',
    email: 'lita.ramos@agri.ph',
    farmSize: '3.1 ha',
    registeredDate: 'Hunyo 2, 2024',
    status: 'active',
    rating: 4.9,
    totalTransactions: 41,
    reviews: [],
    reports: [],
    transactions: [],
  },
];

/* ---------------- Buyers ---------------- */

export type Buyer = {
  id: string;
  name: string;
  initials: string;
  barangay: string;
  phone: string;
  email?: string;
  buyerType: string;
  registeredDate: string;
  status: 'active' | 'inactive' | 'suspended';
  suspensionReason?: string;
  rating: number;
  totalTransactions: number;
  reviews: UserReview[];
  reports: UserReport[];
  transactions: UserTransactionRecord[];
};

export const BUYERS: Buyer[] = [
  {
    id: 'BYR-2001',
    name: 'Maria Santos',
    initials: 'MS',
    barangay: 'Brgy. San Jose',
    phone: '0917 890 1234',
    email: 'maria.santos@email.com',
    buyerType: 'Coop-Verified Buyer',
    registeredDate: 'Hunyo 12, 2024',
    status: 'active',
    rating: 5.0,
    totalTransactions: 15,
    reviews: [
      {
        id: 'rev-b1',
        reviewerName: 'Juan Dela Cruz',
        reviewerRole: 'Magsasaka',
        rating: 5,
        criteria: { quality: 5, weight: 5, communication: 5, timeliness: 5 },
        comment: 'Napakabilis magbayad sa pamamagitan ng GCash. Maagap din sa oras ng pickup.',
        date: 'Oktubre 18, 2025',
        transactionRef: 'TXN-2025-0418-0094',
      },
    ],
    reports: [],
    transactions: [
      {
        id: 'txn-b1',
        reference: 'TXN-2025-0418-0094',
        variety: 'Palay RC160',
        quantityKg: 500,
        total: 8000,
        date: 'Oktubre 18, 2025',
        partnerName: 'Juan Dela Cruz',
        status: 'completed',
      },
    ],
  },
  {
    id: 'BYR-2002',
    name: 'Eduardo Lim',
    initials: 'EL',
    barangay: 'Brgy. Dela Paz',
    phone: '0918 555 0244',
    email: 'eduardo.lim@trader.ph',
    buyerType: 'Wholesaler / Trader',
    registeredDate: 'Hulyo 4, 2024',
    status: 'active',
    rating: 4.8,
    totalTransactions: 31,
    reviews: [],
    reports: [],
    transactions: [],
  },
  {
    id: 'BYR-2003',
    name: 'Corazon Dizon',
    initials: 'CD',
    barangay: 'Brgy. Concepcion',
    phone: '0919 555 0312',
    email: 'cora.dizon@rice.ph',
    buyerType: 'Commercial Rice Buyer',
    registeredDate: 'Agosto 19, 2024',
    status: 'active',
    rating: 4.7,
    totalTransactions: 20,
    reviews: [],
    reports: [],
    transactions: [],
  },
  {
    id: 'BYR-2004',
    name: 'Roberto Tan',
    initials: 'RT',
    barangay: 'Brgy. Sta. Cruz',
    phone: '0920 555 0498',
    email: 'roberto.tan@mill.ph',
    buyerType: 'Rice Mill Operator',
    registeredDate: 'Setyembre 1, 2024',
    status: 'active',
    rating: 4.9,
    totalTransactions: 45,
    reviews: [],
    reports: [],
    transactions: [],
  },
  {
    id: 'BYR-2005',
    name: 'Teresa Mendoza',
    initials: 'TM',
    barangay: 'Brgy. Tibag',
    phone: '0915 555 0521',
    email: 'teresa.mendoza@market.ph',
    buyerType: 'Local Retailer',
    registeredDate: 'Setyembre 14, 2024',
    status: 'inactive',
    rating: 4.1,
    totalTransactions: 6,
    reviews: [],
    reports: [],
    transactions: [],
  },
  {
    id: 'BYR-2006',
    name: 'Manuel Pangilinan',
    initials: 'MP',
    barangay: 'Brgy. Pagala',
    phone: '0917 555 0687',
    email: 'mp@coopbuyer.ph',
    buyerType: 'Coop Bulk Buyer',
    registeredDate: 'Oktubre 2, 2024',
    status: 'active',
    rating: 4.9,
    totalTransactions: 38,
    reviews: [],
    reports: [],
    transactions: [],
  },
];

/* ---------------- Settings ---------------- */

export const LGU_PROFILE = {
  name: 'Ma. Cristina Reyes',
  initials: 'MR',
  role: 'Municipal Agriculture Officer',
  lgu: 'LGU San Mateo, Rizal',
  email: 'ma.reyes@sanmateo.gov.ph',
  phone: '0917 555 0134',
  barangays:
    'San Jose, Sta. Cruz, Tibag, Pagala, Concepcion, Makinabang',
  barangayCount: 6,
};

export function getLegalLinks(lang: 'tl' | 'en' = 'tl') {
  const isEn = lang === 'en';
  return [
    {
      key: 'terms',
      title: isEn ? 'Terms & Conditions' : 'Mga Tuntunin at Kundisyon',
      subtitle: isEn ? 'Terms of use and agreement' : 'Mga tuntunin ng paggamit',
      icon: 'file' as const,
    },
    {
      key: 'privacy',
      title: isEn ? 'Privacy Policy' : 'Patakaran sa Privacy',
      subtitle: isEn ? 'Data Privacy Act (RA 10173)' : 'Proteksyon ng datos (RA 10173)',
      icon: 'lock' as const,
    },
    {
      key: 'faq',
      title: isEn ? 'Help & FAQ' : 'Tulong at FAQ',
      subtitle: isEn ? 'Frequently asked questions' : 'Mga madalas itanong',
      icon: 'help' as const,
    },
    {
      key: 'data-sharing',
      title: isEn ? 'Data Sharing Agreement' : 'Kasunduan sa Pagbabahagi ng Datos',
      subtitle: 'LGU – DA – PhilRice – PSA',
      icon: 'database' as const,
    },
  ];
}

export const LEGAL_LINKS = getLegalLinks('tl');

export function getAppInfo(lang: 'tl' | 'en' = 'tl') {
  const isEn = lang === 'en';
  return [
    { label: isEn ? 'Version' : 'Bersyon', value: 'ANIMO LGU 1.4.0' },
    { label: isEn ? 'Last sync' : 'Huling sync', value: isEn ? 'Oct 12, 2025 · 09:05 AM' : 'Okt 12, 2025 · 09:05 AM' },
  ];
}

export const APP_INFO = getAppInfo('tl');
