/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0edff',
          100: '#e2dbff',
          200: '#c5b7ff',
          300: '#a893ff',
          400: '#8b6fff',
          500: '#6e4bff',
          600: '#5835e0',
          700: '#4227b8',
          800: '#2d1990',
          900: '#1a0d6b',
        },
        surface: {
          50:  'rgba(255,255,255,0.08)',
          100: 'rgba(255,255,255,0.06)',
          200: 'rgba(255,255,255,0.04)',
          300: 'rgba(255,255,255,0.02)',
        },
        dark: {
          50:  '#18181f',
          100: '#14141a',
          200: '#101015',
          300: '#0c0c10',
          400: '#08080b',
          500: '#050507',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #6e4bff 0%, #4dd0ff 50%, #2bf2c0 100%)',
        'gradient-card':  'linear-gradient(135deg, rgba(110,75,255,0.15), rgba(77,208,255,0.1))',
        'gradient-glow':  'radial-gradient(circle at 50% 0%, rgba(110,75,255,0.3) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-sm':  '0 0 16px rgba(110,75,255,0.35)',
        'glow-md':  '0 0 32px rgba(110,75,255,0.45)',
        'glow-lg':  '0 0 64px rgba(110,75,255,0.5)',
        'glass':    '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
        'glass-lg': '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
      },
      backdropBlur: {
        xs: '4px',
        '3xl': '64px',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'fade-in':       'fadeIn 0.4s ease forwards',
        'slide-up':      'slideUp 0.4s ease forwards',
        'slide-in':      'slideIn 0.3s ease forwards',
        'float':         'float 6s ease-in-out infinite',
        'pulse-glow':    'pulseGlow 2s ease-in-out infinite',
        'spin-slow':     'spin 8s linear infinite',
        'gradient':      'gradient 6s ease infinite',
        'shimmer':       'shimmer 2.5s infinite',
        'bounce-gentle': 'bounceGentle 2s ease-in-out infinite',
        'scale-in':      'scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'confetti':      'confetti 0.8s ease-out forwards',
      },
      keyframes: {
        fadeIn:   { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:  { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn:  { from: { opacity: '0', transform: 'translateX(-20px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        float:    { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-20px)' } },
        pulseGlow:{ '0%,100%': { boxShadow: '0 0 20px rgba(110,75,255,0.4)' }, '50%': { boxShadow: '0 0 40px rgba(110,75,255,0.8)' } },
        gradient: { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        shimmer:  { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        bounceGentle: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        scaleIn:  { from: { opacity: '0', transform: 'scale(0.85)' }, to: { opacity: '1', transform: 'scale(1)' } },
        confetti: { '0%': { transform: 'scale(0) rotate(0deg)', opacity: '1' }, '100%': { transform: 'scale(1.5) rotate(720deg)', opacity: '0' } },
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
