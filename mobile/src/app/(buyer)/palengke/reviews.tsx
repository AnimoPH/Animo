import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { PalayReviewsScreen } from '@/components/animo/palay-reviews';

/** Buyer palay reviews for one marketplace listing. */
export default function BuyerPalayReviewsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listingId = Array.isArray(id) ? id[0] : id;

  return (
    <>
      <StatusBar style="dark" />
      <PalayReviewsScreen listingId={listingId ?? ''} />
    </>
  );
}
