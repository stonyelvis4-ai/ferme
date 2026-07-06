import Link from 'next/link';
import { Button } from '../components/ui/button';

export default function NotFoundPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">404</p>
        <h1>La page demandee est introuvable.</h1>
        <p className="hero-copy">
          Retourne au cockpit principal pour continuer la gestion de la ferme.
        </p>
        <div className="hero-actions">
          <Link href="/farms">
            <Button>Revenir aux fermes</Button>
          </Link>
          <Link href="/">
            <Button variant="secondary">Accueil</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
