/**
 * Marketplace domain model + mock data (frontend only).
 *
 * Once the backend exists these come from an API. Prices are set by the system
 * ("Nakatakda ng sistema"), not negotiable — see `Listing.priceLocked`.
 */

export type MunicipalityName = 'Antipolo' | 'Teresa' | 'Tanay' | 'Baras';

export type Listing = {
  id: string;
  variety: string; // e.g. "Palay RC160"
  availableKg: number;
  pricePerKg: number;
  /** System-estimated price flag ("Tinantyang Presyo"). */
  estimated: boolean;
  moisturePct?: number;
  purityGrade?: string;
  municipality: MunicipalityName;
  province: string; // "Rizal"
  barangay: string;
  /** Prices are computed by ANIMO and cannot be negotiated. */
  priceLocked: boolean;
};

export type TransactionStatus = 'aktibo' | 'tapos' | 'cancelled';

export type Transaction = {
  id: string;
  variety: string;
  municipality: MunicipalityName;
  province: string;
  quantityKg: number;
  total: number;
  /** Display date string (pre-formatted for the mock). */
  date: string;
  status: TransactionStatus;
  farmerName?: string;
  reference?: string;
};

/* ---------------- Purchase request lifecycle ---------------- */

/**
 * Stages a purchase request moves through in the revised flow, in order:
 *
 * `pending`    — buyer sent bid/order, waiting for farmer to accept
 * `accepted`   — farmer accepted bid; proceeds directly to pickup & inspection
 * `scheduled`  — pickup + inspection scheduled
 * `inspected`  — palay inspected on the farm, ready for full payment
 * `completed`  — paid in full (GCash or Cash); receipt available
 * `reviewed`   — farmer review submitted
 * `cancelled`  — buyer or farmer cancelled
 */
export type RequestStage =
  | 'pending'
  | 'accepted'
  | 'scheduled'
  | 'inspected'
  | 'completed'
  | 'reviewed'
  | 'cancelled';

/** The five milestones shown in the "Progreso ng Transaksyon" tracker. */
export type ProgressStepKey =
  | 'sent'
  | 'accepted'
  | 'pickup'
  | 'pickup_inspeksyon'
  | 'payment'
  | 'review'
  | 'kahilingan'
  | 'tinanggap'
  | 'bayad';

export type ProgressStep = {
  key: ProgressStepKey;
  label: string;
  /** Timestamp or hint shown under the label. */
  detail: string;
  /** Optional extra line above `detail` (e.g. "Jul 30, 2026 9:15 AM"). */
  timestamp?: string;
  state: 'done' | 'current' | 'upcoming' | 'failed';
};

export type Farmer = {
  name: string;
  initials: string;
  phone: string;
  /** e.g. "Magsasaka · Coop-Verified" */
  role: string;
  verified: boolean;
  addressLine: string;
  addressDetail: string;
  distanceKm: number;
};

export type InspectionCheck = {
  label: string;
  detail: string;
  passed: boolean;
};

export type PaymentMethod = 'gcash' | 'cash';

export type PaymentRecord = {
  label: string;
  amount: number;
  method: PaymentMethod;
  /** Display timestamp, e.g. "Okt 18, 2025 · 11:42 AM". */
  paidAt: string;
  /** Reference number (e.g., GCash ref or cash note). */
  reference: string;
};

export type DiscrepancyReason =
  | 'Mas mababa/mataas ang timbang'
  | 'Magkaiba ang grade'
  | 'Iba ang variant'
  | 'Iba pa';

export type PaymentDiscrepancy = {
  agreedAmount: number;
  actualAmount: number;
  difference: number;
  reason?: DiscrepancyReason;
  explanation?: string;
};

export type FarmerReview = {
  overallRating: number;
  detailedRatings: {
    quality: number;
    weight: number;
    communication: number;
    timeliness: number;
  };
  comment?: string;
  isAnonymous: boolean;
  submittedAt?: string;
};

export type PurchaseRequest = {
  id: string;
  /** Human-facing transaction reference, e.g. "TXN-2025-0418-0092". */
  reference: string;
  listingId: string;
  variety: string;
  quantityKg: number;
  pricePerKg: number;
  stage: RequestStage;
  farmer: Farmer;
  buyerName?: string;
  /** Display timestamp the request was sent. */
  sentAt: string;
  /** Display timestamp the farmer accepted, once they have. */
  acceptedAt?: string;
  /** Scheduled pickup window. */
  pickup?: {
    date: string;
    timeWindow: string;
    addressLine: string;
    addressDetail: string;
  };
  inspection?: {
    summary: string;
    checks: InspectionCheck[];
    actualKg?: number;
  };
  payments: PaymentRecord[];
  discrepancy?: PaymentDiscrepancy;
  review?: FarmerReview;
  /** Why the request was cancelled, when it was. */
  cancelReason?: string;
  cancelledAt?: string;
};

/** Total for a request, before any adjustments. */
export function requestTotal(request: PurchaseRequest): number {
  return request.quantityKg * request.pricePerKg;
}

/** Sum of everything the buyer has paid. */
export function amountPaid(request: PurchaseRequest): number {
  return request.payments.reduce((sum, p) => sum + p.amount, 0);
}

/** What remains due on pickup. */
export function balanceDue(request: PurchaseRequest): number {
  const total = requestTotal(request);
  const paid = amountPaid(request);
  return Math.max(0, total - paid);
}

/* ---------------- Cancellation policy ---------------- */

export type CancelPolicy = {
  /** Whether the buyer can still back out at this stage. */
  allowed: boolean;
  /** Confirmation headline. */
  title: string;
  /** What cancelling does. */
  body: string;
  /** Consequence lines shown in the confirmation sheet. */
  consequences: string[];
  /** Label for the destructive button. */
  confirmLabel: string;
  /** Label for the footer link that opens the sheet. */
  triggerLabel: string;
};

export function cancelPolicy(request: PurchaseRequest): CancelPolicy {
  switch (request.stage) {
    case 'pending':
      return {
        allowed: true,
        title: 'Kanselahin ang order?',
        body: 'Hindi pa tinanggap ng magsasaka ang order na ito, kaya wala kang babayaran.',
        consequences: [
          'Walang parusa o bayad sa pagkansela.',
          'Muling ilalista ang palay para sa ibang mamimili.',
          'Maaari kang bumili muli anumang oras.',
        ],
        confirmLabel: 'Kanselahin ang Order',
        triggerLabel: 'Kanselahin ang Order',
      };

    case 'accepted':
    case 'scheduled':
      return {
        allowed: true,
        title: 'Kanselahin ang transaksyon?',
        body: 'Nakahanda ang magsasaka para sa pickup at inspeksyon.',
        consequences: [
          'Aabisuhan ang magsasaka sa pagkansela.',
          'Muling ilalista ang palay para sa ibang mamimili.',
          'Kakanselahin ang nakatakdang iskedyul ng pickup.',
        ],
        confirmLabel: 'Ituloy ang Pagkansela',
        triggerLabel: 'Kanselahin ang Transaksyon',
      };

    case 'inspected':
      return {
        allowed: true,
        title: 'Kanselahin ang transaksyon?',
        body: 'Na-inspeksyon na ang palay ngunit hindi pa nababayaran.',
        consequences: [
          'Aabisuhan ang magsasaka na hindi itutuloy ang pagbili.',
          'Maaaring may ulat sa dahilan ng hindi pagtuloy.',
        ],
        confirmLabel: 'Kanselahin ang Transaksyon',
        triggerLabel: 'Kanselahin ang Transaksyon',
      };

    case 'completed':
    case 'reviewed':
      return {
        allowed: false,
        title: 'Kailangan ng dispute',
        body: 'Bayad na nang buo ang transaksyong ito, kaya hindi na ito maaaring kanselahin.',
        consequences: [
          'Maghain ng dispute kung may problema sa natanggap na palay.',
          'Ihanda ang resibo at larawan ng palay bilang ebidensya.',
          'Rerepasuhin ng ANIMO ang dispute sa loob ng 3 araw ng trabaho.',
        ],
        confirmLabel: 'Maghain ng Dispute',
        triggerLabel: 'May problema sa order na ito?',
      };

    case 'cancelled':
      return {
        allowed: false,
        title: 'Nakansela na ang transaksyon',
        body: 'Wala nang aksyon na maaaring gawin sa transaksyong ito.',
        consequences: [],
        confirmLabel: '',
        triggerLabel: '',
      };
  }
}

/** Locations in Antipolo and Rizal. */
export const DELIVERY_LOCATIONS: MunicipalityName[] = ['Antipolo', 'Teresa', 'Tanay', 'Baras'];

export const LISTINGS: Listing[] = [
  {
    id: 'l-rc160',
    variety: 'Palay RC160',
    availableKg: 500,
    pricePerKg: 16.0,
    estimated: true,
    municipality: 'Antipolo',
    province: 'Rizal',
    barangay: 'Barangay San Jose',
    priceLocked: true,
  },
  {
    id: 'l-rc638',
    variety: 'Palay RC 638 SR',
    availableKg: 200,
    pricePerKg: 15.5,
    estimated: false,
    municipality: 'Antipolo',
    province: 'Rizal',
    barangay: 'Barangay Dela Paz',
    priceLocked: true,
  },
  {
    id: 'l-nsic222',
    variety: 'Palay NSIC Rc222',
    availableKg: 350,
    pricePerKg: 15.2,
    estimated: false,
    municipality: 'Teresa',
    province: 'Rizal',
    barangay: 'Barangay San Roque',
    priceLocked: true,
  },
];

export function getListing(id: string | undefined): Listing | undefined {
  return LISTINGS.find((l) => l.id === id);
}

export const TRANSACTIONS: Transaction[] = [
  {
    id: 't-1',
    variety: 'Palay RC160',
    municipality: 'Antipolo',
    province: 'Rizal',
    quantityKg: 500,
    total: 8000,
    date: 'Oktubre 18, 2025',
    status: 'aktibo',
    farmerName: 'Juan Dela Cruz',
    reference: 'TXN-2025-0418-0094',
  },
  {
    id: 't-2',
    variety: 'Palay RC 638 SR',
    municipality: 'Antipolo',
    province: 'Rizal',
    quantityKg: 150,
    total: 2325,
    date: 'Hulyo 18, 2026',
    status: 'tapos',
    farmerName: 'Pedro Ramos',
    reference: 'TXN-2025-0320-0081',
  },
  {
    id: 't-3',
    variety: 'Palay NSIC Rc222',
    municipality: 'Teresa',
    province: 'Rizal',
    quantityKg: 300,
    total: 4560,
    date: 'Hulyo 10, 2026',
    status: 'cancelled',
    farmerName: 'Mateo Gomez',
    reference: 'TXN-2025-0215-0044',
  },
  {
    id: 't-4',
    variety: 'Palay RC160',
    municipality: 'Antipolo',
    province: 'Rizal',
    quantityKg: 250,
    total: 3875,
    date: 'Hunyo 28, 2026',
    status: 'tapos',
    farmerName: 'Juan Dela Cruz',
    reference: 'TXN-2025-0112-0021',
  },
  {
    id: 't-5',
    variety: 'Palay RC 216',
    municipality: 'Baras',
    province: 'Rizal',
    quantityKg: 100,
    total: 1520,
    date: 'Hunyo 15, 2026',
    status: 'tapos',
    farmerName: 'Jose Reyes',
    reference: 'TXN-2024-1205-0012',
  },
];

/** Format a peso amount like "₱8,000.00". */
export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** The farmer behind the mock requests. */
const JUAN: Farmer = {
  name: 'Juan Dela Cruz',
  initials: 'JD',
  phone: '0917 123 4567',
  role: 'Magsasaka · Coop-Verified',
  verified: true,
  addressLine: 'Bukid 1A, Brgy. San Jose',
  addressDetail: 'Antipolo, Rizal · 3.2 km mula sa iyo',
  distanceKm: 3.2,
};

/**
 * Mock purchase requests — one per stage in the new buyer flow.
 */
export const PURCHASE_REQUESTS: PurchaseRequest[] = [
  {
    id: 'pr-pending',
    reference: 'TXN-2025-0418-0092',
    listingId: 'l-rc160',
    variety: 'Palay RC160',
    quantityKg: 500,
    pricePerKg: 16.0,
    stage: 'pending',
    farmer: JUAN,
    buyerName: 'Maria Santos',
    sentAt: 'Okt 12, 2025 · 09:00 AM',
    payments: [],
  },
  {
    id: 'pr-accepted',
    reference: 'TXN-2025-0418-0093',
    listingId: 'l-rc160',
    variety: 'Palay RC160',
    quantityKg: 500,
    pricePerKg: 16.0,
    stage: 'accepted',
    farmer: JUAN,
    buyerName: 'Maria Santos',
    sentAt: 'Okt 12, 2025 · 09:00 AM',
    acceptedAt: 'Okt 12, 2025 · 09:00 AM',
    payments: [],
  },
  {
    id: 'pr-scheduled',
    reference: 'TXN-2025-0418-0094',
    listingId: 'l-rc160',
    variety: 'Palay RC160',
    quantityKg: 500,
    pricePerKg: 16.0,
    stage: 'scheduled',
    farmer: JUAN,
    buyerName: 'Maria Santos',
    sentAt: 'Okt 12, 2025 · 09:00 AM',
    acceptedAt: 'Okt 12, 2025 · 09:00 AM',
    pickup: {
      date: 'Sabado, Okt 18, 2025',
      timeWindow: '8:00 AM - 10:00 AM',
      addressLine: 'Bukid 1A, Brgy. San Jose',
      addressDetail: 'Antipolo, Rizal · 3.2 km mula sa iyo',
    },
    inspection: {
      summary: '500 kg na aktwal na timbang',
      checks: [
        { label: 'Uri ng palay', detail: 'Palay RC160', passed: true },
        { label: 'Bilang ng sako', detail: '10 sako × 50 kg', passed: true },
        { label: 'Aktwal na timbang', detail: '500 kg', passed: true },
      ],
    },
    payments: [],
  },
  {
    id: 'pr-inspected',
    reference: 'TXN-2025-0418-0095',
    listingId: 'l-rc160',
    variety: 'Palay RC160',
    quantityKg: 500,
    pricePerKg: 16.0,
    stage: 'inspected',
    farmer: JUAN,
    buyerName: 'Maria Santos',
    sentAt: 'Okt 12, 2025 · 09:00 AM',
    acceptedAt: 'Okt 12, 2025 · 09:00 AM',
    pickup: {
      date: 'Sabado, Okt 18, 2025',
      timeWindow: '8:00 AM - 10:00 AM',
      addressLine: 'Bukid 1A, Brgy. San Jose',
      addressDetail: 'Antipolo, Rizal · 3.2 km mula sa iyo',
    },
    inspection: {
      summary: 'Pasado ang inspeksyon — 500 kg na aktwal na timbang',
      checks: [
        { label: 'Uri ng palay', detail: 'Palay RC160', passed: true },
        { label: 'Bilang ng sako', detail: '10 sako × 50 kg', passed: true },
        { label: 'Aktwal na timbang', detail: '500 kg · tugma sa nakalista', passed: true },
      ],
      actualKg: 500,
    },
    payments: [],
  },
  {
    id: 'pr-completed',
    reference: 'TXN-2025-0418-0092',
    listingId: 'l-rc160',
    variety: 'Palay RC160',
    quantityKg: 500,
    pricePerKg: 16.0,
    stage: 'completed',
    farmer: JUAN,
    buyerName: 'Maria Santos',
    sentAt: 'Okt 12, 2025 · 09:00 AM',
    acceptedAt: 'Okt 12, 2025 · 09:00 AM',
    pickup: {
      date: 'Sabado, Okt 18, 2025',
      timeWindow: '8:00 AM - 10:00 AM',
      addressLine: 'Bukid 1A, Brgy. San Jose',
      addressDetail: 'Antipolo, Rizal · 3.2 km mula sa iyo',
    },
    inspection: {
      summary: 'Pasado ang inspeksyon — 500 kg',
      checks: [
        { label: 'Uri ng palay', detail: 'Palay RC160', passed: true },
        { label: 'Bilang ng sako', detail: '10 sako × 50 kg', passed: true },
        { label: 'Aktwal na timbang', detail: '500 kg · tugma sa nakalista', passed: true },
      ],
      actualKg: 500,
    },
    payments: [
      {
        label: 'Buong Bayad (GCash)',
        amount: 8000,
        method: 'gcash',
        paidAt: 'Okt 18, 2025 · 11:42 AM',
        reference: 'GC-8846702',
      },
    ],
  },
  {
    id: 'pr-cancelled',
    reference: 'TXN-2025-0418-0097',
    listingId: 'l-rc160',
    variety: 'Palay RC160',
    quantityKg: 500,
    pricePerKg: 16.0,
    stage: 'cancelled',
    farmer: JUAN,
    buyerName: 'Maria Santos',
    sentAt: 'Okt 12, 2025 · 09:00 AM',
    acceptedAt: 'Okt 12, 2025 · 09:00 AM',
    cancelReason: 'Kinansela ng mamimili bago ang inspeksyon',
    cancelledAt: 'Okt 15, 2025 · 09:01 AM',
    payments: [],
  },
];

export function getPurchaseRequest(
  id: string | undefined,
): PurchaseRequest | undefined {
  return PURCHASE_REQUESTS.find((r) => r.id === id);
}

/* ---------------- Farmer transaksyon (direct pay, in-person pickup) ---------------- */

export type MoistureLevel = 'Tuyo' | 'Basa';

export type FarmerTransactionStage =
  | 'pending'
  | 'accepted'
  | 'awaiting_payment'
  | 'awaiting_pickup'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type BuyerParty = {
  name: string;
  phone: string;
};

export type FarmerTransaction = {
  id: string;
  reference: string;
  buyer: BuyerParty;
  variety: string;
  moisture: MoistureLevel;
  quantityKg: number;
  total: number;
  paymentMethod: PaymentMethod;
  stage: FarmerTransactionStage;
  sentAt: string;
};

export const ONGOING_FARMER_STAGES: FarmerTransactionStage[] = [
  'pending',
  'accepted',
  'awaiting_payment',
  'awaiting_pickup',
];

export function farmerListingLine(tx: FarmerTransaction): string {
  return `${tx.variety} · ${tx.moisture} · ${tx.quantityKg} kg`;
}

export function paymentMethodLabel(method: PaymentMethod): string {
  return method === 'cash' ? 'Cash' : 'GCash';
}

export function farmerStageBadge(stage: FarmerTransactionStage): {
  label: string;
  tone: 'info' | 'success' | 'warning' | 'mild' | 'danger' | 'neutral';
} {
  switch (stage) {
    case 'pending':
      return { label: 'Naghihintay ng sagot', tone: 'warning' };
    case 'accepted':
    case 'awaiting_payment':
      return { label: 'Naghihintay ng bayad', tone: 'info' };
    case 'awaiting_pickup':
      return { label: 'Naghihintay ng pickup', tone: 'mild' };
    case 'completed':
      return { label: 'Tapos na', tone: 'success' };
    case 'cancelled':
      return { label: 'Nakansela', tone: 'neutral' };
    case 'failed':
      return { label: 'Hindi natuloy', tone: 'danger' };
  }
}

const MATEO: BuyerParty = { name: 'Mateo Santos', phone: '0921 345 6789' };
const ALING: BuyerParty = { name: 'Aling Coring Rice Mill', phone: '0917 890 1234' };
const TRES: BuyerParty = { name: 'Tres Rice Mill Corp', phone: '0918 555 2211'};
const RIRI: BuyerParty = { name: 'Riri Circulado Rice Corp', phone: '0918 114 2211'};
const NENA: BuyerParty = { name: 'Aling Nena Rice Mill', phone: '0917 890 1234'};

export const FARMER_TRANSACTIONS: FarmerTransaction[] = [
  {
    id: 'ft-pending',
    reference: 'TXN-2026-0071',
    buyer: MATEO,
    variety: 'Rc218',
    moisture: 'Tuyo',
    quantityKg: 300,
    total: 6300,
    paymentMethod: 'gcash',
    stage: 'pending',
    sentAt: 'Jul 30, 2026 9:15 AM',
  },
  {
    id: 'ft-payment',
    reference: 'TXN-2026-0072',
    buyer: ALING,
    variety: 'Rc218',
    moisture: 'Tuyo',
    quantityKg: 200,
    total: 3000,
    paymentMethod: 'gcash',
    stage: 'awaiting_payment',
    sentAt: 'Jul 30, 2026 9:15 AM',
  },
  {
    id: 'ft-pickup',
    reference: 'TXN-2026-0073',
    buyer: TRES,
    variety: 'Rc 638 SR',
    moisture: 'Basa',
    quantityKg: 250,
    total: 3875,
    paymentMethod: 'cash',
    stage: 'awaiting_pickup',
    sentAt: 'Jul 28, 2026 2:40 PM',
  },
  {
    id: 'ft-completed',
    reference: 'TXN-2026-0074',
    buyer: MATEO,
    variety: 'Rc218',
    moisture: 'Tuyo',
    quantityKg: 300,
    total: 3000,
    paymentMethod: 'gcash',
    stage: 'completed',
    sentAt: 'Jul 30, 2026 9:15 AM',
  },
  {
    id: 'ft-pending-riri',
    reference: 'TXN-2026-0075',
    buyer: RIRI,
    variety: 'Rc218',
    moisture: 'Tuyo',
    quantityKg: 300,
    total: 3000,
    paymentMethod: 'gcash',
    stage: 'pending',
    sentAt: 'Jul 30, 2026 9:15 AM',
  },
  {
    id: 'ft-pending-nena',
    reference: 'TXN-2026-0076',
    buyer: NENA,
    variety: 'Rc218',
    moisture: 'Tuyo',
    quantityKg: 300,
    total: 3000,
    paymentMethod: 'gcash',
    stage: 'pending',
    sentAt: 'Jul 30, 2026 9:15 AM',
  },
  {
    id: 'ft-schedule',
    reference: 'TXN-2026-0077',
    buyer: TRES,
    variety: 'Rc222',
    moisture: 'Basa',
    quantityKg: 300,
    total: 4500,
    paymentMethod: 'gcash',
    stage: 'accepted',
    sentAt: 'Jul 29, 2026 2:40 PM',
  },
  {
    id: 'ft-cancelled',
    reference: 'TXN-2026-0061',
    buyer: NENA,
    variety: 'Dinorado',
    moisture: 'Basa',
    quantityKg: 150,
    total: 2400,
    paymentMethod: 'cash',
    stage: 'cancelled',
    sentAt: 'Jul 18, 2026 3:10 PM',
  },
  {
    id: 'ft-failed',
    reference: 'TXN-2026-0055',
    buyer: { name: 'Bulacan Rice Traders', phone: '0917 222 3344' },
    variety: 'Rc222',
    moisture: 'Tuyo',
    quantityKg: 250,
    total: 3750,
    paymentMethod: 'gcash',
    stage: 'failed',
    sentAt: 'Jul 12, 2026 1:45 PM',
  },
];

export function getFarmerTransaction(
  id: string | undefined,
): FarmerTransaction | undefined {
  return FARMER_TRANSACTIONS.find((t) => t.id === id);
}

export function updateFarmerTransactionStage(
  id: string,
  stage: FarmerTransactionStage,
): FarmerTransaction | undefined {
  const tx = FARMER_TRANSACTIONS.find((t) => t.id === id);
  if (!tx) return undefined;
  tx.stage = stage;
  return { ...tx, buyer: { ...tx.buyer } };
}

/**
 * Four-step farmer tracker: Kahilingan → Tinanggap → Bayad → Pickup.
 * Direct pay, in-person pickup — no courier or escrow copy.
 */
export function farmerProgressSteps(tx: FarmerTransaction): ProgressStep[] {
  const { stage } = tx;
  const isCancelled = stage === 'cancelled' || stage === 'failed';
  const accepted = stage !== 'pending' && !isCancelled;
  const inspectionDone = stage === 'awaiting_payment' || stage === 'completed';
  const paymentDone = stage === 'completed';
  const isReviewStage = stage === 'completed';

  return [
    {
      key: 'kahilingan',
      label: 'Kahilingan',
      detail: tx.sentAt || 'Naipadala ang purchase request',
      state: isCancelled && stage === 'failed' ? 'failed' : 'done',
    },
    {
      key: 'tinanggap',
      label: 'Tinanggap ng Magsasaka',
      detail: accepted
        ? 'Tinanggap ang kahilingan. Makikita na ang contact details.'
        : 'Naghihintay ng iyong pagtanggap upang simulan ang proseso.',
      state: isCancelled
        ? 'failed'
        : accepted
          ? 'done'
          : stage === 'pending'
            ? 'current'
            : 'upcoming',
    },
    {
      key: 'pickup_inspeksyon',
      label: 'Iskedyul at Inspeksyon',
      detail: isCancelled
        ? 'Hindi natuloy'
        : inspectionDone
          ? 'Pumasa sa inspeksyon at nakuha ang palay.'
          : stage === 'accepted' || stage === 'awaiting_pickup'
            ? 'Pag-apruba sa oras at inspeksyon sa bukid.'
            : 'Nakatakda sa bukid.',
      state: isCancelled
        ? 'failed'
        : inspectionDone
          ? 'done'
          : stage === 'accepted' || stage === 'awaiting_pickup'
            ? 'current'
            : 'upcoming',
    },
    {
      key: 'bayad',
      label: 'Bayad mula sa Mamimili',
      detail: isCancelled
        ? 'Walang bayad'
        : paymentDone
          ? 'Natanggap at nakumpirma ang buong bayad.'
          : stage === 'awaiting_payment'
            ? 'Kumpirmahin kapag natanggap na ang bayad (GCash / Cash).'
            : 'Kasunod ng inspeksyon.',
      state: isCancelled
        ? 'upcoming'
        : paymentDone
          ? 'done'
          : stage === 'awaiting_payment'
            ? 'current'
            : 'upcoming',
    },
    {
      key: 'review',
      label: 'Review sa Mamimili',
      detail: isReviewStage
        ? 'Maaari nang magbigay ng rating at pagsusuri sa mamimili.'
        : 'Huling hakbang pagkatapos ng transaksyon.',
      state: isReviewStage ? 'current' : 'upcoming',
    },
  ];
}

/**
 * Build the five-step progress tracker for a request in the new flow:
 * 1. Request naipadala
 * 2. Tinanggap ng magsasaka
 * 3. Pickup at inspeksyon
 * 4. Bayad sa magsasaka
 * 5. Review sa magsasaka
 */
export function progressSteps(request: PurchaseRequest): ProgressStep[] {
  const { stage } = request;
  const isCancelled = stage === 'cancelled';

  const accepted = stage !== 'pending';
  const inspectedOrBeyond = ['inspected', 'completed', 'reviewed'].includes(stage);
  const paid = ['completed', 'reviewed'].includes(stage);
  const reviewed = stage === 'reviewed';

  return [
    {
      key: 'sent',
      label: 'Request naipadala',
      detail: request.sentAt,
      state: 'done',
    },
    {
      key: 'accepted',
      label: accepted ? 'Tinanggap ng magsasaka' : 'Pag-accept ng magsasaka',
      detail: accepted ? (request.acceptedAt ?? 'Okt 12, 09:00 AM') : 'Naghihintay…',
      state: accepted ? 'done' : 'current',
    },
    {
      key: 'pickup',
      label: 'Pickup at inspeksyon',
      detail: isCancelled
        ? 'Hindi natuloy'
        : inspectedOrBeyond
          ? 'Tapos · Okt 18, 09:20 AM'
          : stage === 'scheduled' || stage === 'accepted'
            ? 'Ginagawa ngayon · Okt 18'
            : 'Sa bukid',
      state: isCancelled
        ? 'failed'
        : inspectedOrBeyond
          ? 'done'
          : stage === 'scheduled' || stage === 'accepted'
            ? 'current'
            : 'upcoming',
    },
    {
      key: 'payment',
      label: 'Bayad sa magsasaka',
      detail: isCancelled
        ? 'Hindi natuloy'
        : paid
          ? `Bayad (${request.payments[0]?.method === 'cash' ? 'Cash' : 'GCash'}) · ${request.payments[0]?.paidAt ?? 'Okt 18, 11:42 AM'}`
          : stage === 'inspected'
            ? 'Isinasagawa ngayon'
            : 'Pagkatapos ng inspeksyon',
      state: isCancelled
        ? 'upcoming'
        : paid
          ? 'done'
          : stage === 'inspected'
            ? 'current'
            : 'upcoming',
    },
    {
      key: 'review',
      label: 'Review sa magsasaka',
      detail: isCancelled
        ? 'Hindi natuloy'
        : reviewed
          ? 'Tapos na ang review'
          : paid
            ? 'Susunod na hakbang'
            : 'Huling hakbang',
      state: isCancelled
        ? 'upcoming'
        : reviewed
          ? 'done'
          : paid
            ? 'current'
            : 'upcoming',
    },
  ];
}
