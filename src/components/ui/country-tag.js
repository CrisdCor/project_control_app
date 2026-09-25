import { hexToRgba } from "@/lib/paises";

export function CountryTag({ pais, className = "" }) {
  if (!pais) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}
      style={{ backgroundColor: hexToRgba(pais.color), color: pais.color }}
    >
      {pais.code && <span className="font-bold">{pais.code}</span>}
      {pais.name}
    </span>
  );
}

// Versión compacta: solo el código ISO, coloreado con el color del país, en
// forma de etiqueta. Pensada para filas densas donde el nombre completo no cabe.
// Siempre reserva el mismo ancho (incluso sin país/código), para que el resto
// de la fila —checkbox, texto, fecha— quede alineado como columnas de tabla.
export function CountryCodeTag({ pais, className = "" }) {
  return (
    <span
      className={`inline-flex w-9 shrink-0 items-center justify-center whitespace-nowrap rounded px-1 py-0.5 text-[10px] font-bold leading-none ${className}`}
      style={pais?.code ? { backgroundColor: hexToRgba(pais.color), color: pais.color } : undefined}
      title={pais?.name}
    >
      {pais?.code ?? ""}
    </span>
  );
}
