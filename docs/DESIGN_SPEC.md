# ANIMO Design Spec (v2, Farmer and Buyer modules)

Last updated: Nov 5, 2026
Source of truth for the visual and interaction design of the ANIMO mobile app (Farmer and Buyer modules). The LGU web console is not covered.

## 1. How to use this folder

| File | Use it for |
| --- | --- |
| `animo-farmer-module.html` | The visual and behavioral reference for the Farmer module. Open it in a browser. Every screen, state and modal is in it, and the left panel jumps to any screen. |
| `animo-buyer-module.html` | The same for the Buyer module. |
| `DESIGN_SPEC.md` (this file) | Tokens, component rules, screen map, copy, and how to translate the prototype to React Native. |
| `animo-tokens.ts` | Proposed v2 tokens as TypeScript. Reconcile with `constants/animo.ts`, do not blindly overwrite it. |

Rules of precedence when sources disagree:
1. The team's scope rules in `ANIMO_Overview` (section 7, hard scope boundaries) always win.
2. This spec wins over the prototype for anything stated here.
3. The prototype wins for layout, spacing feel and interaction details not stated here.
4. The prototype is HTML. Do not copy its CSS or markup. Translate the design into React Native (section 7).

## 2. Scope guardrails (do not violate)

These come from the project primer and override anything visible in the prototype or the older Figma frames.

- Only three actors: Farmer (Magsasaka), Buyer (Mamimili), LGU official (web only). No Cooperative or Volunteer role.
- Buyers send **purchase requests** (Kahilingan sa Pagbili), never bids. Price is **fixed per listing**.
- Payment is peer to peer (GCash or cash), confirmed manually. The blockchain is a **receipt ledger only**, never escrow.
- The advisory (Payo sa Bukid) is **rule based** with exactly three states: Advance Cut, Delayed Harvest, No Action Needed.
- Quality verification (photo grading, moisture check) was removed. There is **no replacement defined**. The listing wizard publishes immediately and shows the computed fair price. Do not add pass or fail result screens.
- Palette is green, danger, warning, caution only. No blue. Never rely on color alone for status: pair it with an icon and a label.
- All mobile copy is Filipino by default with an English toggle. Locked terms: Kahilingan sa Pagbili, Magsumite ng Kahilingan sa Pagbili, Mga Kahilingan, Tanggapin, Pangalan ng Listing, Patas na Presyo, Payo sa Bukid.
- Geography is Antipolo, Rizal only. Crop is palay only.

## 3. Design direction

Friendly and welcoming, in the spirit of Duolingo: bold and tactile, never plain.

- **Chunky controls.** Buttons and selected chips have a solid bottom edge (3 to 4px) and press down on tap.
- **Rounded shapes.** Radius 16 to 28. Pills are fully round.
- **Heavy type.** Plus Jakarta Sans, ExtraBold for titles and buttons.
- **Mascot moments.** The salakot mascot greets on Tahanan and appears on empty states and success screens.
- **Color means something.** Big status cards (advisory, pills) use tinted backgrounds, a solid icon tile and a progress bar.
- **Celebrate completion.** Listing published gets confetti, the price reveal and the mascot.
- **Warm neutrals.** App background is a warm off white, not cool grey.

## 4. Tokens

### Color (light mode)

| Token | Hex | Use |
| --- | --- | --- |
| surface/app | #FAF8F4 | Screen background |
| surface/card | #FFFFFF | Cards, inputs, sheets |
| surface/muted | #F2EFE8 | Neutral pills, segmented control track, disabled fills |
| surface/brand | #1A6E1E | Hero headers, splash |
| surface/brand-subtle | #E8F5E9 | Selected cards, CTA banners |
| text/primary | #1C1B18 | Main text |
| text/secondary | #4A4740 | Supporting text |
| text/tertiary | #67635A | Hints, timestamps, placeholders |
| text/brand | #1A6E1E | Links, prices, active labels |
| border/default | #E6E2D8 | Card borders (2px) |
| border/strong | #857F72 | Input borders (needs 3:1) |
| border/focus | #1C1B18 | Focus ring |
| action/primary | #1A6E1E | Primary button |
| action/primary-depth | #0F4A13 | Bottom edge and pressed state |
| action/disabled-bg | #E6E2D8 | Disabled button |
| action/disabled-text | #67635A | Disabled label |
| status/success-bg / fg | #E8F5E9 / #1A6E1E | Success |
| status/danger-bg / fg / solid | #FDECEA / #A52121 / #D32F2F | Errors, destructive |
| status/warning-bg / fg / solid | #FFF4D6 / #7A4B00 / #F9A825 | Pending, delay harvest |
| status/caution-bg / fg / solid | #FFE9D6 / #A34200 / #F57C00 | Rain, advance cut |

Measured contrast (WCAG): body text 16.2:1, secondary 8.7:1, tertiary 6.0:1, white on primary green 6.4:1, status text on its tint 5.4:1 or better, disabled label 4.6:1, strong border on white 4.0:1.

Dark mode values exist in the Figma file (collection "Color Dark") but are not designed into screens yet. Treat dark mode as future work.

### Type (Plus Jakarta Sans)

| Style | Size / line | Weight | Use |
| --- | --- | --- | --- |
| Display | 32 / 40 | 800 | Wordmark |
| Title | 26 / 32 | 800 | Screen titles |
| Heading | 20 / 28 | 800 | Section headings |
| Subheading | 18 / 24 | 700 | Card titles |
| Body | 16 / 24 | 400 | Default text |
| Body strong | 16 / 24 | 700 | Labels, emphasis |
| Button | 18 / 24 | 800 | Button labels |
| Price | 20 / 24 | 800 | Prices in cards |
| Price hero | 40 / 44 | 800 | Price reveal |
| Caption | 14 / 20 | 400 | Helper text |
| Tag | 14 / 16 | 700 | Pills, active tab label |

Minimum text size is 14. Body is 16. Target users have low digital literacy, so do not go smaller.

### Spacing, radius, size

- Spacing (4pt grid): 4, 8, 12, 16, 24, 32, 48. Screen side padding is 16.
- Radius: sm 12, md 16, lg 20, xl 28, full 999. Buttons and inputs use md. Cards use xl (list cards) or lg (rows).
- Touch targets: controls are 56 high, icon buttons 48. **Confirm 56 vs 44 with the team** (the thesis says 56, the LGU audit used 44).

### Depth

- Primary button bottom edge: 4px solid #0F4A13. Secondary: 4px #D3CEC1. Danger: 4px #A52121.
- Cards: 2px border #E6E2D8 plus a 4px bottom edge #D3CEC1.
- Pressed: translate down 4px and remove the edge.

## 5. Components

All of these exist in the prototype. Class names in the HTML are the same as the names below.

| Component | Rules |
| --- | --- |
| Button | Primary, Secondary, Danger, Ghost. Height 56, radius 16, label 18/800. Disabled is flat grey with readable text. One primary action per screen. Sticky action bars sit at the bottom above the tab bar. |
| Pill (status) | Success, Warning, Danger, Caution, Neutral. Always an icon plus a label. Icons: check, clock, x, alert, info. |
| Chip | Filter chips with a count. Selected: solid green, white text, 3px depth. |
| Input | Label above (700), 56 high, 2px border #857F72, focus ring 2px ink. Unit suffix inside the field (kg). Errors say the problem in words with an icon. |
| Option card (radio) | Full width card with a radio. Selected: green tint and green border. Used for variety, moisture, grade, reject reasons, language. |
| Quantity stepper | 56 buttons with minus and plus, value 32/800 in the middle. Steps of 50 kg, limited to the requested amount. |
| Advisory card | Three states. Tinted background, 2px colored border, 64px solid icon tile, title, one sentence, ripeness bar plus rain percentage. Tapping cycles states in the prototype only. In the app the state comes from the rule engine. |
| Listing card | Photo 150 high with status pill (left) and pending pill (right), then name, specs, price, remaining kg, action row. |
| Stat tile | White tile on the green hero with a 4px dark green edge. Icon, number (26/800), label. |
| Timeline | Four steps: Request naipadala, Tinanggap mo ang kahilingan, Bayad mula sa mamimili, Kumpleto. Done steps are green with a check, current is outlined, upcoming is grey. |
| Dialog and sheet | Dialog: centered, 28 radius, big icon circle on top, title, text, stacked buttons. Sheet: bottom aligned with top radius 28. Scrim is dark green at 55%. Escape or scrim tap closes. |
| Tab bar | See below. |
| Progress bar (wizard) | 16 high pill track, green fill, step counter on the right. |
| Toast | Dark pill above the tab bar, 2.2 seconds. |
| Empty state | Mascot, title, one sentence, one button. |

### Tab bar (updated)

- Bar: white, top corners radius 28, 4px top edge #E6E2D8 plus a soft upward shadow.
- Four equal items, min height 64, radius 20, icon 26 above label 14.
- Active: solid green pill with white icon and white 800 label, with the 4px dark edge. Inactive: icon and label in text/secondary.
- Farmer tabs: Tahanan, Aking Ani, Transaksyon, Profile. Buyer tabs: Tahanan, Palengke, Transaksyon, Profile.
- A red count badge shows pending requests on Aking Ani (Farmer) and active requests on Transaksyon (Buyer).
- Check that "Transaksyon" fits on one line on a 360 wide device. If not, reduce side padding before reducing font size.

## 6. Screens (Farmer module)

Prototype path in the panel on the left. Build in this order.

| Screen | Notes |
| --- | --- |
| Tahanan | Green hero with mascot greeting, bell with unread dot, three stat tiles. Then Payo sa Bukid (always visible), the "Ibenta ang aking Palay" banner, and the last two activities. |
| Aking Ani | Filter chips (Lahat, Aktibo, Naubos) with counts, listing cards, sticky "Bagong Listing". Empty state with the mascot. |
| Gumawa ng Listing | Five steps with a progress bar, each with one question: 1 photos (Buong palay, Bago anihin, Butil ng palay, at least one), 2 listing name and variety, 3 moisture (Tuyo or Basa) and purity grade (A, B, C), 4 gross and tare weight with live net weight, 5 review with the fair price reveal. Then publish. Success screen with confetti and the locked price. Next buttons stay disabled until the step is valid. |
| Listing Detail | Gallery tabs, status, two tabs: Detalye (fair price card, Naka-lock note, premium note, palay info, reviews) and Mga Order. |
| Mga Order | Request card with kg, total, buyer record (transactions, reviews, kg bought), Tanggihan and Tanggapin. Accept opens a quantity dialog then a success dialog. Reject requires a reason (stock, pickup schedule, quantity too low, other). |
| Mga Transaksyon | Per listing rollup (natitira, naibenta, Buong Kita), then the order list with status pills. Detail screen shows the timeline. "Natanggap ko na ang bayad" completes the transaction. |
| Resibo | Summary, digital receipt note (Polygon), star rating (required) and optional review. |
| Mensahe | List with unread highlight and "Basahin lahat". Empty state. Currently mock UI in the app, so design it as if wired to the push queue. |
| Profile at Setting | Mascot, name, barangay, stats, language picker sheet, phone, GCash, legal rows, sign out dialog. |


## 6b. Screens (Buyer module)

Prototype: `animo-buyer-module.html`. Tabs: Tahanan, Palengke, Transaksyon, Profile. Same components, tokens and tab bar as the Farmer module.

| Screen | Notes |
| --- | --- |
| Tahanan | Green hero with mascot greeting, bell and a search button that opens Palengke. "Mga Rekomendasyon" is a horizontal list of the top four listings ranked by the buyer's saved preferences, each with a match percentage and up to three reason tags. Then "Mga Bagong Listing" in a two column grid and a Patas na Presyo reassurance card (no bidding). |
| Palengke | Search field, filter button with an active filter count, quick chips (Lahat, Inbred, Hybrid, Tuyo, Basa), result count and a two column grid. Grid cards have a fixed layout: photo with a grade pill, name, price, moisture and kg, farmer rating and barangay. Filter sheet: moisture, purity grade, max price slider, sort (pinakabago, pinakamura, pinakamataas ang rating, pinakamaraming dami), live result count on the apply button. Empty state when nothing matches. |
| Listing | Gallery tabs (Overview, Bago Anihin, Butil ng Palay), the locked fair price, "Datos ng Kalidad" (variety, moisture, grade, available kg), the farmer trust card (rating, transactions, completion rate) that opens the farmer profile, reviews, and a sticky "Magsumite ng Kahilingan sa Pagbili". |
| Farmer profile | Name, barangay, a stat grid (average rating, completed transactions, active listings, completion rate), member since, and the farmer's active listings. |
| Kahilingan sa Pagbili | Mini listing summary, quantity stepper in steps of 50 kg with "Kalahati" and "Lahat" shortcuts, live total, and two notes: the 30 second cancel window and peer to peer payment. The farmer decides the final allocation, so the accepted quantity can be lower than requested. |
| 30 second cancel window | After submitting, a countdown ring from 30 seconds with "Kanselahin ang Kahilingan" (confirm dialog). When it reaches zero the request becomes "Naghihintay ng sagot" and can no longer be cancelled. The countdown must keep running if the buyer leaves the screen. |
| Mga Transaksyon | Tabs Aktibo and Kasaysayan. Cards show the listing photo, farmer, kg, total and a status pill. Statuses: Puwede pang kanselahin, Naghihintay ng sagot, Tinanggap (magbayad na), Naghihintay ng pickup, Kumpleto, Hindi tinanggap, Nakansela. |
| Transaksyon detail | Four step timeline (Naipadala ang kahilingan, Tinanggap ng magsasaka, Bayad at pickup, Kumpleto). At step 3 a payment card shows the amount, the farmer's GCash number with a copy button and the pickup barangay. Two manual confirmations: "Nabayaran ko na", then "Natanggap ko na ang palay". If the farmer accepted less than requested, say so on the card. |
| Resibo | Summary, digital receipt note (Polygon), star rating of the farmer and optional review. Reviews are screened by rule for flagged words before they appear. |
| Mensahe | Same list pattern as the Farmer module. Empty state included. |
| Profile at Setting | Stats, a "Kagustuhan sa Pagbili" card with an edit sheet (uri ng palay, moisture, minimum grade, max price per kg, usual quantity), language picker, phone, GCash, legal, sign out. Saving preferences re-ranks the recommendations. |

Recommendation scoring in the prototype (placeholder, replace with the real ranking service): type match 25, moisture match 20 to 25, minimum grade 20, within budget 20, enough quantity 10, plus up to 5 for farmer rating. Use the real weighted product model and merge sort ranking from the thesis.

Demo only in the Buyer prototype: the "Demo: tanggapin ng magsasaka" button on a waiting request (the farmer's action happens in the Farmer app, remove it), farmers, listings, reviews, GCash numbers and the receipt hash.

## 7. Translating to React Native

The app is React Native with Expo (v51), Android SDK 24 minimum. Screens use `StyleSheet.create` inline in the screen file, tokens live in `constants/animo.ts`.

| Prototype (HTML) | React Native |
| --- | --- |
| CSS variables | Tokens in `constants/animo.ts` (see `animo-tokens.ts`). No raw hex in screens. |
| Chunky button edge (`box-shadow: 0 4px 0`) | Android cannot draw a hard offset shadow. Use two stacked `View`s: an outer view in the edge color with `paddingBottom: 4`, and an inner pressable face. On press, set the outer `paddingBottom` to 0 and `paddingTop` to 4. Build this once as a `Button` component. |
| Card depth | `borderWidth: 2` plus `borderBottomWidth: 6`, or the same stacked view approach. |
| `position: sticky` action bar | Footer `View` outside the `ScrollView`, above the tab bar. |
| Tab bar | Custom `tabBar` renderer for the Expo Router tab layout at `(farmer)/(tabs)`. |
| Icons | `lucide-react-native`, same names as the prototype sprite (home, sprout, receipt, user, bell, plus, minus, camera, check, chevron, x, star, map-pin, cloud-rain, sun, clock, info, lock, droplet, package, banknote, scale, globe, shield-check, log-out, message-square, smartphone, trending-up, alert-triangle). |
| Font | `@expo-google-fonts/plus-jakarta-sans` weights 400, 500, 600, 700, 800. |
| Modal dialog and sheet | `Modal` with a transparent background and the scrim as a `Pressable`. |
| Confetti and press animation | `react-native-reanimated`. Respect reduced motion (`AccessibilityInfo.isReduceMotionEnabled`). |
| Lists | `FlatList`. Card grids use fixed heights, not masonry. |
| Safe areas | `react-native-safe-area-context`. Hero extends under the status bar. |
| Accessibility | Every pressable has `accessibilityLabel` and `accessibilityRole`. Selected options expose `accessibilityState.selected`. Status is never color only. |
| Copy | Put all strings in the i18n files with Filipino and English. Do not hardcode. |

## 8. Demo only, replace with real logic

- Fair price in the wizard is a placeholder: base 20 (dry) or 17 (wet), plus 5, 2 or 0 for grade A, B or C. Use the pricing service (FastAPI, LSTM-GRU) for the real value.
- Buyer names, reviews and buyer record numbers are sample data. Use real Supabase data.
- The advisory cycles states on tap. In the app it comes from the rule based engine (rainfall forecast plus crop ripeness).
- Listing photos are drawn illustrations and the mascot is an approximation. Use the real assets.
- The receipt hash is a placeholder.

## 9. Open decisions (not decided by design)

1. Font: thesis says Nunito, code uses Plus Jakarta Sans. This spec assumes Plus Jakarta Sans. Swapping is a single token change.
2. Touch target: 56 or 44 (section 4).
3. Quality verification: no mechanism defined. The wizard publishes straight away.
4. Tagline: the prototype and entry flow use "Patas na presyo. Tamang oras ng ani." The old line mentioned farm recovery, which was removed. Needs team approval.
5. Dark mode: tokens exist, screens do not.
6. Buyer ranking: the prototype scoring is a placeholder. The 30 second cancel window needs a server side timestamp so it survives app restarts.

## 10. Figma

File key `5Jmtm71P5JZg2g9WlR4MEg`, page "v2 · Foundations". It contains the tokens (variable collections), text styles, components (Button, Status pill, Input, Stepper, Tab bar, Advisory card), the Entry flow section (splash, role selection, phone, OTP, profile setup) and a partial Farmer module (Tahanan, Aking Ani, empty state).

The Figma file does **not** yet have the full Farmer module or any of the Buyer module, and its Tab bar still has the old style. The prototypes are newer than Figma.
