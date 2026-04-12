export default {
  extends: ["stylelint-config-standard", "stylelint-config-html/astro"],
  ignoreFiles: ["dist/**", ".astro/**", ".vercel/**"],
  rules: {
    "custom-property-empty-line-before": null,
    /** BEM-style blocks (`block__elem`, `block--mod`); matches `BaseLayout.astro` globals. */
    "selector-class-pattern":
      "^[a-z][a-zA-Z0-9_-]*(__[a-zA-Z0-9_-]+)?(--[a-zA-Z0-9_-]+)?$",
    /** Astro scoped styles use `:global(...)` for subtree selectors. */
    "selector-pseudo-class-no-unknown": [
      true,
      {
        ignorePseudoClasses: ["global"],
      },
    ],
  },
};
