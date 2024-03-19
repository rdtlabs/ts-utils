import { defineConfig } from "tsup";

const commonConfig = Object.freeze( {
    clean: true,
    splitting: false,
    bundle: true,
    dts: true,
    minify: true,
    sourcemap: true,
    tsconfig: "tsconfig.json"
} );

export default defineConfig( [ {
    esbuildOptions( c ) {
        c.resolveExtensions = [ ".ts", ".js" ];
    },
    entry: [
        "src/index.ts"
    ],
    format: [ "esm" ],
    ...commonConfig
} ] );