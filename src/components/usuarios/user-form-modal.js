"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { createUserAction, updateUserAction } from "@/app/(app)/usuarios/actions";

export function UserFormModal({ open, onClose, user, onSaved }) {
  const isEdit = Boolean(user);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [area, setArea] = useState(user?.area ?? "");
  const [role, setRole] = useState(user?.role ?? "gestor");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function resetAndClose() {
    setName("");
    setEmail("");
    setArea("");
    setRole("gestor");
    setPassword("");
    setPhotoFile(null);
    setError(null);
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("email", email);
    formData.set("area", area);
    formData.set("role", role);
    if (password) formData.set("password", password);
    if (photoFile) formData.set("photo", photoFile);
    if (isEdit) formData.set("id", user.id);

    const result = isEdit ? await updateUserAction(formData) : await createUserAction(formData);
    setSaving(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    onSaved();
    resetAndClose();
  }

  return (
    <Modal open={open} onClose={resetAndClose} title={isEdit ? "Editar usuario" : "Crear usuario"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Nombre</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Usuario (correo)</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-sm font-medium">Área</label>
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-sm font-medium">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
            >
              <option value="gestor">Gestor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">
            {isEdit ? "Nueva contraseña (opcional)" : "Contraseña"}
          </label>
          <div className="relative">
            <input
              required={!isEdit}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-white px-3 py-2 pr-10 text-sm outline-none focus:border-foreground"
              placeholder={isEdit ? "Dejar en blanco para no cambiar" : "••••••••"}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Foto (opcional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </div>

        {error && <p className="text-sm text-status-overdue">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="mt-1 rounded-md bg-black py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear usuario"}
        </button>
      </form>
    </Modal>
  );
}
