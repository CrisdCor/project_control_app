import { hexToRgba } from "@/lib/paises";

export function AreaTag({ area, className = "" }) {
  if (!area) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}
      style={{ backgroundColor: hexToRgba(area.color), color: area.color }}
    >
      {area.name}
    </span>
  );
}
