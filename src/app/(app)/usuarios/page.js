"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { UserFormModal } from "@/components/usuarios/user-form-modal";
import { deleteUserAction } from "@/app/(app)/usuarios/actions";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { PlusIcon } from "@/components/icons";

export default function UsuariosPage() {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(null); // null = cargando
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  async function load() {
    const supabase = createClient();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      setIsAdmin(profile?.role === "admin");
    }

    const { data } = await supabase.from("profiles").select("*").order("name");
    setUsers(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = users;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (roleFilter) list = list.filter((u) => u.role === roleFilter);
    return list;
  }, [users, search, roleFilter]);

  async function handleDelete(user) {
    setDeleteError(null);
    if (user.id === currentUserId) {
      setDeleteError("No puedes eliminar tu propio usuario.");
      return;
    }
    setDeletingId(user.id);
    const result = await deleteUserAction(user.id);
    setDeletingId(null);
    if (result?.error) {
      setDeleteError(result.error);
      return;
    }
    load();
  }

  if (isAdmin === false) {
    return <p className="text-sm text-muted-foreground">No tienes acceso a esta sección.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o correo..."
          className="w-64 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
        />

        <FilterDropdown
          placeholder="Todos los roles"
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value: "admin", label: "Administrador" },
            { value: "gestor", label: "Gestor" },
          ]}
        />

        <button
          onClick={() => {
            setEditingUser(null);
            setModalOpen(true);
          }}
          className="ml-auto flex items-center gap-1.5 rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          <PlusIcon />
          Crear usuario
        </button>
      </div>

      {deleteError && <p className="text-sm text-status-overdue">{deleteError}</p>}

      <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-sm">
        {loading ? (
          <p className="p-5 text-sm text-muted-foreground">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No hay usuarios que coincidan con los filtros.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Usuario</th>
                <th className="px-5 py-3 font-medium">Correo</th>
                <th className="px-5 py-3 font-medium">Área</th>
                <th className="px-5 py-3 font-medium">Rol</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-neutral-200">
                        {u.photo_url ? (
                          <Image src={u.photo_url} alt={u.name} fill className="object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[10px] font-medium text-neutral-500">
                            {u.name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-5 py-3 text-muted-foreground">{u.area || "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {u.role === "admin" ? "Administrador" : "Gestor"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setModalOpen(true);
                        }}
                        className="rounded-md border border-border px-2.5 py-1 text-xs transition hover:bg-neutral-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={deletingId === u.id}
                        className="rounded-md border border-status-overdue/40 px-2.5 py-1 text-xs text-status-overdue transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === u.id ? "Eliminando..." : "Eliminar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <UserFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        user={editingUser}
        onSaved={load}
      />
    </div>
  );
}
