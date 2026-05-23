export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
      boxShadow: {
        glow: '0 0 30px rgba(236, 72, 153, .22)',
        soft: '0 18px 60px rgba(15, 23, 42, .18)'
      },
      animation: {
        floaty: 'floaty 7s ease-in-out infinite',
        rain: 'rain 1.7s linear infinite',
        pulseSoft: 'pulseSoft 2.4s ease-in-out infinite'
      },
      keyframes: {
        floaty: {'0%,100%': {transform: 'translateY(0)'}, '50%': {transform: 'translateY(-12px)'}},
        rain: {'0%': {transform: 'translateY(-24px)'}, '100%': {transform: 'translateY(110vh)'}},
        pulseSoft: {'0%,100%': {opacity: .68}, '50%': {opacity: 1}}
      }
    }
  },
  plugins: []
}
