import "./globals.css";

export const metadata = {
  title: "Control de Proyectos",
  description: "Plataforma de control y seguimiento de proyectos — Veloces",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
