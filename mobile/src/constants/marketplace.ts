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
