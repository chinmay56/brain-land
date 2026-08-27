/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        stone: {
          50: '#FAF9F6',
          100: '#F4F3EE',
          200: '#E8E6DF',
          300: '#D7D4CA',
          400: '#B5B1A2',
          500: '#8E8A7B',
          600: '#6C685B',
          700: '#4F4C42',
          800: '#34322C',
          900: '#1F1E1A',
          950: '#121210',
        },
        obsidian: {
          DEFAULT: '#141416',
          muted: '#3F3F46',
          light: '#71717A',
        },
        terracotta: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        forest: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          500: '#22C55E',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
          950: '#052E16',
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Playfair Display", "Georgia", "serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        'stone-sm': '0 1px 2px 0 rgba(28, 25, 23, 0.04)',
        'stone-md': '0 4px 12px -2px rgba(28, 25, 23, 0.06), 0 2px 4px -2px rgba(28, 25, 23, 0.03)',
        'stone-lg': '0 12px 24px -4px rgba(28, 25, 23, 0.08), 0 4px 6px -2px rgba(28, 25, 23, 0.03)',
        'parchment': '0 10px 30px -5px rgba(44, 39, 32, 0.12), 0 0 0 1px rgba(44, 39, 32, 0.08)',
      },
    },
  },
  plugins: [],
};
