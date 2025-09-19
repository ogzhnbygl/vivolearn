import { Container } from "./container";

export function SiteFooter() {
  return (
    <footer className="border-t border-primary-100 bg-white/80 backdrop-blur">
      <Container className="flex flex-col gap-2 py-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>&copy; {new Date().getFullYear()} VivoLearn. Tüm hakları saklıdır.</p>
        <p>Medeniyet Üniversitesi Dijital Öğrenme Platformu</p>
      </Container>
    </footer>
  );
}
