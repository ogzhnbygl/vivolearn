"use client";

import { useTransition } from "react";
import { updateUserRoleAction } from "@/app/actions/admin";
import type { Database } from "@/lib/database.types";

interface RoleSelectProps {
  userId: string;
  currentRole: Database["public"]["Enums"]["user_role"];
}

const roleLabels: Record<Database["public"]["Enums"]["user_role"], string> = {
  student: "Öğrenci",
  instructor: "Eğitmen",
  admin: "Admin",
};

export function RoleSelect({ userId, currentRole }: RoleSelectProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
      defaultValue={currentRole}
      disabled={isPending}
      onChange={(event) => {
        const nextRole = event.target.value as Database["public"]["Enums"]["user_role"];
        startTransition(async () => {
          await updateUserRoleAction({ userId, role: nextRole });
        });
      }}
    >
      {Object.entries(roleLabels).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
