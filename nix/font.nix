{
  lib,
  stdenvNoCC,
  cli,
  upstream,
}:

let
  stamp = upstream.lastModifiedDate;
  upstreamDate = "${lib.substring 0 4 stamp}-${lib.substring 4 2 stamp}-${lib.substring 6 2 stamp}";
in

stdenvNoCC.mkDerivation {
  pname = "serenity-emoji-font";
  version = "0-unstable-${upstreamDate}";

  src = builtins.path {
    path = "${upstream}/Base/res/emoji";
    name = "serenity-emoji-artwork";
  };

  dontUnpack = true;

  strictDeps = true;
  __structuredAttrs = true;

  nativeBuildInputs = [ cli ];

  buildPhase = ''
    runHook preBuild

    serenity-emoji build --color-table cbdt $src fonts

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    install -Dm644 fonts/serenity-emoji.full.ttf $out/share/fonts/truetype/serenity-emoji.ttf

    runHook postInstall
  '';

  meta = {
    description = "Pixel art emoji font built from the SerenityOS artwork";
    homepage = "https://github.com/mst-mkt/serenity-emoji";
    license = lib.licenses.bsd2;
    inherit (cli.meta) platforms;
  };
}
