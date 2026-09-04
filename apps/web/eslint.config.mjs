import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      "react/self-closing-comp": "warn",
      "react/jsx-no-duplicate-props": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "prefer-const": "warn",
      eqeqeq: ["error", "always"],
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "@next/next/no-page-custom-font": "off",
      "@next/next/no-img-element": "warn",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "public/**",
      "*.config.mjs",
      "*.config.js",
    ],
  },
];

export default eslintConfig;
