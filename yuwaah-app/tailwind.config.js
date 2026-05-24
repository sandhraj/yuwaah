/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        orange: {
          DEFAULT: '#E8601C',
          light: '#FDF0E9',
          dim: '#F0824A',
        },
        bg: {
          DEFAULT: '#FFFFFF',
          2: '#F7F7F6',
          3: '#EFEFED',
        },
        border: {
          DEFAULT: '#E4E4E2',
          2: '#D0D0CE',
        },
        text: {
          DEFAULT: '#1A1A18',
          2: '#6B6B68',
          3: '#9B9B98',
        },
        green: {
          DEFAULT: '#0F6E56',
          bg: '#E1F5EE',
          border: '#9FE1CB',
        },
        amber: {
          custom: '#854F0B',
          bg: '#FAEEDA',
        },
        red: {
          custom: '#A32D2D',
          bg: '#FCEBEB',
        },
        blue: {
          custom: '#185FA5',
          bg: '#E6F1FB',
        },
        purple: {
          custom: '#6B2FA0',
          bg: '#F0E6FF',
        },
        nudge: {
          bg: '#FFFBF0',
          border: '#F5B942',
        },
        sidebar: '#1A1A18',
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
        card: '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
        md: '0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04)',
      },
    },
  },
  plugins: [],
}
