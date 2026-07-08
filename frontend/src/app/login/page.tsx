'use client';

import { motion } from 'framer-motion';
import { Eye, EyeOff, KeyRound, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { getBootstrapStatus, login, registerAdmin } from '../../services/auth-client';
import { saveSession } from '../../lib/session-store';

type AuthMode = 'login' | 'register';

type LoginForm = {
  email: string;
  password: string;
};

type RegisterForm = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);
  const [registerPasswordVisible, setRegisterPasswordVisible] = useState(false);
  const [registerConfirmVisible, setRegisterConfirmVisible] = useState(false);
  const [canRegisterAdmin, setCanRegisterAdmin] = useState(false);
  const [bootstrapLoaded, setBootstrapLoaded] = useState(false);

  const loginForm = useForm<LoginForm>({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const registerForm = useForm<RegisterForm>({
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  useEffect(() => {
    getBootstrapStatus()
      .then((status) => {
        setCanRegisterAdmin(status.canRegisterAdmin);
        if (!status.canRegisterAdmin) {
          setMode('login');
        }
      })
      .catch(() => setCanRegisterAdmin(false))
      .finally(() => setBootstrapLoaded(true));
  }, []);

  function submitLogin(values: LoginForm) {
    setError(null);

    startTransition(async () => {
      try {
        const session = await login(values.email.trim().toLowerCase(), values.password);
        saveSession(session);
        router.push('/farms');
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : 'Connexion impossible');
      }
    });
  }

  function submitRegister(values: RegisterForm) {
    if (values.password !== values.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const session = await registerAdmin({
          fullName: values.fullName.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password
        });
        saveSession(session);
        router.push('/farms');
      } catch (submissionError) {
        const rawMessage =
          submissionError instanceof Error ? submissionError.message : 'Inscription impossible';
        setError(
          rawMessage.includes('Conflict') || rawMessage.includes('existe deja')
            ? 'La creation admin est fermee. Utilise un compte existant.'
            : rawMessage
        );
      }
    });
  }

  return (
    <main className="login-shell">
      <div className="login-atmosphere login-atmosphere-left" aria-hidden="true" />
      <div className="login-atmosphere login-atmosphere-right" aria-hidden="true" />
      <div className="login-atmosphere login-atmosphere-grid" aria-hidden="true" />

      <section className="login-stage">
        <motion.section
          className="hero-card login-hero-card login-hero-card-premium"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="login-hero-topline">
            <Badge variant="success">Accès sécurisé FERM+</Badge>
            <span className="login-hero-minor-note">Création admin verrouillée, propriétaires contrôlés.</span>
          </div>

          <div className="login-hero-copy-block">
            <p className="eyebrow">Accès sécurisé FERM+</p>
            <h1>Prenez la main sur votre plateforme agricole en quelques secondes.</h1>
            <p className="hero-copy">
              La création libre est réservée au premier administrateur. Les propriétaires sont ensuite rattachés
              depuis l&apos;espace d&apos;administration.
            </p>
          </div>

          <div className="login-hero-pills">
            <span className="module-detail-chip">Admin unique</span>
            <span className="module-detail-chip">Propriétaires rattachés</span>
            <span className="module-detail-chip">Mobile prêt</span>
          </div>

          <div className="login-hero-foot" aria-hidden="true">
            <div className="login-hero-lines">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="login-hero-nature">
              <span className="login-leaf login-leaf-a" />
              <span className="login-leaf login-leaf-b" />
              <span className="login-leaf login-leaf-c" />
            </div>
          </div>
        </motion.section>

        <motion.section
          className="panel auth-panel auth-panel-premium login-auth-card"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <div className="auth-panel-highlight">
            <KeyRound className="h-4 w-4" />
            <span>Connexion rapide, création admin verrouillée, accès propriétaire contrôlé.</span>
          </div>

          <div className="auth-mode-switch">
            <button
              type="button"
              className={mode === 'login' ? 'auth-mode-button active' : 'auth-mode-button'}
              onClick={() => {
                setError(null);
                setMode('login');
              }}
            >
              Connexion
            </button>
            {canRegisterAdmin ? (
              <button
                type="button"
                className={mode === 'register' ? 'auth-mode-button active' : 'auth-mode-button'}
                onClick={() => {
                  setError(null);
                  setMode('register');
                }}
              >
                Premier admin
              </button>
            ) : null}
          </div>

          {mode === 'login' ? (
            <>
              <p className="eyebrow">Connexion</p>
              <h2>Accéder à votre espace FERM+</h2>
              <p className="muted">
                Connectez-vous avec un compte administrateur ou un compte propriétaire déjà créé.
              </p>
              {!bootstrapLoaded ? <p className="muted">Vérification de l&apos;accès administrateur...</p> : null}
              <form className="stack-form" onSubmit={loginForm.handleSubmit(submitLogin)}>
                <label className="field">
                  <span>Email</span>
                  <input {...loginForm.register('email', { required: true })} type="email" autoComplete="email" />
                </label>
                <label className="field">
                  <span>Mot de passe</span>
                  <div className="password-field">
                    <input
                      {...loginForm.register('password', { required: true })}
                      type={loginPasswordVisible ? 'text' : 'password'}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setLoginPasswordVisible((current) => !current)}
                      aria-label={loginPasswordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {loginPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
                {error ? <p className="error-text">{error}</p> : null}
                <div className="hero-actions">
                  <Button type="submit" disabled={isPending} className="auth-submit-button">
                    <KeyRound className="h-4 w-4" />
                    {isPending ? 'Connexion...' : 'Se connecter'}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <p className="eyebrow">Premier administrateur</p>
              <h2>Créer le premier compte de votre organisation</h2>
              <p className="muted">
                Cette création n&apos;est possible que lorsqu&apos;aucun administrateur actif n&apos;existe encore.
              </p>
              <form className="stack-form" onSubmit={registerForm.handleSubmit(submitRegister)}>
                <div className="field-grid">
                  <label className="field">
                    <span>Nom complet</span>
                    <input
                      {...registerForm.register('fullName', { required: true, minLength: 3 })}
                      type="text"
                      autoComplete="name"
                    />
                  </label>
                  <label className="field">
                    <span>Email</span>
                    <input {...registerForm.register('email', { required: true })} type="email" autoComplete="email" />
                  </label>
                </div>
                <div className="field-grid">
                  <label className="field">
                    <span>Mot de passe</span>
                    <div className="password-field">
                      <input
                        {...registerForm.register('password', { required: true, minLength: 8 })}
                        type={registerPasswordVisible ? 'text' : 'password'}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setRegisterPasswordVisible((current) => !current)}
                        aria-label={registerPasswordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      >
                        {registerPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>
                  <label className="field">
                    <span>Confirmer le mot de passe</span>
                    <div className="password-field">
                      <input
                        {...registerForm.register('confirmPassword', { required: true })}
                        type={registerConfirmVisible ? 'text' : 'password'}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setRegisterConfirmVisible((current) => !current)}
                        aria-label={registerConfirmVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      >
                        {registerConfirmVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>
                </div>
                {error ? <p className="error-text">{error}</p> : null}
                <div className="hero-actions">
                  <Button type="submit" disabled={isPending} className="auth-submit-button">
                    <UserPlus className="h-4 w-4" />
                    {isPending ? 'Création...' : 'Créer le compte admin'}
                  </Button>
                </div>
              </form>
              <div className="table-list auth-summary-list">
                <article className="table-row auth-summary-row">
                  <strong>Rôle créé</strong>
                  <span>Administrateur uniquement</span>
                </article>
                <article className="table-row auth-summary-row">
                  <strong>Prochaine étape</strong>
                  <span>Configurer la ferme puis créer les propriétaires depuis l&apos;espace admin.</span>
                </article>
              </div>
            </>
          )}
        </motion.section>
      </section>
    </main>
  );
}
