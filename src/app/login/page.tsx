import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

export const metadata = {
  title: "Giriş Yap | VivoLearn",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirectTo } = await searchParams;

  return (
    <Container className="flex justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">VivoLearn&apos;e Giriş</CardTitle>
          <p className="text-sm text-slate-600">
            Üniversite e-posta adresiniz ve oluşturduğunuz şifre ile giriş yapabilirsiniz.
          </p>
        </CardHeader>
        <CardContent>
          <LoginForm redirectTo={redirectTo} />
        </CardContent>
      </Card>
    </Container>
  );
}
