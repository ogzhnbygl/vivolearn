import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleSelect } from "@/components/admin/role-select";
import type { Tables } from "@/lib/database.types";

export const metadata = {
  title: "Kullanıcı Rolleri | VivoLearn",
};

export default async function AdminUsersPage() {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "admin") {
    redirect("/profile");
  }

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  const users = (data ?? []) as Tables<"profiles">[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kullanıcı Rol Yönetimi</CardTitle>
        <p className="text-sm text-slate-600">
          Kullanıcıların yetkilerini değiştirin. Eğitmen rolü verilen kullanıcılar kurs açabilir.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Ad Soyad</TableHeaderCell>
              <TableHeaderCell>E-posta</TableHeaderCell>
              <TableHeaderCell>Rol</TableHeaderCell>
              <TableHeaderCell>Oluşturulma</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.full_name ?? "-"}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <RoleSelect userId={user.id} currentRole={user.role} />
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString("tr-TR")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
