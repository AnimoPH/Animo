# Design reference (paste this section into the repo's CLAUDE.md)

## UI design source of truth

Before building or changing any mobile UI, read `docs/design/DESIGN_SPEC.md`.

- `docs/design/animo-farmer-module.html` and `docs/design/animo-buyer-module.html` are the visual and behavioral references for the two mobile modules. Read their source for exact copy, spacing and states. If you can run a browser or screenshot tool, serve the folder (`npx serve docs/design`) and look at the screens.
- `docs/design/animo-tokens.ts` holds the proposed v2 tokens. Reconcile them with `constants/animo.ts`. Keep existing key names, add new ones. Never put raw hex values or magic numbers in screens.
- The prototype is HTML. Do not copy its CSS. Translate it into React Native using the table in section 7 of the spec.
- Figma file key is `5Jmtm71P5JZg2g9WlR4MEg` (page "v2 · Foundations"). It has the tokens, components and the entry flow. It does not yet have the full Farmer module or the Buyer module.

## Rules

- The scope rules in section 2 of the spec override anything in the prototype or older Figma frames. If a screen shows something outside scope, flag it and do not build it.
- All user facing strings go through the i18n system with Filipino and English. Use the locked terms listed in the spec.
- Minimum text size is 14. Body is 16. Controls are 56 high. Status is never conveyed by color alone.
- Build one shared component at a time (Button, StatusPill, Input, OptionCard, TabBar, AdvisoryCard, ListingCard) and reuse it, then compose screens.
- The prototype contains demo data (fair price formula, buyer names, reviews, receipt hash). Replace with real data from Supabase and the pricing service.
- If the design is ambiguous or conflicts with the code, ask before deviating.

## Suggested build order

1. Tokens and fonts, `Button`, `StatusPill`, `Input`, `TabBar`.
2. Farmer Tahanan and Aking Ani.
3. Gumawa ng Listing (five steps plus success).
4. Listing Detail, Mga Order and the accept and reject dialogs.
5. Mga Transaksyon, timeline, receipt and rating.
6. Mensahe and Profile at Setting.
7. Buyer module: Tahanan and Palengke, listing and farmer profile, purchase request with the 30 second cancel window, transactions and receipt, then Profile with buying preferences.
