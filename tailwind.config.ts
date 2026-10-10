import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";
import containerQueries from "@tailwindcss/container-queries";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#1455b8",
        "secondary-fixed-dim": "#ffb4ab",
        "surface-bright": "#ffffff",
        "on-primary-fixed-variant": "#103f85",
        "on-tertiary": "#ffffff",
        "surface-container-lowest": "#ffffff",
        "on-primary-fixed": "#10294e",
        "surface-container-low": "#f6f8fb",
        "error": "#ba1a1a",
        "surface-container-highest": "#e3e9f1",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
        "on-tertiary-fixed": "#1b1c1c",
        "on-tertiary-fixed-variant": "#474746",
        "tertiary-fixed": "#e3e9f1",
        "primary-fixed-dim": "#ffb4a8",
        "outline": "#8491a4",
        "surface-dim": "#dcd9d9",
        "outline-variant": "#dbe2eb",
        "tertiary-fixed-dim": "#c8c6c5",
        "on-primary-container": "#ffffff",
        "inverse-primary": "#ffb4a8",
        "surface": "#ffffff",
        "on-background": "#12233e",
        "surface-container": "#f0edec",
        "secondary": "#245487",
        "on-secondary": "#ffffff",
        "secondary-fixed": "#ffdad6",
        "tertiary": "#343434",
        "on-tertiary-container": "#bcbab9",
        "on-surface-variant": "#526074",
        "surface-variant": "#e3e9f1",
        "on-error": "#ffffff",
        "inverse-surface": "#313030",
        "surface-container-high": "#ebe7e7",
        "tertiary-container": "#4b4a4a",
        "primary-container": "#103f85",
        "on-secondary-fixed-variant": "#84231f",
        "on-secondary-fixed": "#410002",
        "on-primary": "#ffffff",
        "primary-fixed": "#eaf1fc",
        "surface-tint": "#1455b8",
        "secondary-container": "#fd7d71",
        "inverse-on-surface": "#f3f0ef",
        "on-secondary-container": "#711513",
        "background": "#ffffff",
        "on-surface": "#12233e"
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      fontFamily: {
        "headline": ["var(--font-headline)"],
        "body": ["var(--font-body)"],
        "label": ["var(--font-body)"]
      }
    },
  },
  plugins: [
    forms,
    containerQueries
  ],
};
export default config;
