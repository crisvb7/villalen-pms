// app/admin/usuarios/users-manager.tsx
"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";

interface UserRow {
  id: string;
  name: string;
  email: string | null;
  username: string | null;
  role: "SUPERADMIN" | "ADMIN";
  createdAt: string;
}

const MIN_PASSWORD_LENGTH = 8;

export default function UsersManager({
  currentUserId,
  initialUsers,
}: {
  currentUserId: string;
  initialUsers: UserRow[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createdMessage, setCreatedMessage] = useState("");

  async function reload() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers((await res.json()).data);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreatedMessage("");
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, login, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "No se pudo crear el usuario.");
        return;
      }
      setCreatedMessage(
        `Cuenta creada. ${data.data.name} ya puede entrar con «${data.data.email ?? data.data.username}» y la contraseña que has puesto.`
      );
      setName("");
      setLogin("");
      setPassword("");
      setShowPassword(false);
      await reload();
    } finally {
      setCreating(false);
    }
  }

  const isEmail = login.includes("@");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] items-start">
      {/* Nueva cuenta */}
      <form onSubmit={handleCreate} className="card p-6 space-y-4">
        <h2 className="font-serif text-lg text-stone-800">Nuevo usuario</h2>

        <div>
          <label className="label mb-1.5" htmlFor="new-name">Nombre</label>
          <input
            id="new-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="p. ej. María"
            required
          />
        </div>

        <div>
          <label className="label mb-1.5" htmlFor="new-login">Correo o usuario</label>
          <input
            id="new-login"
            className="input"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="maria@correo.com o maria"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            required
          />
          <p className="mt-1.5 text-xs text-stone-400">
            {login.trim()
              ? isEmail
                ? "Entrará con este correo."
                : "Entrará con este nombre de usuario."
              : "Con @ se usa como correo; sin @, como nombre de usuario."}
          </p>
        </div>

        <div>
          <label className="label mb-1.5" htmlFor="new-password">Contraseña</label>
          <div className="relative">
            <input
              id="new-password"
              className="input pr-20"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700"
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-stone-400">
            Mínimo {MIN_PASSWORD_LENGTH} caracteres. Compártela con la persona por un canal seguro.
          </p>
        </div>

        {createError && <p className="text-sm text-red-600">{createError}</p>}
        {createdMessage && <p className="text-sm text-emerald-700">{createdMessage}</p>}

        <button type="submit" className="btn-primary w-full py-3" disabled={creating}>
          {creating ? "Creando…" : "Crear usuario"}
        </button>
      </form>

      {/* Cuentas existentes */}
      <div className="card">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="font-serif text-lg text-stone-800">Cuentas ({users.length})</h2>
        </div>
        <ul className="divide-y divide-stone-100">
          {users.map((user) => (
            <UserItem
              key={user.id}
              user={user}
              isMe={user.id === currentUserId}
              onDeleted={() => setUsers((list) => list.filter((u) => u.id !== user.id))}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function UserItem({
  user,
  isMe,
  onDeleted,
}: {
  user: UserRow;
  isMe: boolean;
  onDeleted: () => void;
}) {
  const [mode, setMode] = useState<"idle" | "password" | "delete">("idle");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const isSuperadmin = user.role === "SUPERADMIN";

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: data.error ?? "No se pudo cambiar la contraseña." });
        return;
      }
      setMessage({ ok: true, text: "Contraseña cambiada." });
      setNewPassword("");
      setMode("idle");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: data.error ?? "No se pudo eliminar." });
        setMode("idle");
        return;
      }
      onDeleted();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-800">
            {user.name}
            {isMe && <span className="ml-2 text-xs font-normal text-stone-400">(tú)</span>}
          </p>
          <p className="text-xs text-stone-500">
            {user.email ? `Correo: ${user.email}` : `Usuario: ${user.username}`}
            {" · "}creada el {formatDate(user.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`badge ${
              isSuperadmin
                ? "bg-terracotta-100 text-terracotta-800 border-terracotta-200"
                : "bg-stone-100 text-stone-600 border-stone-200"
            }`}
          >
            {isSuperadmin ? "Superadministrador" : "Administrador"}
          </span>
          {!isSuperadmin && mode === "idle" && (
            <>
              <button
                type="button"
                className="chip bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                onClick={() => setMode("password")}
              >
                Cambiar contraseña
              </button>
              <button
                type="button"
                className="chip bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                onClick={() => setMode("delete")}
              >
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>

      {mode === "password" && (
        <form onSubmit={resetPassword} className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className="input w-auto flex-1 min-w-[200px] py-2"
            type="text"
            placeholder={`Nueva contraseña (mín. ${MIN_PASSWORD_LENGTH})`}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            required
            autoFocus
          />
          <button type="submit" className="btn-primary px-4 py-2 text-xs" disabled={busy}>
            Guardar
          </button>
          <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={() => setMode("idle")}>
            Cancelar
          </button>
        </form>
      )}

      {mode === "delete" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="text-sm text-red-600">
            ¿Eliminar la cuenta de {user.name}? Ya no podrá entrar.
          </p>
          <button type="button" className="btn-danger px-4 py-2 text-xs" onClick={remove} disabled={busy}>
            Sí, eliminar
          </button>
          <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={() => setMode("idle")}>
            Cancelar
          </button>
        </div>
      )}

      {message && (
        <p className={`mt-2 text-xs ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
    </li>
  );
}
