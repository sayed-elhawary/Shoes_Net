/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'custom-dark': '#1F1F2E',
        'custom-gray': '#374151',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
  corePlugins: {
    preflight: true,
    direction: ['ltr', 'rtl'],
  },
};
