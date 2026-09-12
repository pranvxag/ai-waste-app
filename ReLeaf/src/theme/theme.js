// Design tokens for the whole app. Change values here to re-theme everything.

export const colors = {
  background: "#F4F7F2",   // soft sage-white
  surface: "#FFFFFF",
  border: "#E1E8DD",

  ink: "#1F4D3A",           // deep pine green - primary text/brand
  inkSoft: "#4B665B",       // secondary text
  accent: "#D98E32",        // ochre - primary CTA color

  // One color per disposal bucket - used consistently for icons, badges, bands
  recyclable: "#2C5F8A",
  compostable: "#6B4F2A",
  hazardous: "#B23A2E",
  reuse: "#6B4A82",
  general: "#4A4A48",

  white: "#FFFFFF",
  overlay: "rgba(31,77,58,0.55)",
};

export const fonts = {
  heading: "SpaceGrotesk_700Bold",
  headingMedium: "SpaceGrotesk_500Medium",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
};

export const type = {
  h1: { fontFamily: fonts.heading, fontSize: 32, lineHeight: 38, color: colors.ink },
  h2: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 30, color: colors.ink },
  h3: { fontFamily: fonts.headingMedium, fontSize: 18, lineHeight: 24, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.inkSoft },
  bodyStrong: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 22, color: colors.ink },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: colors.inkSoft },
};

export const spacing = {
  xs: 6,
  sm: 12,
  md: 20,
  lg: 28,
  xl: 40,
};

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
};
