{
  lib,
  stdenvNoCC,
  nodejs-slim_24,
  pnpm_11,
  pnpmConfigHook,
  fetchPnpmDeps,
  src,
}:

stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "serenity-emoji-cli";
  version = (lib.importJSON ../apps/cli/package.json).version;

  inherit src;

  strictDeps = true;
  __structuredAttrs = true;

  nativeBuildInputs = [
    nodejs-slim_24
    pnpm_11
    pnpmConfigHook
  ];

  buildInputs = [ nodejs-slim_24 ];

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    pnpm = pnpm_11;
    fetcherVersion = 4;
    hash = "sha256-3RdXHbZ340nWEuzTeVhv7UJJLcsTVz/kA050ct+uDvE=";
  };

  buildPhase = ''
    runHook preBuild

    pnpm --filter @serenity-emoji/cli build

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    install -Dm755 apps/cli/dist/main.mjs $out/bin/serenity-emoji

    runHook postInstall
  '';

  meta = {
    description = "CLI tools for SerenityOS emoji";
    homepage = "https://github.com/mst-mkt/serenity-emoji";
    license = lib.licenses.mit;
    mainProgram = "serenity-emoji";
    inherit (nodejs-slim_24.meta) platforms;
  };
})
