{
  description = "mst-mkt/serenity-emoji development shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    nix-vite-plus = {
      url = "github:ryoppippi/nix-vite-plus";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      nixpkgs,
      nix-vite-plus,
      ...
    }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.nodejs-slim_24
              pkgs.pnpm_11
              nix-vite-plus.packages.${system}.vp
            ];
            shellHook = ''
              export SSL_CERT_FILE="${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
              export NIX_SSL_CERT_FILE="$SSL_CERT_FILE"
              echo "node $(node --version), pnpm $(pnpm --version)"
            '';
          };
        }
      );
    };
}
