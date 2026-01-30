import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cognaize: {
          purple: '#7C3AED',
          'purple-light': '#8B5CF6',
          'purple-dark': '#6D28D9',
          dark: '#1a1a1a',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
