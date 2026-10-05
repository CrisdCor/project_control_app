import nextConfig from "eslint-config-next";

// tablet-app contiene el contenedor Android (Capacitor), no código de la app web
const config = [{ ignores: ["tablet-app/**"] }, ...nextConfig];

export default config;
