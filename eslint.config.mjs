import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "_legacy/**",
      "agents/**",
      "generated/**",
      // gerado por scripts/gen-template-css.mjs
      "src/components/resume-templates/styles.ts",
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
];
