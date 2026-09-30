import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { PalayReviewsScreen } from '@/components/animo/palay-reviews';

/** Farmer palay reviews for one listing. */
export default function FarmerPalayReviewsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listingId = Array.isArray(id) ? id[0] : id;

  return (
    <>
      <StatusBar style="dark" />
      <PalayReviewsScreen listingId={listingId ?? ''} />
    </>
  );
}
