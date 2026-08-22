"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    throw new Error("Solo el administrador puede gestionar usuarios.");
  }

  return user;
}

async function uploadPhotoIfPresent(admin, userId, formData) {
  const file = formData.get("photo");
  if (!file || typeof file === "string" || file.size === 0) return null;

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/avatar.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await admin.storage
    .from("avatars")
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true });

  if (error) return null;

  const {
    data: { publicUrl },
  } = admin.storage.from("avatars").getPublicUrl(path);

  return publicUrl;
}

export async function createUserAction(formData) {
  await requireAdmin();
  const admin = createAdminClient();

  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const area = formData.get("area")?.toString().trim() || null;
  const role = formData.get("role")?.toString();
  const password = formData.get("password")?.toString();

  if (!name || !email || !password || !role) {
    return { error: "Completa nombre, correo, contraseña y rol." };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    return { error: `No se pudo crear el usuario: ${createError.message}` };
  }

  const newUserId = created.user.id;
  const photoUrl = await uploadPhotoIfPresent(admin, newUserId, formData);

  const { error: profileError } = await admin.from("profiles").insert({
    id: newUserId,
    name,
    email,
    area,
    role,
    photo_url: photoUrl,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(newUserId);
    return { error: "No se pudo crear el perfil del usuario." };
  }

  revalidatePath("/usuarios");
  return { success: true };
}

export async function updateUserAction(formData) {
  await requireAdmin();
  const admin = createAdminClient();

  const id = formData.get("id")?.toString();
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const area = formData.get("area")?.toString().trim() || null;
  const role = formData.get("role")?.toString();
  const newPassword = formData.get("password")?.toString();

  if (!id || !name || !email || !role) {
    return { error: "Faltan datos obligatorios." };
  }
  if (newPassword && newPassword.length > 0 && newPassword.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const authUpdate = { email };
  if (newPassword) authUpdate.password = newPassword;

  const { error: authError } = await admin.auth.admin.updateUserById(id, authUpdate);
  if (authError) {
    return { error: `No se pudo actualizar el usuario: ${authError.message}` };
  }

  const photoUrl = await uploadPhotoIfPresent(admin, id, formData);

  const patch = { name, email, area, role };
  if (photoUrl) patch.photo_url = photoUrl;

  const { error: profileError } = await admin.from("profiles").update(patch).eq("id", id);
  if (profileError) {
    return { error: "No se pudo actualizar el perfil." };
  }

  revalidatePath("/usuarios");
  return { success: true };
}

export async function deleteUserAction(id) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    if (error.message?.toLowerCase().includes("foreign key")) {
      return {
        error:
          "No se puede eliminar: el usuario está asignado como líder de uno o más proyectos. Reasígnalos primero.",
      };
    }
    return { error: `No se pudo eliminar el usuario: ${error.message}` };
  }

  revalidatePath("/usuarios");
  return { success: true };
}
