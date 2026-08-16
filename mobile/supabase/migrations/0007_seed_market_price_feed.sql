-- §13 MARKETPRICEFEED had zero rows in every environment. croplisting_lock_price
-- (0001) reads "order by effective_date desc limit 1" from this table on every
-- listing insert; with no row to read, base_price resolves via
-- coalesce(base_price, 0) and every new listing silently locks in a ₱0
-- (plus variety premium) "fair price" — the Farmer Crop Listings feature's
-- dynamic pricing looked wired up but produced ₱0/kg for every real listing.
--
-- Seed one row so the existing trigger has something to compute from.
-- dry_base_price_per_kg uses the CALABARZON farmgate figure cited in the
-- Project Charter (partial recovery to ₱18.83/kg by June 2026) as a starting
-- point until the LSTM-GRU forecast feed described in the §13 column comment
-- is actually wired up. wet_base_price_per_kg is left to the column's own
-- default (₱15.50).
insert into public.marketpricefeed (dry_base_price_per_kg)
values (18.83);
