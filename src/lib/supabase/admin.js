import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente con privilegios elevados (service role). Bypassa RLS.
// Úsalo únicamente dentro de Server Actions/Route Handlers, después de
// verificar explícitamente que quien llama es administrador.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY en el servidor."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
