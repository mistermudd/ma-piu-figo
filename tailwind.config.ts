import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        deliveroo: {
          DEFAULT: "#00CDBC",
          hover: "#00B8A9",
          dark: "#007E7A",
          light: "#E5FAF8",
        },
      },
      keyframes: {
        pulseSlow: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.02)" },
        },
      },
      animation: {
        "pulse-slow": "pulseSlow 2.5s infinite ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
