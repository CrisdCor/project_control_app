export async function fetchAreas(supabase) {
  const { data } = await supabase.from("areas").select("*").order("name");
  return data ?? [];
}
