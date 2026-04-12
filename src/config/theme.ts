/** `localStorage` key for color scheme preference. */
export const COLOR_SCHEME_STORAGE_KEY = "labdm-color-scheme";

export type ColorSchemePreference = "light" | "dark" | "system";

export const COLOR_SCHEME_VALUES: readonly ColorSchemePreference[] = [
  "light",
  "dark",
  "system",
];

export function isColorSchemePreference(
  value: unknown,
): value is ColorSchemePreference {
  return (
    typeof value === "string" &&
    (COLOR_SCHEME_VALUES as readonly string[]).includes(value)
  );
}
