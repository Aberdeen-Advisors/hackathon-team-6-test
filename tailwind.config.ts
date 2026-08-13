import type { Config } from 'tailwindcss';

/**
 * Aberdeen Advisors brand palette — exact values, no deviation.
 * Primary:   Aberdeen Blue #09375F · Verdigris #44B0B1 · White · Onyx #404040
 * Secondary (charts only): Deep Sky Blue #5CC8FF · Jasper #DB504A · Jade #00A676 · Gold #F7D002
 *
 * ADA rule enforced throughout: never Verdigris text on White.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        aberdeen: {
          DEFAULT: '#09375F',
          50: '#F2F6FA',
          100: '#E3EBF3',
          200: '#C2D3E4',
          300: '#8FAAC8',
          600: '#0B4374',
          700: '#09375F',
          800: '#072B4A',
          900: '#051F36',
        },
        verdigris: { DEFAULT: '#44B0B1', 50: '#F0F9F9', 100: '#DDF0F0', 200: '#B4E0E0', 700: '#2E8384' },
        onyx: { DEFAULT: '#404040', 60: '#6B6B6B', 40: '#9A9A9A', 20: '#D6D6D6', 10: '#EDEDED', 5: '#F7F7F7' },
        skyblue: { DEFAULT: '#5CC8FF', tint: '#EAF6FE' },
        jasper: { DEFAULT: '#DB504A', tint: '#FBEDEC' },
        jade: { DEFAULT: '#00A676', tint: '#E5F6F1' },
        gold: { DEFAULT: '#F7D002', tint: '#FEF9E0' },
      },
      fontFamily: { sans: ['Poppins', 'Arial', 'Helvetica', 'sans-serif'] },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        panel: '0 8px 28px -6px rgba(9,55,95,0.18)',
        pop: '0 6px 20px -4px rgba(9,55,95,0.22)',
      },
    },
  },
  plugins: [],
};
export default config;
