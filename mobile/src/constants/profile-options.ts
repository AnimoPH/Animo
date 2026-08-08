import type { SelectOption } from '@/components/animo/select-field';

/**
 * Static option lists for the registration profile form.
 *
 * Placeholder data for frontend development — municipalities/barangays would
 * come from an API keyed by location once the backend exists.
 */

export const MUNICIPALITIES: SelectOption[] = [
  { value: 'cabanatuan', label: 'Cabanatuan' },
  { value: 'gapan', label: 'Gapan' },
  { value: 'san-jose', label: 'San Jose' },
  { value: 'guimba', label: 'Guimba' },
  { value: 'talavera', label: 'Talavera' },
];

export const BARANGAYS: SelectOption[] = [
  { value: 'brgy-1', label: 'Barangay 1' },
  { value: 'brgy-2', label: 'Barangay 2' },
  { value: 'brgy-3', label: 'Barangay 3' },
  { value: 'brgy-4', label: 'Barangay 4' },
];

export const FARM_SIZES: SelectOption[] = [
  { value: 'lt-0.5', label: 'Wala pang 0.5 ektarya' },
  { value: '0.5-1', label: '0.5 hanggang 1 ektarya' },
  { value: '1-3', label: '1 hanggang 3 ektarya' },
  { value: '3-5', label: '3 hanggang 5 ektarya' },
  { value: 'gt-5', label: 'Higit sa 5 ektarya' },
];

export const EXPERIENCE_YEARS: SelectOption[] = [
  { value: '0-5', label: '0 hanggang 5 taon' },
  { value: '6-10', label: '6 hanggang 10 taon' },
  { value: '11-20', label: '11 hanggang 20 taon' },
  { value: 'gt-20', label: 'Higit sa 20 taon' },
];

export const HOUSEHOLD_SIZES: SelectOption[] = [
  { value: '1-3', label: '1 hanggang 3' },
  { value: '4-6', label: '4 hanggang 6' },
  { value: '7-9', label: '7 hanggang 9' },
  { value: 'gt-10', label: '10 pataas' },
];
