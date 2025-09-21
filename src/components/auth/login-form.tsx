"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signInAction, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface LoginFormProps {
  redirectTo?: string;
}

const initialState: AuthFormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
    </Button>
  );
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [state, action] = useFormState(signInAction, initialState);

  return (
    <form className="flex flex-col gap-4" action={action}>
      <input type="hidden" name="redirectTo" value={redirectTo ?? ""} />
      <div className="space-y-2">
        <Label htmlFor="email">Üniversite e-posta adresi</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="ornek@medeniyet.edu.tr"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Şifre</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <SubmitButton />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <p className="text-sm text-slate-600">
        Hesabınız yok mu? <Link href="/register" className="text-primary-600">Hemen kayıt olun</Link>
      </p>
    </form>
  );
}
