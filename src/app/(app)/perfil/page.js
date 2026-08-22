"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function PerfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, name, email, area, role, photo_url")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setProfile(data);
        setName(data.name ?? "");
        setArea(data.area ?? "");
      }
    })();
  }, []);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    setMessage(null);
    setError(null);

    const supabase = createClient();
    const patch = { name, area };

    if (photoFile) {
      const ext = photoFile.name.split(".").pop() || "jpg";
      const path = `${profile.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, photoFile, { upsert: true, contentType: photoFile.type });

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(path);
        patch.photo_url = `${publicUrl}?t=${Date.now()}`;
      }
    }

    const { error: updateError } = await supabase.from("profiles").update(patch).eq("id", profile.id);
    setSavingProfile(false);
    if (updateError) {
      setError("No se pudo guardar el perfil.");
      return;
    }
    setPhotoFile(null);
    setMessage("Perfil actualizado.");
    router.refresh();
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSavingPassword(true);
    const supabase = createClient();
    const { error: pwError } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);

    if (pwError) {
      setError("No se pudo actualizar la contraseña.");
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setMessage("Contraseña actualizada.");
  }

  if (!profile) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      {message && <p className="text-sm text-status-done">{message}</p>}
      {error && <p className="text-sm text-status-overdue">{error}</p>}

      <form
        onSubmit={handleSaveProfile}
        className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-sm"
      >
        <h2 className="text-sm font-semibold">Mi información</h2>

        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-neutral-200">
            {photoPreview || profile.photo_url ? (
              <Image
                src={photoPreview || profile.photo_url}
                alt={profile.name}
                fill
                className="object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-lg font-medium text-neutral-500">
                {profile.name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Foto de perfil</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setPhotoFile(file);
                setPhotoPreview(file ? URL.createObjectURL(file) : null);
              }}
              className="text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Usuario (correo)</label>
          <input
            value={profile.email}
            disabled
            className="rounded-md border border-border bg-neutral-50 px-3 py-2 text-sm text-muted-foreground"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Área</label>
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>

        <button
          type="submit"
          disabled={savingProfile}
          className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          {savingProfile ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>

      <form
        onSubmit={handleChangePassword}
        className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-sm"
      >
        <h2 className="text-sm font-semibold">Cambiar contraseña</h2>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Nueva contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Confirmar contraseña</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>

        <button
          type="submit"
          disabled={savingPassword}
          className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          {savingPassword ? "Actualizando..." : "Actualizar contraseña"}
        </button>
      </form>
    </div>
  );
}
