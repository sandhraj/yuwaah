/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        orange: {
          DEFAULT: '#E8601C',
          light: '#2A1508',
          dim: '#F0824A',
        },
        bg: {
          DEFAULT: '#0F1E36',
          2: '#0A1628',
          3: '#162840',
        },
        border: {
          DEFAULT: '#1E3356',
          2: '#2A4570',
        },
        text: {
          DEFAULT: '#DCE8F8',
          2: '#7B96B8',
          3: '#4D6A88',
        },
        green: {
          DEFAULT: '#3ECBA8',
          bg: '#0A2B22',
          border: '#1A5040',
        },
        amber: {
          custom: '#F5B942',
          bg: '#241A08',
        },
        red: {
          custom: '#F07070',
          bg: '#280A0A',
        },
        blue: {
          custom: '#5BA8E8',
          bg: '#071828',
        },
        purple: {
          custom: '#C4A8E8',
          bg: '#160828',
        },
        nudge: {
          bg: '#241A08',
          border: '#F5B942',
        },
        sidebar: '#070F1C',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,.35), 0 1px 3px rgba(0,0,0,.25)',
        md: '0 6px 20px rgba(0,0,0,.45), 0 2px 6px rgba(0,0,0,.3)',
      },
    },
  },
  plugins: [],
}
