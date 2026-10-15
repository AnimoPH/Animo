import { supabase } from '@/lib/supabase';
import { uploadListingPhoto } from '@/services/crop-listing-service';
import { SPECIFIC_VARIETY_OTHER } from '@/types/crop-listing';

import { deleteOutboxPhotos } from './photo-files';
import type { OutboxHandlers } from './types';

/**
 * One function per saved action. Each is safe to run twice: the server
 * answers a repeat with the first record (migration 0041), so a send that
 * was cut off after it reached the server is not created a second time.
 */
export const outboxHandlers: OutboxHandlers = {
  async create_listing({ seenPricePerKg, input, photos }, clientRequestId) {
    const customVariety = input.customVariety?.trim() || null;
    const specificCustom = input.specificVarietyNameCustom?.trim() || null;

    const { data, error } = await supabase.rpc('create_crop_listing', {
      p_client_request_id: clientRequestId,
      p_seen_price_per_kg: seenPricePerKg,
      p_listing_name: input.listingName.trim(),
      p_declared_variety: input.declaredVariety,
      p_declared_variety_custom: input.declaredVariety === 'Others' ? customVariety : null,
      p_variety_code: input.varietyCode,
      p_specific_variety_name: input.specificVarietyName ?? null,
      p_specific_variety_name_custom:
        input.specificVarietyName === SPECIFIC_VARIETY_OTHER ? specificCustom : null,
      p_declared_moisture: input.declaredMoisture,
      p_declared_purity_grade: input.declaredPurityGrade,
      p_gross_weight_kg: input.grossWeightKg,
      p_tare_weight_kg: input.tareWeightKg,
    });
    if (error) throw error;

    // Photos upsert on (listing, slot), so a retry after a dropped upload is fine.
    const listingId = (data as { listing_id: string }).listing_id;
    for (const photo of photos) {
      await uploadListingPhoto(listingId, photo.type, photo.uri);
    }
    await deleteOutboxPhotos(clientRequestId);
  },

  async purchase_request({ listingId, requestedQuantityKg }, clientRequestId) {
    const { data: userData } = await supabase.auth.getUser();
    const buyerId = userData.user?.id;
    if (!buyerId) throw new Error('Walang naka-sign in na user.');

    const { error } = await supabase.from('purchaserequest').insert({
      listing_id: listingId,
      buyer_id: buyerId,
      requested_quantity_kg: requestedQuantityKg,
      client_request_id: clientRequestId,
    });
    if (!error) return;

    // 23505 is also the "already one pending request" rule, so only treat it as
    // a repeat when a row with this request id already exists.
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('purchaserequest')
        .select('request_id')
        .eq('client_request_id', clientRequestId)
        .maybeSingle();
      if (existing) return;
    }
    throw error;
  },

  async buyer_payment({ transactionId, mode, amount, gcashReference }, clientRequestId) {
    const { data, error } = await supabase.rpc('record_payment', {
      p_transaction_id: transactionId,
      p_payment_mode: mode,
      p_amount: amount,
      p_gcash_reference: gcashReference ?? null,
      p_client_request_id: clientRequestId,
    });
    if (error) throw error;

    const { error: confirmError } = await supabase.rpc('buyer_confirm_payment_sent', {
      p_payment_id: data as string,
    });
    if (confirmError) throw confirmError;
  },

  async buyer_confirm_payment({ paymentId }) {
    const { error } = await supabase.rpc('buyer_confirm_payment_sent', { p_payment_id: paymentId });
    if (error) throw error;
  },

  async farmer_confirm_payment({ paymentId }) {
    const { error } = await supabase.rpc('farmer_confirm_payment_received', {
      p_payment_id: paymentId,
    });
    if (error) throw error;
  },
};
