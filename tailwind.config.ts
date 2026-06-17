import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        kamerTeal: '#0f4c4a',
        kamerGold: '#d39e4f',
        kamerDark: '#082b2a',
      },
      fontFamily: {
        playfair: ["var(--font-playfair)", "serif"],
        inter:    ["var(--font-inter)",    "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
