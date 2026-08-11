/**
 * Placeholder data for the LGU Console scaffold.
 *
 * Shapes mirror what the monitoring API is expected to return, so wiring the
 * real endpoints should be a swap of this module rather than a page rewrite.
 *
 * Farmer-action figures (advance cut / delayed harvest / no action) are
 * deliberately absent — those panels are out of scope for now.
 */

export const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', sublabel: 'Pangunahing Tanaw', path: '/dashboard' },
  { key: 'advisory', label: 'Pagsubaybay sa Payo', sublabel: 'Advisory Monitoring', path: '/advisory' },
  { key: 'messages', label: 'Mensahe', sublabel: 'Notification', path: '/messages' },
  { key: 'farmers', label: 'Mga Magsasaka', sublabel: 'Farmers', path: '/farmers' },
  { key: 'settings', label: 'Mga Setting', sublabel: 'Settings', path: '/settings' },
] as const;

/* ---------------- Dashboard ---------------- */

export type Metric = {
  key: string;
  label: string;
  value: string;
  delta: string;
  icon: 'advisory' | 'forecast' | 'benchmark';
};

export const METRICS: Metric[] = [
  {
    key: 'advisory-delivery',
    label: 'Advisory delivery rate',
    value: '94.2%',
    delta: '+1.8% vs nakaraang linggo',
    icon: 'advisory',
  },
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

export type VolatilityTier = 'clamped' | 'fallback';

export type VolatilityRow = {
  listingId: string;
  barangay: string;
  priceFrom: string;
  priceTo: string;
  tier: VolatilityTier;
  status: string;
  date: string;
};

export const VOLATILITY_LOG: VolatilityRow[] = [
  {
    listingId: 'LST-2091',
    barangay: 'Brgy. San Jose',
    priceFrom: '₱17.80',
    priceTo: '₱16.90',
    tier: 'clamped',
    status: 'Awtomatikong na-clamp',
    date: 'Okt 12 · 08:14 AM',
  },
  {
    listingId: 'LST-2087',
    barangay: 'Brgy. Concepcion',
    priceFrom: '₱19.20',
    priceTo: '₱17.05',
    tier: 'clamped',
    status: 'Awtomatikong na-clamp',
    date: 'Okt 12 · 07:52 AM',
  },
  {
    listingId: 'LST-2074',
    barangay: 'Brgy. Tibag',
    priceFrom: '₱21.50',
    priceTo: '₱16.40',
    tier: 'fallback',
    status: 'Kinumpirma ng magsasaka',
    date: 'Okt 11 · 04:30 PM',
  },
  {
    listingId: 'LST-2069',
    barangay: 'Brgy. Pagala',
    priceFrom: '₱13.10',
    priceTo: '₱16.40',
    tier: 'fallback',
    status: 'Kinumpirma ng magsasaka',
    date: 'Okt 11 · 02:07 PM',
  },
  {
    listingId: 'LST-2063',
    barangay: 'Brgy. Sta. Cruz',
    priceFrom: '₱18.40',
    priceTo: '₱16.95',
    tier: 'clamped',
    status: 'Awtomatikong na-clamp',
    date: 'Okt 10 · 11:20 AM',
  },
];

/* ---------------- Advisory monitoring ---------------- */

/** Advisory severity, mirrored from the mobile advisory levels. */
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
  /** Headline for the advisory, e.g. "Rain Advisory — Malubha". */
  advisory: string;
  issued: string;
  /** Delivery counter, e.g. 38 of 38 sent. */
  delivered: number;
  total: number;
  status: AdvisoryStatus;
};

export const BARANGAY_ADVISORIES: BarangayAdvisory[] = [
  {
    barangay: 'Brgy. San Jose',
    severity: 'severe',
    advisory: 'Rain Advisory — Malubha',
    issued: 'Okt 12 · 06:00 AM',
    delivered: 38,
    total: 38,
    status: 'active',
  },
  {
    barangay: 'Brgy. Concepcion',
    severity: 'mild',
    advisory: 'Rain Advisory — Banayad',
    issued: 'Okt 12 · 06:00 AM',
    delivered: 27,
    total: 27,
    status: 'active',
  },
  {
    barangay: 'Brgy. Sta. Cruz',
    severity: 'moderate',
    advisory: 'Rain Advisory — Katamtaman',
    issued: 'Okt 11 · 05:30 PM',
    delivered: 24,
    total: 24,
    status: 'active',
  },
  {
    barangay: 'Brgy. Tibag',
    severity: 'mild',
    advisory: 'Rain Advisory — Banayad',
    issued: 'Okt 11 · 05:30 PM',
    delivered: 19,
    total: 19,
    status: 'done',
  },
  {
    barangay: 'Brgy. Pagala',
    severity: 'clear',
    advisory: 'Walang babala',
    issued: 'Okt 10 · 06:00 AM',
    delivered: 31,
    total: 31,
    status: 'done',
  },
  {
    barangay: 'Brgy. Makinabang',
    severity: 'clear',
    advisory: 'Walang babala',
    issued: 'Okt 10 · 06:00 AM',
    delivered: 22,
    total: 22,
    status: 'done',
  },
];

/* ---------------- Notifications ---------------- */

export type AlertKind = 'severe' | 'mild' | 'moderate' | 'done' | 'price';

export type TriggerAlert = {
  id: string;
  kind: AlertKind;
  title: string;
  body: string;
  time: string;
  badge: string;
  /** Unread alerts get the dot and a tinted icon. */
  unread: boolean;
};

export const TRIGGER_ALERTS: TriggerAlert[] = [
  {
    id: 'alert-1',
    kind: 'severe',
    title: 'Malubhang ulan sa Brgy. San Jose',
    body: 'Umabot sa 42 mm/oras ang inaasahang ulan sa susunod na 6 na oras. Naipadala ang advisory sa 38 magsasaka.',
    time: 'Okt 12 · 06:00 AM',
    badge: 'Malubha',
    unread: true,
  },
  {
    id: 'alert-2',
    kind: 'mild',
    title: 'Banayad na ulan sa Brgy. Concepcion',
    body: 'Inaasahang 12 mm/oras na ulan. Naipadala ang advisory sa 27 magsasaka.',
    time: 'Okt 12 · 06:00 AM',
    badge: 'Banayad',
    unread: true,
  },
  {
    id: 'alert-3',
    kind: 'moderate',
    title: 'Katamtamang ulan sa Brgy. Sta. Cruz',
    body: 'Inaasahang 24 mm/oras na ulan bukas ng umaga. Naipadala sa 24 magsasaka.',
    time: 'Okt 11 · 05:30 PM',
    badge: 'Katamtaman',
    unread: true,
  },
  {
    id: 'alert-4',
    kind: 'done',
    title: 'Natapos na ang advisory sa Brgy. Tibag',
    body: 'Bumalik sa normal ang lagay ng panahon. 19 magsasaka ang naabisuhan.',
    time: 'Okt 11 · 08:12 PM',
    badge: 'Natapos',
    unread: false,
  },
  {
    id: 'alert-5',
    kind: 'price',
    title: 'Nag-clamp ng presyo — Tier 2',
    body: 'Na-clamp ang LST-2091 mula ₱17.80 patungong ₱16.90 dahil sa volatility.',
    time: 'Okt 12 · 08:14 AM',
    badge: 'Presyo',
    unread: false,
  },
];

export type TriggerSummaryRow = {
  label: string;
  color: string;
  count: number;
};

export const TRIGGER_SUMMARY: TriggerSummaryRow[] = [
  { label: 'Malubha (Severe)', color: 'var(--animo-danger)', count: 3 },
  { label: 'Katamtaman (Moderate)', color: 'var(--animo-warning)', count: 5 },
  { label: 'Banayad (Mild)', color: 'var(--animo-caution)', count: 9 },
  { label: 'Presyo (Tier 2 / 3)', color: '#3B82F6', count: 5 },
];

export const DELIVERY_CHANNELS = [
  { label: 'SMS', value: '94.2% delivered' },
  { label: 'In-app push', value: '88.0% delivered' },
  { label: 'Barangay board', value: '100% delivered' },
];

/* ---------------- Farmers ---------------- */

export type Farmer = {
  id: string;
  name: string;
  initials: string;
  barangay: string;
  phone: string;
  farmSize: string;
  status: 'active' | 'inactive';
};

export const FARMERS: Farmer[] = [
  {
    id: 'FRM-1042',
    name: 'Juan Dela Cruz',
    initials: 'JD',
    barangay: 'Brgy. San Jose',
    phone: '0917 555 0142',
    farmSize: '1.2 ha',
    status: 'active',
  },
  {
    id: 'FRM-1038',
    name: 'Rosa Mendoza',
    initials: 'RM',
    barangay: 'Brgy. San Jose',
    phone: '0918 555 0177',
    farmSize: '0.8 ha',
    status: 'active',
  },
  {
    id: 'FRM-1031',
    name: 'Pedro Santos',
    initials: 'PS',
    barangay: 'Brgy. Concepcion',
    phone: '0917 555 0198',
    farmSize: '2.4 ha',
    status: 'active',
  },
  {
    id: 'FRM-1027',
    name: 'Ana Bautista',
    initials: 'AB',
    barangay: 'Brgy. Sta. Cruz',
    phone: '0920 555 0111',
    farmSize: '1.6 ha',
    status: 'active',
  },
  {
    id: 'FRM-1019',
    name: 'Mario Villanueva',
    initials: 'MV',
    barangay: 'Brgy. Tibag',
    phone: '0915 555 0163',
    farmSize: '0.9 ha',
    status: 'inactive',
  },
  {
    id: 'FRM-1012',
    name: 'Lita Ramos',
    initials: 'LR',
    barangay: 'Brgy. Pagala',
    phone: '0919 555 0124',
    farmSize: '3.1 ha',
    status: 'active',
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
