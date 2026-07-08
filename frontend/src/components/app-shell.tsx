'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useDeferredValue, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  CloudOff,
  ChevronLeft,
  ChevronsUpDown,
  CircleUserRound,
  ClipboardList,
  Eye,
  EyeOff,
  Egg,
  FileSpreadsheet,
  Fish,
  HeartPulse,
  LayoutDashboard,
  KeyRound,
  Menu,
  MoonStar,
  Package,
  PlusCircle,
  Search,
  Settings,
  Sparkles,
  Sprout,
  SunMedium,
  TentTree,
  Wallet,
  Warehouse
} from 'lucide-react';
import { useSession } from '../hooks/use-session';
import { useAlertSound } from '../hooks/use-alert-sound';
import { useNetworkStatus } from '../hooks/use-network-status';
import { clearSession } from '../lib/session-store';
import { changeAdminPassword, logout } from '../services/auth-client';
import { getFarmDashboard, getFarms, type FarmSummary } from '../services/farm-client';
import { cn } from '../lib/cn';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useToast } from './ui/toast-provider';

type NavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  href?: string;
  slug?: string;
  adminOnly?: boolean;
};

const navGroups: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Tableau de bord',
    items: [{ label: 'Tableau de bord', slug: 'dashboard', icon: LayoutDashboard }]
  },
  {
    title: 'Gestion',
    items: [
      { label: 'Fermes', href: '/farms', icon: Sprout },
      { label: 'Animaux', slug: 'livestock', icon: CircleUserRound },
      { label: 'Cultures', slug: 'crops', icon: Sprout },
      { label: 'Production', slug: 'production', icon: Package },
      { label: 'Pisciculture', slug: 'pisciculture', icon: Fish },
      { label: 'Pondeuses', slug: 'layers/production', icon: Egg },
      { label: 'Parcelles', slug: 'plots', icon: LayoutDashboard },
      { label: 'Infrastructures', slug: 'facilities', icon: TentTree },
      { label: 'Stocks', slug: 'inventory', icon: Warehouse },
      { label: 'Finances', slug: 'finance', icon: Wallet }
    ]
  },
  {
    title: 'Planification',
    items: [
      { label: 'Agenda', slug: 'agenda', icon: ClipboardList },
      { label: 'Alertes', slug: 'alerts', icon: Bell },
      { label: 'Sanitaire', slug: 'sanitary', icon: HeartPulse }
    ]
  },
  {
    title: 'Analyse',
    items: [
      { label: 'Rapports', slug: 'reports', icon: FileSpreadsheet },
      { label: 'Recommandations', slug: 'recommendations', icon: Sparkles }
    ]
  },
  {
    title: 'Système',
    items: [
      { label: 'Paramètres', slug: 'settings', icon: Settings },
      { label: 'Utilisateurs', slug: 'users', icon: CircleUserRound, adminOnly: true },
      { label: 'Audit', slug: 'audit', icon: FileSpreadsheet, adminOnly: true },
      { label: 'Synchronisation', slug: 'sync', icon: CloudOff, adminOnly: true }
    ]
  }
];

function extractFarmId(pathname: string) {
  const match = pathname.match(/^\/farms\/([^/]+)/);
  return match?.[1] ?? '';
}

function resolveTaskComposerHref(pathname: string, farmId: string) {
  const taskModuleMap: Array<[RegExp, string, string]> = [
    [/\/layers\/pisciculture/, 'pisciculture', 'BASSIN'],
    [/\/pisciculture/, 'pisciculture', 'BASSIN'],
    [/\/layers\/production/, 'layers/production', 'PRODUCTION'],
    [/\/livestock/, 'livestock', 'LOT'],
    [/\/crops/, 'crops', 'CULTURE'],
    [/\/plots/, 'plots', 'PARCELLE'],
    [/\/facilities/, 'facilities', 'BATIMENT'],
    [/\/inventory/, 'inventory', 'STOCK'],
    [/\/finance/, 'finance', 'DEPENSE'],
    [/\/sanitary/, 'sanitary', 'SANITARY_EVENT'],
    [/\/alerts/, 'alerts', 'ALERTE'],
    [/\/reports/, 'reports', 'RAPPORT'],
    [/\/production/, 'production', 'PRODUCTION'],
    [/\/dashboard/, 'dashboard', 'FARM']
  ];

  const match = taskModuleMap.find(([pattern]) => pattern.test(pathname));
  const moduleName = match?.[1] ?? 'dashboard';
  const entityType = match?.[2] ?? 'FARM';

  return `/farms/${farmId}/agenda?compose=1&module=${encodeURIComponent(moduleName)}&entityType=${encodeURIComponent(entityType)}`;
}

export function AppShell({
  title,
  children,
  actions
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const session = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [compactHeader, setCompactHeader] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [farms, setFarms] = useState<FarmSummary[]>([]);
  const [activeFarmName, setActiveFarmName] = useState('Sélectionner une ferme');
  const [notificationCount, setNotificationCount] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [passwordPanelOpen, setPasswordPanelOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const { pushToast } = useToast();
  const { playAlertSound, primeAudio } = useAlertSound();
  const { online, queueCount } = useNetworkStatus();
  const previousNotificationCount = useRef<number | null>(null);
  const lastScrollY = useRef(0);

  const activeFarmId = useMemo(() => extractFarmId(pathname), [pathname]);
  const taskComposerHref = useMemo(
    () => (activeFarmId ? resolveTaskComposerHref(pathname, activeFarmId) : '/farms'),
    [activeFarmId, pathname]
  );
  const deferredSearchText = useDeferredValue(searchText);
  const isAdmin = session?.user.role === 'ADMIN';

  useEffect(() => {
    primeAudio();
  }, [primeAudio]);

  useEffect(() => {
    const updateHeaderState = () => {
      const isMobile = window.innerWidth <= 760;
      const scrollThreshold = isMobile ? 10 : 40;
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY.current;

      setCompactHeader(currentScrollY > scrollThreshold);
      setHeaderHidden(currentScrollY > (isMobile ? 84 : 120) && scrollingDown);
      lastScrollY.current = currentScrollY;
    };

    updateHeaderState();
    window.addEventListener('scroll', updateHeaderState, { passive: true });
    window.addEventListener('resize', updateHeaderState);

    return () => {
      window.removeEventListener('scroll', updateHeaderState);
      window.removeEventListener('resize', updateHeaderState);
    };
  }, []);

  useEffect(() => {
    if (!session?.token) {
      return;
    }

    getFarms(session.token)
      .then((response) => setFarms(response.items))
      .catch(() => setFarms([]));
  }, [session?.token]);

  useEffect(() => {
    if (!activeFarmId || !session?.token) {
      setActiveFarmName('Sélectionner une ferme');
      setNotificationCount(0);
      return;
    }

    const activeFarm = farms.find((item) => item.id === activeFarmId);
    if (activeFarm) {
      setActiveFarmName(activeFarm.name);
    }

    getFarmDashboard(activeFarmId, session.token)
      .then((dashboard) => setNotificationCount(dashboard.metrics.unreadAlerts))
      .catch(() => setNotificationCount(0));
  }, [activeFarmId, farms, session?.token]);

  useEffect(() => {
    if (previousNotificationCount.current !== null && notificationCount > previousNotificationCount.current) {
      void playAlertSound();
    }

    previousNotificationCount.current = notificationCount;
  }, [notificationCount, playAlertSound]);

  useEffect(() => {
    if (!isAdmin) {
      setPasswordPanelOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError(null);
      setShowPasswords(false);
    }
  }, [isAdmin]);

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);

    if (!session?.token) {
      setPasswordError('Session introuvable');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setPasswordSubmitting(true);
    try {
      await changeAdminPassword(
        {
          currentPassword,
          newPassword
        },
        session.token
      );

      await logout().catch(() => undefined);
      clearSession();
      pushToast({
        title: 'Mot de passe mis a jour',
        description: 'Reconnectez-vous avec votre nouveau mot de passe.',
        variant: 'success'
      });
      setPasswordPanelOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      window.setTimeout(() => {
        router.push('/login');
      }, 350);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de mettre a jour le mot de passe';
      setPasswordError(message);
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const filteredGroups = useMemo(() => {
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            (!item.adminOnly || isAdmin) &&
            (deferredSearchText ? item.label.toLowerCase().includes(deferredSearchText.toLowerCase()) : true)
        )
      }))
      .filter((group) => group.items.length > 0);
  }, [deferredSearchText, isAdmin]);
  const totalMatches = filteredGroups.reduce((total, group) => total + group.items.length, 0);
  const quickLinks = filteredGroups.flatMap((group) => group.items);

  return (
    <div className="app-shell">
      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="mobile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          />
        ) : null}
      </AnimatePresence>

      <motion.aside
        className={cn('sidebar-shell', collapsed && 'sidebar-collapsed', mobileOpen && 'sidebar-mobile-open')}
        animate={{ width: collapsed ? 94 : 288 }}
      >
        <div className="sidebar-top">
          <div className="brand-mark">
            <div className="brand-logo">F+</div>
            {!collapsed ? (
              <div>
                <p className="eyebrow">FERM+</p>
                <h2 className="sidebar-title">Agri Intelligence</h2>
              </div>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="desktop-only"
            onClick={() => setCollapsed((current) => !current)}
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </Button>
        </div>

        <div className="sidebar-search">
          <Search className="h-4 w-4 text-[var(--muted)]" />
          {!collapsed ? (
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Rechercher un module..."
            />
          ) : null}
        </div>

        <nav className="sidebar-groups">
          {filteredGroups.map((group) => (
            <div key={group.title} className="sidebar-group">
              {!collapsed ? <p className="sidebar-group-title">{group.title}</p> : null}
              <div className="sidebar-nav">
                {group.items.map((item) => {
                  const href = item.href ?? (activeFarmId ? `/farms/${activeFarmId}/${item.slug}` : '/farms');
                  const isActive =
                    pathname === href ||
                    (item.slug && pathname.includes(`/${item.slug}`)) ||
                    (item.href === '/farms' && pathname === '/farms');
                  const Icon = item.icon;

                  return (
                    <Link
                      key={`${group.title}-${item.label}`}
                      href={href}
                      className={cn('sidebar-link-modern', isActive && 'sidebar-link-active')}
                      onClick={() => setMobileOpen(false)}
                    >
                      <span className="sidebar-link-icon">
                        <Icon className="h-4 w-4" />
                      </span>
                      {!collapsed ? (
                        <>
                          <span>{item.label}</span>
                          {item.label === 'Alertes' && notificationCount > 0 ? (
                            <Badge variant="critical" className="ml-auto">
                              {notificationCount}
                            </Badge>
                          ) : null}
                        </>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          {!collapsed && deferredSearchText && totalMatches === 0 ? (
            <div className="sidebar-empty-state">
              <p className="eyebrow">Recherche</p>
              <strong>Aucun module trouve</strong>
              <span>Essaie par exemple dashboard, cultures, stocks ou agenda.</span>
            </div>
          ) : null}
        </nav>

        {!collapsed ? (
          <div className="sidebar-footer">
            <div>
              <p className="eyebrow">Compte</p>
              <p className="sidebar-user-name">{session?.user.fullName ?? 'Visiteur'}</p>
              <p className="sidebar-user-role">{session?.user.role ?? 'Aucun role'}</p>
            </div>
            <Button
              variant="secondary"
              className="w-full min-h-9 px-3 py-2 text-sm"
              onClick={async () => {
                const logoutFailed = await logout()
                  .then(() => false)
                  .catch(() => true);
                if (logoutFailed) {
                  pushToast({
                    title: 'Session fermee localement',
                    description: 'Le serveur n a pas confirme la deconnexion, mais la session locale a ete retiree.',
                    variant: 'info'
                  });
                }
                clearSession();
                router.push('/login');
              }}
            >
              Se deconnecter
            </Button>
          </div>
        ) : null}
      </motion.aside>

      <div className="workspace-shell">
        <header
          className={cn(
            'workspace-header-modern premium-card',
            compactHeader && 'workspace-header-compact',
            headerHidden && 'workspace-header-hidden'
          )}
        >
          <div className="header-main">
            <div className="header-left">
              <Button variant="secondary" size="icon" className="mobile-only" onClick={() => setMobileOpen(true)}>
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <p className="eyebrow">Workspace FERM+</p>
                <h1>{title}</h1>
              </div>
            </div>

            <div className="header-toolbar">
              <div className="header-controls">
                <label className="global-search">
                  <Search className="h-4 w-4" />
                  <input placeholder="Recherche globale, ferme, tâche, alerte..." />
                </label>

                <div className="farm-selector">
                  <Sprout className="h-4 w-4" />
                  <select
                    value={activeFarmId}
                    onChange={(event) => router.push(`/farms/${event.target.value}/dashboard`)}
                  >
                    <option value="">{activeFarmName}</option>
                    {farms.map((farm) => (
                      <option key={farm.id} value={farm.id}>
                        {farm.name}
                      </option>
                    ))}
                  </select>
                  <ChevronsUpDown className="h-4 w-4 text-[var(--muted)]" />
                </div>
              </div>

              <div className="header-utility-strip">
                <Button variant="secondary" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {notificationCount > 0 ? <span className="notification-dot">{notificationCount}</span> : null}
                </Button>

                <div className="theme-indicator">
                  <SunMedium className="h-4 w-4" />
                  <MoonStar className="h-4 w-4" />
                </div>

                <Badge variant={online ? 'success' : 'critical'} className="header-status-badge">
                  {online ? 'En ligne' : 'Hors-ligne'}
                  {queueCount > 0 ? ` · ${queueCount} en file` : ''}
                </Badge>

                {session?.user.role === 'ADMIN' && activeFarmId ? (
                  <Button
                    variant="secondary"
                    size="md"
                    className="header-inline-actions"
                    onClick={() => router.push(taskComposerHref)}
                  >
                    <PlusCircle className="h-4 w-4" />
                    Nouvelle tâche
                  </Button>
                ) : null}

                {isAdmin ? (
                  <Button
                    variant="secondary"
                    size="md"
                    className="header-inline-actions header-password-action"
                    onClick={() => setPasswordPanelOpen((current) => !current)}
                  >
                    <KeyRound className="h-4 w-4" />
                    Mot de passe
                  </Button>
                ) : null}

                <button
                  type="button"
                  className="profile-chip profile-chip-compact profile-chip-action"
                  onClick={() => isAdmin && setPasswordPanelOpen((current) => !current)}
                >
                  <div className="profile-avatar">{session?.user.fullName?.slice(0, 1) ?? 'F'}</div>
                  <div className="profile-copy">
                    <strong>{session?.user.fullName ?? 'FERM+'}</strong>
                    <span>{session?.user.role ?? 'Session'}</span>
                  </div>
                </button>

                {actions ? <div className="header-inline-actions">{actions}</div> : null}
              </div>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {isAdmin && passwordPanelOpen ? (
              <motion.div
                className="admin-password-panel"
                initial={{ opacity: 0, y: -12, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -12, height: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <form className="admin-password-form" onSubmit={handleChangePassword}>
                  <div className="admin-password-copy">
                    <p className="admin-password-kicker">Compte administrateur</p>
                    <h2>Changer le mot de passe</h2>
                    <p>La session sera réinitialisée après la mise à jour pour sécuriser le compte.</p>
                  </div>

                  <div className="admin-password-grid">
                    <label className="admin-password-field">
                      <span>Mot de passe actuel</span>
                      <div className="password-input-shell">
                        <input
                          type={showPasswords ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(event) => setCurrentPassword(event.target.value)}
                          placeholder="Saisir le mot de passe actuel"
                          autoComplete="current-password"
                        />
                      </div>
                    </label>

                    <label className="admin-password-field">
                      <span>Nouveau mot de passe</span>
                      <div className="password-input-shell">
                        <input
                          type={showPasswords ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          placeholder="Choisir un nouveau mot de passe"
                          autoComplete="new-password"
                        />
                      </div>
                    </label>

                    <label className="admin-password-field">
                      <span>Confirmer le nouveau mot de passe</span>
                      <div className="password-input-shell">
                        <input
                          type={showPasswords ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          placeholder="Confirmer le mot de passe"
                          autoComplete="new-password"
                        />
                      </div>
                    </label>
                  </div>

                  <div className="admin-password-actions">
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      className="header-inline-actions"
                      onClick={() => setShowPasswords((current) => !current)}
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showPasswords ? 'Masquer' : 'Afficher'}
                    </Button>

                    <div className="admin-password-feedback" aria-live="polite">
                      {passwordError ? <span className="admin-password-error">{passwordError}</span> : null}
                    </div>

                    <Button type="submit" variant="primary" size="md" disabled={passwordSubmitting}>
                      <KeyRound className="h-4 w-4" />
                      {passwordSubmitting ? 'Mise a jour...' : 'Enregistrer'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="header-subrow">
            <div className="header-status">
              <Badge variant="success">Système actif</Badge>
              <Badge variant={notificationCount > 0 ? 'warning' : 'info'}>
                {notificationCount > 0 ? `${notificationCount} signal(s)` : 'Aucune alerte critique'}
              </Badge>
            </div>
            <div className="header-meta">
              <span className="header-meta-chip">
                <Sprout className="h-4 w-4" />
                {activeFarmId ? activeFarmName : 'Aucune ferme selectionnee'}
              </span>
              <span className="header-meta-chip">
                <LayoutDashboard className="h-4 w-4" />
                {quickLinks.length} modules disponibles
              </span>
            </div>
          </div>
        </header>

        <main className="workspace-content">{children}</main>

        <nav className="bottom-nav premium-card mobile-only-flex">
          {quickLinks.slice(0, 5).map((item) => {
            const href = item.href ?? (activeFarmId ? `/farms/${activeFarmId}/${item.slug}` : '/farms');
            const Icon = item.icon;
            const isActive =
              pathname === href ||
              (item.slug && pathname.includes(`/${item.slug}`)) ||
              (item.href === '/farms' && pathname === '/farms');

            return (
              <Link key={item.label} href={href} className={cn('bottom-nav-link', isActive && 'bottom-nav-link-active')}>
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
