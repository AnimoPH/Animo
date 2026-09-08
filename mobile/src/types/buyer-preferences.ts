import type { DeclaredVariety, MoistureType } from '@/types/crop-listing';

/**
 * Buyer preferences (migration 0023_buyer_preferences.sql) — a buyer's
 * optional "what I usually look for" fields, collected on the onboarding
 * Profile step and editable again from the Profile tab. Storage only: not
 * read by any search/ranking logic.
 */
export type BuyerPreferences = {
  preferredVariety: DeclaredVariety | null;
  /** Actual text of the specific variety picked (e.g. "NSIC Rc216"), not a '218'/'OTHER' price code. */
  preferredVarietyCode: string | null;
  preferredMoisture: MoistureType | null;
  typicalQuantityKg: number | null;
  updatedAt: string;
};

/** Payload for `upsertMyBuyerPreferences` — every field optional, all four may be null to clear them. */
export type UpsertBuyerPreferencesInput = {
  preferredVariety: DeclaredVariety | null;
  preferredVarietyCode: string | null;
  preferredMoisture: MoistureType | null;
  typicalQuantityKg: number | null;
};
