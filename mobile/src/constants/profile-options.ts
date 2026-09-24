import type { SelectOption } from '@/components/animo/select-field';

/**
 * Static option lists for the registration profile form.
 *
 * Placeholder data for frontend development — barangays would come from an
 * API keyed by location once the backend exists.
 */

export const BARANGAYS: SelectOption[] = [
  { value: 'bagong-nayon', label: 'Bagong Nayon' },
  { value: 'beverly-hills', label: 'Beverly Hills' },
  { value: 'calawis', label: 'Calawis' },
  { value: 'cupang', label: 'Cupang' },
  { value: 'dalig', label: 'Dalig' },
  { value: 'dela-paz', label: 'Dela Paz' },
  { value: 'inarawan', label: 'Inarawan' },
  { value: 'mambugan', label: 'Mambugan' },
  { value: 'mayamot', label: 'Mayamot' },
  { value: 'muntingdilaw', label: 'Muntingdilaw' },
  { value: 'san-isidro', label: 'San Isidro' },
  { value: 'san-jose', label: 'San Jose' },
  { value: 'san-juan', label: 'San Juan' },
  { value: 'san-luis', label: 'San Luis' },
  { value: 'san-roque', label: 'San Roque' },
  { value: 'santa-cruz', label: 'Santa Cruz' },
];

export const FARM_SIZES: SelectOption[] = [
  { value: 'lt-0.5', label: 'Wala pang 0.5 ektarya' },
  { value: '0.5-1', label: '0.5 hanggang 1 ektarya' },
  { value: '1-3', label: '1 hanggang 3 ektarya' },
  { value: '3-5', label: '3 hanggang 5 ektarya' },
  { value: 'gt-5', label: 'Higit sa 5 ektarya' },
];

export const FARM_SIZES_EN: SelectOption[] = [
  { value: 'lt-0.5', label: 'Less than 0.5 hectare' },
  { value: '0.5-1', label: '0.5 to 1 hectare' },
  { value: '1-3', label: '1 to 3 hectares' },
  { value: '3-5', label: '3 to 5 hectares' },
  { value: 'gt-5', label: 'More than 5 hectares' },
];

export function getFarmSizes(lang: 'tl' | 'en' | boolean = 'tl'): SelectOption[] {
  const isTagalog = typeof lang === 'boolean' ? lang : lang === 'tl';
  return isTagalog ? FARM_SIZES : FARM_SIZES_EN;
}

export const PALAY_VARIETIES: SelectOption[] = [
  { value: 'inbred', label: 'Inbred' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'traditional-heirloom', label: 'Tradisyonal o Pamana' },
  { value: 'mixed', label: 'Halo-halong Uri' },
  { value: 'other', label: 'Iba Pa' },
];

export const PALAY_VARIETIES_EN: SelectOption[] = [
  { value: 'inbred', label: 'Inbred' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'traditional-heirloom', label: 'Traditional or Heirloom' },
  { value: 'mixed', label: 'Mixed Varieties' },
  { value: 'other', label: 'Other' },
];

export function getPalayVarieties(lang: 'tl' | 'en' | boolean = 'tl'): SelectOption[] {
  const isTagalog = typeof lang === 'boolean' ? lang : lang === 'tl';
  return isTagalog ? PALAY_VARIETIES : PALAY_VARIETIES_EN;
}
