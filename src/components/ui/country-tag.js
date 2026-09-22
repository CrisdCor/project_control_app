import { flagEmoji, hexToRgba } from "@/lib/paises";

export function CountryTag({ pais, className = "" }) {
  if (!pais) return null;
  const flag = flagEmoji(pais.code);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}
      style={{ backgroundColor: hexToRgba(pais.color), color: pais.color }}
    >
      {flag && <span>{flag}</span>}
      {pais.name}
    </span>
  );
}

// Versión compacta: solo el código ISO, coloreado con el color del país, en
// forma de etiqueta. Pensada para filas densas donde el nombre completo no cabe.
// No se muestra para "General" (sin código) para no saturar el caso por defecto.
export function CountryCodeTag({ pais, className = "" }) {
  if (!pais?.code) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold leading-none ${className}`}
      style={{ backgroundColor: hexToRgba(pais.color), color: pais.color }}
      title={pais.name}
    >
      {pais.code}
    </span>
  );
}
