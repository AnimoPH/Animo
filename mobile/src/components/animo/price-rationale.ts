import type { TranslationKey } from '@/i18n/translations';
import type { CropListing } from '@/types/crop-listing';

type PriceFacts = Pick<
  CropListing,
  'pricePerKg' | 'declaredMoisture' | 'varietyCode' | 'declaredPurityGrade'
>;

/**
 * Sentences for the locked-price card. The stored peso is not split into
 * base plus premium, because those parts are not saved on the listing.
 */
export function priceRationaleKeys(listing: PriceFacts): TranslationKey[] | null {
  if (listing.pricePerKg == null) return null;
  const moisture: TranslationKey =
    listing.declaredMoisture === 'Wet' ? 'listing.priceWhyWet' : 'listing.priceWhyDry';
  const premium: TranslationKey =
    listing.varietyCode === '218' && listing.declaredPurityGrade === 'A'
      ? 'listing.priceWhyPremium'
      : 'listing.priceWhyNoPremium';
  return ['listing.priceWhyLocked', moisture, premium];
}
