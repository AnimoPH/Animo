/**
 * Gates dev-only shortcuts (quick login, OTP skip) in built APKs, not just
 * Metro dev mode. __DEV__ alone is always false in `eas build` (preview and
 * production profiles both bundle release JS), so QA builds need an escape
 * hatch — set EXPO_PUBLIC_SHOW_DEV_TOOLS=1 for a preview build only, never
 * production, since this also re-enables the OTP-skip auth bypass.
 */
export const SHOW_DEV_TOOLS = __DEV__ || process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS === '1';
