/**
 * Marketplace domain model + mock data (frontend only).
 *
 * Once the backend exists these come from an API. Prices are set by the system
 * ("Nakatakda ng sistema"), not negotiable — see `Listing.priceLocked`.
 */

export type MunicipalityName = 'Baliwag' | 'Plaridel' | 'Pulilan';

export type Listing = {
  id: string;
  variety: string; // e.g. "Palay RC160"
  availableKg: number;
  pricePerKg: number;
  /** System-estimated price flag ("Tinantyang Presyo"). */
  estimated: boolean;
  moisturePct: number;
  purityGrade: string; // e.g. "Grade A (95%)"
  municipality: MunicipalityName;
  province: string; // e.g. "Bulacan"
  barangay: string;
  /** Prices are computed by ANIMO and cannot be negotiated. */
  priceLocked: boolean;
};

export type TransactionStatus = 'aktibo' | 'tapos' | 'disputed';

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
};

/* ---------------- Purchase request lifecycle ---------------- */

/**
 * Share of the total the buyer pays up front to hold the request.
 *
 * Single source of truth — the downpayment and remaining balance shown on every
 * screen derive from this, so changing the rate changes them all.
 */
export const DOWNPAYMENT_RATE = 0.5;

/** Days the buyer has to pay the downpayment before the request auto-cancels. */
export const DOWNPAYMENT_WINDOW_DAYS = 3;

/**
 * Stages a purchase request moves through, in order.
 *
 * `pending`    — sent, waiting for the farmer to accept
 * `accepted`   — farmer accepted; contact details unlocked
 * `downpaid`   — downpayment settled; pickup can be scheduled
 * `scheduled`  — pickup + inspection booked
 * `inspected`  — palay inspected on the farm, ready for final payment
 * `completed`  — paid in full; receipt available
 * `cancelled`  — buyer cancelled, or the downpayment window lapsed
 */
export type RequestStage =
  | 'pending'
  | 'accepted'
  | 'downpaid'
  | 'scheduled'
  | 'inspected'
  | 'completed'
  | 'cancelled';

/** The five milestones shown in the "Progreso ng Transaksyon" tracker. */
export type ProgressStepKey =
  | 'sent'
  | 'accepted'
  | 'downpayment'
  | 'pickup'
  | 'final';

export type ProgressStep = {
  key: ProgressStepKey;
  label: string;
  /** Timestamp or hint shown under the label. */
  detail: string;
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

export type PaymentRecord = {
  label: string;
  amount: number;
  /** Display timestamp, e.g. "Okt 13, 2025 · 02:10 PM". */
  paidAt: string;
  /** GCash reference number. */
  reference: string;
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
  /** Display timestamp the request was sent. */
  sentAt: string;
  /** Display timestamp the farmer accepted, once they have. */
  acceptedAt?: string;
  /** Deadline for the downpayment, e.g. "Okt 15, 2025 · 09:00 AM". */
  downpaymentDeadline?: string;
  /** Countdown to that deadline, pre-formatted for the mock. */
  downpaymentCountdown?: string;
  /** Scheduled pickup window. */
  pickup?: {
    date: string;
    timeWindow: string;
    addressLine: string;
    addressDetail: string;
  };
  inspection?: {
    /** Summary line, e.g. "14.0% moisture, Grade A, 500 kg". */
    summary: string;
    checks: InspectionCheck[];
    /** Weight confirmed on the farm; may differ from the listed quantity. */
    actualKg?: number;
  };
  payments: PaymentRecord[];
  /** Why the request was cancelled, when it was. */
  cancelReason?: string;
  cancelledAt?: string;
};

/** Total for a request, before any payments. */
export function requestTotal(request: PurchaseRequest): number {
  return request.quantityKg * request.pricePerKg;
}

/** Amount due up front, derived from `DOWNPAYMENT_RATE`. */
export function downpaymentAmount(request: PurchaseRequest): number {
  return requestTotal(request) * DOWNPAYMENT_RATE;
}

/** Sum of everything the buyer has paid so far. */
export function amountPaid(request: PurchaseRequest): number {
  return request.payments.reduce((sum, p) => sum + p.amount, 0);
}

/** What remains due on pickup. */
export function balanceDue(request: PurchaseRequest): number {
  return requestTotal(request) - amountPaid(request);
}

/** Whole-number percentage for labels like "Downpayment (50%)". */
export const DOWNPAYMENT_PCT = Math.round(DOWNPAYMENT_RATE * 100);

/** Delivery locations a buyer may choose from. */
export const DELIVERY_LOCATIONS: MunicipalityName[] = ['Baliwag', 'Plaridel', 'Pulilan'];

export const LISTINGS: Listing[] = [
  {
    id: 'l-rc160',
    variety: 'Palay RC160',
    availableKg: 500,
    pricePerKg: 16.0,
    estimated: true,
    moisturePct: 14.0,
    purityGrade: 'Grade A (95%)',
    municipality: 'Baliwag',
    province: 'Bulacan',
    barangay: 'Barangay Sabang',
    priceLocked: true,
  },
  {
    id: 'l-rc638',
    variety: 'Palay RC 638 SR',
    availableKg: 200,
    pricePerKg: 15.5,
    estimated: false,
    moisturePct: 13.5,
    purityGrade: 'Grade A (92%)',
    municipality: 'Plaridel',
    province: 'Bulacan',
    barangay: 'Barangay Bintog',
    priceLocked: true,
  },
  {
    id: 'l-nsic222',
    variety: 'Palay NSIC Rc222',
    availableKg: 350,
    pricePerKg: 15.2,
    estimated: false,
    moisturePct: 13.8,
    purityGrade: 'Grade A (90%)',
    municipality: 'Pulilan',
    province: 'Bulacan',
    barangay: 'Barangay Dampol',
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
    municipality: 'Baliwag',
    province: 'Bulacan',
    quantityKg: 200,
    total: 3200,
    date: 'Hulyo 25, 2026',
    status: 'aktibo',
  },
  {
    id: 't-2',
    variety: 'Palay RC 638 SR',
    municipality: 'Plaridel',
    province: 'Bulacan',
    quantityKg: 150,
    total: 2325,
    date: 'Hulyo 18, 2026',
    status: 'tapos',
  },
  {
    id: 't-3',
    variety: 'Palay NSIC Rc222',
    municipality: 'Pulilan',
    province: 'Bulacan',
    quantityKg: 300,
    total: 4560,
    date: 'Hulyo 10, 2026',
    status: 'disputed',
  },
  {
    id: 't-4',
    variety: 'Palay RC160',
    municipality: 'Baliwag',
    province: 'Bulacan',
    quantityKg: 250,
    total: 3875,
    date: 'Hunyo 28, 2026',
    status: 'tapos',
  },
  {
    id: 't-5',
    variety: 'Palay RC 216',
    municipality: 'Plaridel',
    province: 'Bulacan',
    quantityKg: 100,
    total: 1520,
    date: 'Hunyo 15, 2026',
    status: 'tapos',
  },
];

/** Format a peso amount like "₱3,200.00". */
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
  addressDetail: 'Baliwag, Bulacan',
  distanceKm: 3.2,
};

/**
 * Mock purchase requests — one per stage so every screen in the buyer flow can
 * be reached from the transaction list.
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
    sentAt: 'Okt 12, 2025 · 09:00 AM',
    acceptedAt: 'Okt 12, 2025 · 09:00 AM',
    downpaymentDeadline: 'Okt 15, 2025 · 09:00 AM',
    downpaymentCountdown: '2 araw 23:45',
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
    sentAt: 'Okt 12, 2025 · 09:00 AM',
    acceptedAt: 'Okt 12, 2025 · 09:00 AM',
    pickup: {
      date: 'Sabado, Okt 18, 2025',
      timeWindow: '8:00 AM – 11:00 AM',
      addressLine: 'Bukid 1A, Brgy. San Jose',
      addressDetail: 'Baliwag, Bulacan · 3.2 km mula sa iyo',
    },
    inspection: {
      summary: '14.0% moisture, Grade A, 500 kg na aktwal na timbang',
      checks: [
        { label: 'Moisture content', detail: '14.0% · pasado (≤14%)', passed: true },
        { label: 'Purity / grade', detail: 'Grade A · walang halong dayami', passed: true },
        { label: 'Bilang ng sako', detail: '10 sako × 50 kg', passed: true },
        { label: 'Aktwal na timbang', detail: 'Hindi pa natitimbang', passed: false },
      ],
    },
    payments: [
      {
        label: `Downpayment (${DOWNPAYMENT_PCT}%)`,
        amount: 500 * 16.0 * DOWNPAYMENT_RATE,
        paidAt: 'Okt 13, 2025 · 02:10 PM',
        reference: 'GC-8842190',
      },
    ],
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
    sentAt: 'Okt 12, 2025 · 09:00 AM',
    acceptedAt: 'Okt 12, 2025 · 09:00 AM',
    pickup: {
      date: 'Sabado, Okt 18, 2025',
      timeWindow: '8:00 AM – 11:00 AM',
      addressLine: 'Bukid 1A, Brgy. San Jose',
      addressDetail: 'Baliwag, Bulacan · 3.2 km mula sa iyo',
    },
    inspection: {
      summary: 'Pasado ang inspeksyon — 14.0% moisture, Grade A, 500 kg na aktwal na timbang',
      checks: [
        { label: 'Moisture content', detail: '14.0% · pasado (≤14%)', passed: true },
        { label: 'Purity / grade', detail: 'Grade A · walang halong dayami', passed: true },
        { label: 'Bilang ng sako', detail: '10 sako × 50 kg', passed: true },
        { label: 'Aktwal na timbang', detail: '500 kg · tugma sa nakalista', passed: true },
      ],
      actualKg: 500,
    },
    payments: [
      {
        label: `Downpayment (${DOWNPAYMENT_PCT}%)`,
        amount: 500 * 16.0 * DOWNPAYMENT_RATE,
        paidAt: 'Okt 13, 2025 · 02:10 PM',
        reference: 'GC-8842190',
      },
    ],
  },
  {
    id: 'pr-completed',
    reference: 'TXN-2025-0418-0096',
    listingId: 'l-rc160',
    variety: 'Palay RC160',
    quantityKg: 500,
    pricePerKg: 16.0,
    stage: 'completed',
    farmer: JUAN,
    sentAt: 'Okt 12, 2025 · 09:00 AM',
    acceptedAt: 'Okt 12, 2025 · 09:00 AM',
    pickup: {
      date: 'Sabado, Okt 18, 2025',
      timeWindow: '8:00 AM – 11:00 AM',
      addressLine: 'Bukid 1A, Brgy. San Jose',
      addressDetail: 'Baliwag, Bulacan · 3.2 km mula sa iyo',
    },
    inspection: {
      summary: 'Pasado ang inspeksyon — 14.0% moisture, Grade A, 500 kg',
      checks: [
        { label: 'Moisture content', detail: '14.0% · pasado (≤14%)', passed: true },
        { label: 'Purity / grade', detail: 'Grade A · walang halong dayami', passed: true },
        { label: 'Bilang ng sako', detail: '10 sako × 50 kg', passed: true },
        { label: 'Aktwal na timbang', detail: '500 kg · tugma sa nakalista', passed: true },
      ],
      actualKg: 500,
    },
    payments: [
      {
        label: `Downpayment (${DOWNPAYMENT_PCT}%)`,
        amount: 500 * 16.0 * DOWNPAYMENT_RATE,
        paidAt: 'Okt 13, 2025 · 02:10 PM',
        reference: 'GC-8842190',
      },
      {
        label: `Huling bayad (${100 - DOWNPAYMENT_PCT}%)`,
        amount: 500 * 16.0 * (1 - DOWNPAYMENT_RATE),
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
    sentAt: 'Okt 12, 2025 · 09:00 AM',
    acceptedAt: 'Okt 12, 2025 · 09:00 AM',
    downpaymentDeadline: 'Okt 15, 2025 · 09:00 AM',
    cancelReason: `Lumipas ang ${DOWNPAYMENT_WINDOW_DAYS}-araw na palugit`,
    cancelledAt: 'Okt 15, 2025 · 09:01 AM',
    payments: [],
  },
];

export function getPurchaseRequest(
  id: string | undefined,
): PurchaseRequest | undefined {
  return PURCHASE_REQUESTS.find((r) => r.id === id);
}

/**
 * Build the five-step progress tracker for a request.
 *
 * Steps before the current stage read as done, the active one as current, and
 * the rest as upcoming — except on a cancelled request, where the step that
 * lapsed is marked failed and everything after it never happened.
 */
export function progressSteps(request: PurchaseRequest): ProgressStep[] {
  const { stage } = request;
  const down = request.payments[0];
  const isCancelled = stage === 'cancelled';

  const accepted = stage !== 'pending';
  const downPaid = ['downpaid', 'scheduled', 'inspected', 'completed'].includes(stage);
  const pickedUp = ['inspected', 'completed'].includes(stage);
  const done = stage === 'completed';

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
      detail: accepted ? (request.acceptedAt ?? '') : 'Naghihintay…',
      state: accepted ? 'done' : 'current',
    },
    {
      key: 'downpayment',
      label: `Downpayment (${DOWNPAYMENT_PCT}%)`,
      detail: isCancelled
        ? `Hindi nabayaran · ${request.cancelledAt ?? ''}`
        : downPaid
          ? `Bayad · ${down?.paidAt ?? ''}`
          : accepted
            ? `Bayaran hanggang ${request.downpaymentDeadline ?? ''}`
            : `${DOWNPAYMENT_WINDOW_DAYS} araw mula sa pag-accept`,
      state: isCancelled
        ? 'failed'
        : downPaid
          ? 'done'
          : accepted
            ? 'current'
            : 'upcoming',
    },
    {
      key: 'pickup',
      label: 'Pickup at inspeksyon',
      detail: isCancelled
        ? 'Hindi natuloy'
        : pickedUp
          ? `Tapos · ${request.pickup?.date ?? ''}`
          : stage === 'scheduled'
            ? `${request.pickup?.date ?? ''} · ${request.pickup?.timeWindow ?? ''}`
            : 'Sa bukid',
      state: isCancelled
        ? 'upcoming'
        : pickedUp
          ? 'done'
          : stage === 'scheduled'
            ? 'current'
            : 'upcoming',
    },
    {
      key: 'final',
      label: 'Huling bayad',
      detail: isCancelled
        ? 'Hindi natuloy'
        : done
          ? `Bayad · ${request.payments[1]?.paidAt ?? ''}`
          : stage === 'inspected'
            ? 'Bayaran ngayon'
            : 'Parehong araw ng pickup',
      state: isCancelled
        ? 'upcoming'
        : done
          ? 'done'
          : stage === 'inspected'
            ? 'current'
            : 'upcoming',
    },
  ];
}
