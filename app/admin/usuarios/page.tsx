// app/admin/usuarios/page.tsx
// Gestión de usuarios del backoffice. Solo para SUPERADMIN: cualquier otro
// usuario que llegue aquí (p. ej. escribiendo la URL) vuelve al dashboard.
// La API (/api/users) hace su propia comprobación de rol.

import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { listUsers } from "@/lib/services/user.service";
import UsersManager from "./users-manager";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const admin = await requireSuperadmin();
  if (!admin) redirect("/admin");

  const users = await listUsers();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-stone-800">Usuarios</h1>
        <p className="text-sm text-stone-500 mt-1">
          Cuentas con acceso al panel. Los usuarios que crees tienen acceso completo, salvo
          a esta sección.
        </p>
      </div>
      <UsersManager
        currentUserId={admin.id}
        initialUsers={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
      />
    </div>
  );
}
