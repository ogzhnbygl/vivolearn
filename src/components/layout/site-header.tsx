import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "./container";
import type { Tables } from "@/lib/database.types";
import { LogoutButton } from "@/components/logout-button";

const navItems = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/courses", label: "Kurslar" },
];

type Profile = Tables<"profiles">;

interface SiteHeaderProps {
  profile: Profile | null;
}

export function SiteHeader({ profile }: SiteHeaderProps) {
  const isInstructor = profile?.role === "instructor" || profile?.role === "admin";
  const isAdmin = profile?.role === "admin";

  return (
    <header className="border-b border-primary-100 bg-white/80 backdrop-blur">
      <Container className="flex items-center justify-between py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold text-primary-800">
            VivoLearn
          </Link>
          <nav className="hidden gap-4 text-sm font-medium text-slate-600 md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-primary-700">
                {item.label}
              </Link>
            ))}
            {profile && (
              <Link href="/profile" className="hover:text-primary-700">
                Profilim
              </Link>
            )}
            {isInstructor && (
              <Link href="/instructor" className="hover:text-primary-700">
                Eğitmen Paneli
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin/users" className="hover:text-primary-700">
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {profile ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-slate-600 md:inline">
                {profile.full_name ?? profile.email}
              </span>
              <LogoutButton />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost">
                <Link href="/login">Giriş Yap</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Kayıt Ol</Link>
              </Button>
            </div>
          )}
        </div>
      </Container>
    </header>
  );
}
