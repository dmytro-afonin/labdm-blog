export default {
  extends: ["stylelint-config-standard", "stylelint-config-html/astro"],
  ignoreFiles: ["dist/**", ".astro/**", ".vercel/**"],
  rules: {
    "custom-property-empty-line-before": null,
  },
};
