{
  description = "mst-mkt/serenity-emoji";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    serenity = {
      url = "github:SerenityOS/serenity";
      flake = false;
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      serenity,
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
      packages = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          cli = pkgs.callPackage ./nix/cli.nix { src = self; };
          font = pkgs.callPackage ./nix/font.nix {
            inherit cli;
            upstream = serenity;
          };
        in
        {
          inherit cli font;
          default = cli;
        }
      );
    };
}
