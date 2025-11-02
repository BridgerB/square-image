{
  description = "Square Image - Automatic image processing service that converts images to square PNG format";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = nixpkgs.legacyPackages.${system};

        square-image = pkgs.buildNpmPackage {
          pname = "square-image";
          version = "1.0.0";

          src = ./.;

          npmDepsHash = "sha256-2HtPOpyb/q3GsupOFTVYQbHKelTG7hm6jvXA0kDbDmU=";

          # Don't run tests during build since package.json has no real tests
          dontNpmBuild = true;
          makeCacheWritable = true;

          installPhase = ''
                        runHook preInstall

                        mkdir -p $out/bin $out/lib/square-image

                        # Copy the application files
                        cp -r node_modules $out/lib/square-image/
                        cp package.json index.js $out/lib/square-image/

                        # Create executable wrapper
                        cat > $out/bin/square-image << 'EOF'
            #!/usr/bin/env bash
            cd $out/lib/square-image
            exec ${pkgs.nodejs_24}/bin/node index.js "$@"
            EOF
                        chmod +x $out/bin/square-image

                        runHook postInstall
          '';

          meta = with pkgs.lib; {
            description = "Automatic image processing service that converts images to square PNG format";
            homepage = "https://github.com/BridgerB/square-image";
            license = licenses.isc;
            platforms = platforms.all;
            maintainers = [];
            mainProgram = "square-image";
          };
        };
      in {
        packages = {
          default = square-image;
          square-image = square-image;
        };

        apps = {
          default = {
            type = "app";
            program = "${square-image}/bin/square-image";
          };
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_24
          ];

          shellHook = ''
            echo "Square Image development environment"
            echo "Run 'npm install' to install dependencies"
            echo "Run 'node index.js' to start the image watcher"
          '';
        };
      }
    );
}
