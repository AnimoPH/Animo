// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions runs on Deno (URL imports, Deno.* globals) — a
    // different runtime/toolchain from the Expo app, not linted here.
    ignores: ["dist/*", "supabase/functions/**"],
  }
]);
