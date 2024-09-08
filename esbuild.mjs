// @ts-check
import * as esbuild from "esbuild";

/**
 * @type {import('esbuild').BuildOptions}
 */
const buildOption = {
    entryPoints: ["src/extension.ts"],
    bundle: true,
    minify: true,
    sourcemap: true,
    treeShaking: true,
    define: {
        "import.meta.vitest": "undefined",
    },
    platform: "node",
    external: ["vscode"],
    format: "cjs",
    outfile: "dist/extension.cjs",
};

esbuild.buildSync(buildOption);
