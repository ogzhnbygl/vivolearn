import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth";

const navItems = [
  { href: "/instructor", label: "Kurslarım" },
  { href: "/instructor/courses/new", label: "Yeni Kurs" },
  { href: "/instructor/applications", label: "Başvurular" },
];

export default async function InstructorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile || (profile.role !== "instructor" && profile.role !== "admin")) {
    redirect("/profile");
  }

  return (
    <div className="bg-white/60">
      <Container className="flex flex-col gap-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-primary-900">Eğitmen Paneli</h1>
            <p className="text-sm text-slate-600">
              Kurs oluşturun, ders ekleyin ve öğrenci başvurularını yönetin.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Button key={item.href} asChild variant="secondary">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-primary-100 bg-white/80 p-6 shadow">
          {children}
        </div>
      </Container>
    </div>
  );
}
