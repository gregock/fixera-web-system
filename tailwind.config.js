module.exports = {
  darkMode: "class",
  content: ["./src/**/*.html"], // TEMP: excluir JS para evitar error de Sucrase
  safelist: [
    // Utilidades dinámicas controladas por JS / variantes
    "hidden",
    "block",
    "fixed",
    "inset-0",
    "overflow-hidden",
    "md:flex",
    "rounded-xl",
    "text-white",
    "bg-blue-600",
    "bg-blue-700",
    "translate-x-full",
    "translate-x-0",
    "opacity-0",
    "opacity-100",
    "transition-transform",
    "transition-opacity",
    "duration-300",
    "ease-in-out",
    "group-aria-expanded:rotate-180",

    // Clases de componentes construidas con @apply
    "btn-primary",
    "card-standard",
    "show-more-btn",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1rem",
        md: "1.25rem",
        lg: "1.5rem",
        xl: "2rem",
      },
    },
    extend: {
      colors: {
        primary: "#1e3a8a",
        "primary-hover": "#1d4ed8",
        "gray-dark": "#1e293b",
        "gray-medium": "#4b5563",
        "gray-light": "#f9fafb",
      },
      fontFamily: {
        base: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
