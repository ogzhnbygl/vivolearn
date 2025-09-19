"use client";

import { useState, useTransition } from "react";
import { registerAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export function RegisterForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await registerAction({ fullName, email, password });
          if (result?.error) {
            setError(result.error);
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="fullName">Ad Soyad</Label>
        <Input
          id="fullName"
          name="fullName"
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Adınızı girin"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Üniversite e-posta adresi</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="ornek@medeniyet.edu.tr"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Şifre</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Kayıt yapılıyor..." : "Kayıt Ol"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-sm text-slate-600">
        Zaten hesabınız var mı? <Link href="/login" className="text-primary-600">Giriş yapın</Link>
      </p>
    </form>
  );
}
