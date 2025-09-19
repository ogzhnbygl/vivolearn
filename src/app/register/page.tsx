import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
  title: "Kayıt Ol | VivoLearn",
};

export default function RegisterPage() {
  return (
    <Container className="flex justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">VivoLearn&apos;e Kayıt Ol</CardTitle>
          <p className="text-sm text-slate-600">
            Üniversite e-posta adresiniz ile hesap oluşturun ve derslere erişim için başvuru yapın.
          </p>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </Container>
  );
}
