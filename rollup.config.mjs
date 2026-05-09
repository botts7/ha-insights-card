import typescript from "@rollup/plugin-typescript";
import nodeResolve from "@rollup/plugin-node-resolve";

const plugins = [typescript(), nodeResolve()];

export default [
  {
    input: "src/ha-insights-card.ts",
    output: { file: "dist/ha-insights-card.js", format: "es", sourcemap: true },
    plugins,
  },
  {
    input: "src/ha-insights-panel.ts",
    output: { file: "dist/ha-insights-panel.js", format: "es", sourcemap: true },
    plugins,
  },
];
