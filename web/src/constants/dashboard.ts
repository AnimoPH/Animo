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

/* ---------------- Advisory monitoring ---------------- */

export type Severity = 'severe' | 'moderate' | 'mild' | 'clear';

export const SEVERITY_LABEL: Record<Severity, string> = {
  severe: 'Malubha',
  moderate: 'Katamtaman',
  mild: 'Banayad',
  clear: 'Walang babala',
};

export const SEVERITY_COLOR: Record<Severity, string> = {
  severe: 'var(--animo-danger)',
  moderate: 'var(--animo-warning)',
  mild: 'var(--animo-caution)',
  clear: 'var(--animo-green)',
};

export type AdvisoryStatus = 'active' | 'done';

export type BarangayAdvisory = {
  barangay: string;
  severity: Severity;
  advisory: string;
  issued: string;
  delivered: number;
  total: number;
  status: AdvisoryStatus;
};

export function getBarangayAdvisories(lang: 'tl' | 'en' = 'tl'): BarangayAdvisory[] {
  const isEn = lang === 'en';
  return [
    {
      barangay: 'Brgy. San Jose',
      severity: 'severe',
      advisory: isEn ? 'Rain Advisory — Severe' : 'Payo sa Ulan — Malubha',
      issued: isEn ? 'Oct 12 · 06:00 AM' : 'Okt 12 · 06:00 AM',
      delivered: 38,
      total: 38,
      status: 'active',
    },
    {
      barangay: 'Brgy. Concepcion',
      severity: 'mild',
      advisory: isEn ? 'Rain Advisory — Mild' : 'Payo sa Ulan — Banayad',
      issued: isEn ? 'Oct 12 · 06:00 AM' : 'Okt 12 · 06:00 AM',
      delivered: 27,
      total: 27,
      status: 'active',
    },
    {
      barangay: 'Brgy. Sta. Cruz',
      severity: 'moderate',
      advisory: isEn ? 'Rain Advisory — Moderate' : 'Payo sa Ulan — Katamtaman',
      issued: isEn ? 'Oct 11 · 05:30 PM' : 'Okt 11 · 05:30 PM',
      delivered: 24,
      total: 24,
      status: 'active',
    },
    {
      barangay: 'Brgy. Tibag',
      severity: 'mild',
      advisory: isEn ? 'Rain Advisory — Mild' : 'Payo sa Ulan — Banayad',
      issued: isEn ? 'Oct 11 · 05:30 PM' : 'Okt 11 · 05:30 PM',
      delivered: 19,
      total: 19,
      status: 'done',
    },
    {
      barangay: 'Brgy. Pagala',
      severity: 'clear',
      advisory: isEn ? 'No Advisory' : 'Walang babala',
      issued: isEn ? 'Oct 10 · 06:00 AM' : 'Okt 10 · 06:00 AM',
      delivered: 31,
      total: 31,
      status: 'done',
    },
    {
      barangay: 'Brgy. Makinabang',
      severity: 'clear',
      advisory: isEn ? 'No Advisory' : 'Walang babala',
      issued: isEn ? 'Oct 10 · 06:00 AM' : 'Okt 10 · 06:00 AM',
      delivered: 22,
      total: 22,
      status: 'done',
    },
  ];
}

export const BARANGAY_ADVISORIES: BarangayAdvisory[] = getBarangayAdvisories('tl');

/* ---------------- Notifications ---------------- */

export type AlertKind = 'severe' | 'mild' | 'moderate' | 'done' | 'price' | 'nfa' | 'psa';

export type TriggerAlert = {
  id: string;
  kind: AlertKind;
  title: string;
  body: string;
  time: string;
  badge: string;
  unread: boolean;
  barangay?: string;
  sender?: string;
  recipientsCount?: number;
  recommendations?: string[];
};

export function getTriggerAlerts(lang: 'tl' | 'en' = 'tl'): TriggerAlert[] {
  const isEn = lang === 'en';
  return [
    {
      id: 'alert-1',
      kind: 'severe',
      title: isEn ? 'Heavy Rainfall in Brgy. San Jose' : 'Malubhang ulan sa Brgy. San Jose',
      body: isEn
        ? 'Expected rainfall up to 42 mm/hr in the next 6 hours. Advisory dispatched to 38 farmers.'
        : 'Umabot sa 42 mm/oras ang inaasahang ulan sa susunod na 6 na oras. Naipadala ang advisory sa 38 magsasaka.',
      time: isEn ? 'Oct 12 · 06:00 AM' : 'Okt 12 · 06:00 AM',
      badge: isEn ? 'Severe' : 'Malubha',
      unread: true,
      barangay: 'Brgy. San Jose',
      sender: isEn ? 'PAGASA Doppler Radar & LGU Sensor Station #2' : 'PAGASA Doppler Radar & LGU Sensor Station #2',
      recipientsCount: 38,
      recommendations: isEn
        ? [
            'Postpone palay harvesting and grain drying operations this morning.',
            'Move harvested and unsacked palay to covered concrete warehouses.',
            'Inspect drainage channels and irrigation canals to prevent field flooding.',
          ]
        : [
            'Iantala muna ang paggapas o anihan ng palay ngayong umaga.',
            'Ilikas ang mga naani at nakabilad na palay sa mga sementadong bodega.',
            'Suriin ang mga daluyan ng tubig at irigasyon upang maiwasan ang pagbaha sa bukid.',
          ],
    },
    {
      id: 'alert-2',
      kind: 'nfa',
      title: isEn ? 'NFA Volatility Alert — Fallback Safeguard' : 'NFA Volatility Alert — Fallback Safeguard',
      body: isEn
        ? 'Fallback safeguard activated due to sudden NFA price movement. Price floor clamped to prevent market crash.'
        : 'Na-activate ang fallback alert para sa biglaang pagbabago sa presyo ng NFA. Naka-clamp ang presyo para maiwasan ang market crash.',
      time: isEn ? 'Oct 12 · 07:30 AM' : 'Okt 12 · 07:30 AM',
      badge: isEn ? 'NFA Alert' : 'NFA Alerto',
      unread: true,
      barangay: isEn ? 'All Barangays' : 'Lahat ng Barangay',
      sender: 'National Food Authority (NFA) Monitoring & LGU Agri Office',
      recipientsCount: 161,
      recommendations: isEn
        ? [
            'Minimum floor price clamp automatically applied to all new transactions in Animo.',
            'Registered buyers notified of updated NFA benchmark standards.',
          ]
        : [
            'Awtomatikong inilapat ang minimum floor price clamp sa lahat ng bagong transaksyon sa Animo.',
            'Aabisuhan ang mga rehistradong mamimili sa bagong pamantayan ng NFA.',
          ],
    },
    {
      id: 'alert-3',
      kind: 'psa',
      title: isEn ? 'Market Benchmark Prices Synced from PSA' : 'Na-sync ang Market Prices mula sa PSA',
      body: isEn
        ? 'Successfully updated average farmgate price benchmark (₱16.40/kg) based on latest weekly PSA report.'
        : 'Matagumpay na na-update ang average farmgate price benchmark (₱16.40/kg) batay sa pinakabagong lingguhang ulat ng PSA.',
      time: isEn ? 'Oct 12 · 08:00 AM' : 'Okt 12 · 08:00 AM',
      badge: 'PSA Sync',
      unread: true,
      barangay: 'Region III & Rizal',
      sender: 'Philippine Statistics Authority (PSA) Open API',
      recipientsCount: 161,
      recommendations: isEn
        ? ['System pricing algorithms calibrated for fair farmgate computation.']
        : ['Naka-calibrate ang system pricing algorithm para sa patas na komputasyon.'],
    },
    {
      id: 'alert-4',
      kind: 'moderate',
      title: isEn ? 'Moderate Rainfall in Brgy. Sta. Cruz' : 'Katamtamang ulan sa Brgy. Sta. Cruz',
      body: isEn
        ? 'Expected 24 mm/hr rainfall tomorrow morning. Dispatched to 24 farmers.'
        : 'Inaasahang 24 mm/oras na ulan bukas ng umaga. Naipadala sa 24 magsasaka.',
      time: isEn ? 'Oct 11 · 05:30 PM' : 'Okt 11 · 05:30 PM',
      badge: isEn ? 'Moderate' : 'Katamtaman',
      unread: false,
      barangay: 'Brgy. Sta. Cruz',
      sender: 'LGU Weather Advisory System',
      recipientsCount: 24,
      recommendations: isEn
        ? ['Prepare tarpaulins and protective covers for drying seeds and palay sacks.']
        : ['Maghanda ng mga trapal pantakip sa mga binhi at aning palay.'],
    },
    {
      id: 'alert-5',
      kind: 'price',
      title: isEn ? 'Price Clamped — Tier 2 Safeguard' : 'Nag-clamp ng presyo — Tier 2',
      body: isEn
        ? 'LST-2091 clamped from ₱17.80 to ₱16.90 due to excessive market volatility.'
        : 'Na-clamp ang LST-2091 mula ₱17.80 patungong ₱16.90 dahil sa labis na volatility sa merkado.',
      time: isEn ? 'Oct 12 · 08:14 AM' : 'Okt 12 · 08:14 AM',
      badge: isEn ? 'Price' : 'Presyo',
      unread: false,
      barangay: 'Brgy. San Jose',
      sender: 'ANIMO Automated Volatility Engine',
      recipientsCount: 1,
      recommendations: isEn
        ? ['Seller and buyer notified of regulated price cap enforcement.']
        : ['Inabisuhan ang nagtitinda at ang mamimili kaugnay ng regulated price cap.'],
    },
  ];
}

export const TRIGGER_ALERTS: TriggerAlert[] = getTriggerAlerts('tl');

export type TriggerSummaryRow = {
  label: string;
  color: string;
  count: number;
};

export function getTriggerSummary(lang: 'tl' | 'en' = 'tl'): TriggerSummaryRow[] {
  const isEn = lang === 'en';
  return [
    { label: isEn ? 'Severe' : 'Malubha (Severe)', color: 'var(--animo-danger)', count: 3 },
    { label: 'NFA / PSA Sync', color: '#2563EB', count: 4 },
    { label: isEn ? 'Moderate' : 'Katamtaman (Moderate)', color: 'var(--animo-warning)', count: 5 },
    { label: isEn ? 'Mild' : 'Banayad (Mild)', color: 'var(--animo-caution)', count: 9 },
    { label: isEn ? 'Price Safeguard' : 'Presyo (Tier 2 / 3)', color: '#3B82F6', count: 5 },
  ];
}

export const TRIGGER_SUMMARY: TriggerSummaryRow[] = getTriggerSummary('tl');

export function getDeliveryChannels(lang: 'tl' | 'en' = 'tl') {
  const isEn = lang === 'en';
  return [
    { label: 'SMS', value: isEn ? '94.2% delivered' : '94.2% naipadala' },
    { label: 'In-app push', value: isEn ? '88.0% delivered' : '88.0% naipadala' },
    { label: isEn ? 'Barangay notice board' : 'Barangay board', value: isEn ? '100% posted' : '100% naipaskil' },
  ];
}

export const DELIVERY_CHANNELS = getDeliveryChannels('tl');

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

export const LEGAL_LINKS = [
  {
    key: 'terms',
    title: 'Terms and Conditions',
    subtitle: 'Mga tuntunin ng paggamit',
    icon: 'file' as const,
  },
  {
    key: 'privacy',
    title: 'Privacy Policy',
    subtitle: 'Paano ginagamit ang datos',
    icon: 'lock' as const,
  },
  {
    key: 'data-sharing',
    title: 'Data Sharing Agreement',
    subtitle: 'LGU – DA – PhilRice',
    icon: 'database' as const,
  },
];

export const APP_INFO = [
  { label: 'Bersyon', value: 'ANIMO LGU 1.4.0' },
  { label: 'Huling sync', value: 'Okt 12, 2025 · 09:05 AM' },
];
