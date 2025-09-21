"use client";

import { useFormStatus } from "react-dom";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="ghost" disabled={pending}>
      {pending ? "Çıkış yapılıyor" : "Çıkış"}
    </Button>
  );
}

export function LogoutButton() {
  return (
    <form action={signOutAction} className="flex items-center">
      <SubmitButton />
    </form>
  );
}
