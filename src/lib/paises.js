// Convierte un código ISO de 2 letras (CO, MX...) en el emoji de bandera
// correspondiente, sin necesitar ningún asset de imagen.
export function flagEmoji(code) {
  if (!code || code.length !== 2) return null;
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export function hexToRgba(hex, alpha = 0.16) {
  const clean = (hex || "#9CA3AF").replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export async function fetchPaises(supabase) {
  const { data } = await supabase.from("paises").select("*").order("name");
  return data ?? [];
}
