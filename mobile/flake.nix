{
  description = "ANIMO mobile (Expo) + local Supabase backend";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      forAllSystems = nixpkgs.lib.genAttrs [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
    in
    {
      devShells = forAllSystems (system: {
        default = nixpkgs.legacyPackages.${system}.mkShell {
          # supabase-cli drives the host's Docker; nothing here provides it.
          packages = with nixpkgs.legacyPackages.${system}; [
            nodejs_22
            supabase-cli
            curl
            watchman
          ];
          shellHook = ''
            export EDGE_ENV_FILE="''${EDGE_ENV_FILE:-/tmp/animo_edge_env.local}"
            [[ -f $EDGE_ENV_FILE ]] ||
              echo "PRICING_SERVICE_URL=http://animo-pricing-service:8000" > "$EDGE_ENV_FILE"

            echo "ANIMO mobile — Expo + Supabase (uses your system Docker)"
          '';
        };
      });
    };
}
