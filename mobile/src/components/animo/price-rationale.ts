import type { TranslationKey } from '@/i18n/translations';
import type { CropListing } from '@/types/crop-listing';

type PriceFacts = Pick<
  CropListing,
  'pricePerKg' | 'declaredMoisture' | 'varietyCode' | 'declaredPurityGrade'
>;

export type PriceRationaleIcon = 'lock' | 'moisture' | 'premium' | 'noPremium';

export type PriceRationaleRow = {
  id: 'locked' | 'source' | 'premium';
  icon: PriceRationaleIcon;
  label: TranslationKey;
  detail: TranslationKey;
};

/**
 * Rows for the locked-price card. The stored peso is not split into
 * base plus premium, because those parts are not saved on the listing.
 */
export function priceRationaleRows(listing: PriceFacts): PriceRationaleRow[] | null {
  if (listing.pricePerKg == null) return null;
  const wet = listing.declaredMoisture === 'Wet';
  const hasPremium = listing.varietyCode === '218' && listing.declaredPurityGrade === 'A';
  return [
    {
      id: 'locked',
      icon: 'lock',
      label: 'listing.priceWhyLockedLabel',
      detail: 'listing.priceWhyLocked',
    },
    {
      id: 'source',
      icon: 'moisture',
      label: wet ? 'listing.priceWhyWetLabel' : 'listing.priceWhyDryLabel',
      detail: wet ? 'listing.priceWhyWet' : 'listing.priceWhyDry',
    },
    {
      id: 'premium',
      icon: hasPremium ? 'premium' : 'noPremium',
      label: hasPremium ? 'listing.priceWhyPremiumLabel' : 'listing.priceWhyNoPremiumLabel',
      detail: hasPremium ? 'listing.priceWhyPremium' : 'listing.priceWhyNoPremium',
    },
  ];
}
