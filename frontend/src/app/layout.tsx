import type { ReactNode } from 'react';
import { ThemeProvider } from '../components/theme-provider';
import { ToastProvider } from '../components/ui/toast-provider';
import '../styles/globals.css';

export const metadata = {
  title: 'FERM+',
  description: "Plateforme intelligente de gestion agricole et d'élevage"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
