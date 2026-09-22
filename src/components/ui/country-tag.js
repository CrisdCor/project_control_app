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
