// Nota: no usamos emoji de bandera — en varios sistemas no se renderiza como
// gráfico y cae a las letras del código ISO como respaldo, lo cual generaba
// texto duplicado junto al código que ya mostrábamos explícitamente. La
// identificación visual del país se resuelve con el código ISO coloreado
// (ver CountryTag / CountryCodeTag).

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
