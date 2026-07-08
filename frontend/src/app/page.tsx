'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlarmClockCheck,
  AreaChart as AreaChartIcon,
  ArrowRight,
  BarChart3,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Fish,
  HeartPulse,
  Leaf,
  LineChart,
  Play,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Wallet,
  Wheat
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis
} from 'recharts';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

const heroStats = [
  {
    label: 'taches automatisees',
    value: 500,
    prefix: '+',
    suffix: '',
    icon: ClipboardList,
    sparkline: [4, 7, 6, 9, 10]
  },
  {
    label: "types d'elevages suivis",
    value: 8,
    prefix: '+',
    suffix: '',
    icon: HeartPulse,
    sparkline: [2, 4, 5, 6, 8]
  },
  {
    label: 'agenda intelligent',
    value: 24,
    prefix: '',
    suffix: '/7',
    icon: AlarmClockCheck,
    sparkline: [8, 9, 9, 10, 10]
  },
  {
    label: 'pilotage agricole',
    value: 360,
    prefix: '',
    suffix: ' deg',
    icon: CircleDollarSign,
    sparkline: [3, 5, 6, 8, 9]
  }
];

const heroTitleLines = [
  [
    { text: 'FERM+' },
    { text: 'simplifie' },
    { text: 'la' },
    { text: 'gestion' }
  ],
  [
    { text: 'Pilotez,', highlight: true },
    { text: 'Anticipez', highlight: true },
    { text: 'et' },
    { text: 'Developpez', highlight: true },
    { text: 'votre' },
    { text: 'ferme.' }
  ]
];

const heroBenefitPills = [
  'Animaux, cultures et pisciculture reunis',
  'Agenda, alertes et finances synchronises',
  'Vision claire pour agir plus vite'
];

const heroPulseSeries = [
  { name: 'Lun', operations: 44, finances: 28 },
  { name: 'Mar', operations: 52, finances: 35 },
  { name: 'Mer', operations: 49, finances: 33 },
  { name: 'Jeu', operations: 67, finances: 42 },
  { name: 'Ven', operations: 74, finances: 48 },
  { name: 'Sam', operations: 70, finances: 45 }
];

const heroProductionSeries = [
  { name: 'Oeufs', value: 96 },
  { name: 'Lait', value: 72 },
  { name: 'Poisson', value: 88 },
  { name: 'Mais', value: 64 }
];

const heroActivityFeed = [
  {
    title: 'Vaccination programmee',
    detail: 'Bloc pondeuses a 09h00',
    tone: 'critical' as const
  },
  {
    title: 'Recolte prevue',
    detail: 'Mais parcelle nord dans 3 jours',
    tone: 'warning' as const
  },
  {
    title: 'Stock faible',
    detail: 'Aliment croissance sous le seuil',
    tone: 'info' as const
  },
  {
    title: 'Production du jour',
    detail: 'Collecte et vente en consolidation',
    tone: 'success' as const
  }
];

const floatingHeroCards = [
  {
    title: 'Vaccination demain',
    value: 'A confirmer avant 18h',
    icon: BellRing,
    className: 'landing-floating-card alert'
  },
  {
    title: '+125 000 FCFA',
    value: 'cette semaine',
    icon: CircleDollarSign,
    className: 'landing-floating-card finance'
  },
  {
    title: '96 % taux de ponte',
    value: 'atelier pondeuses',
    icon: Sparkles,
    className: 'landing-floating-card production'
  },
  {
    title: 'Biomasse : 820 kg',
    value: 'pisciculture active',
    icon: Fish,
    className: 'landing-floating-card aquaculture'
  }
];

const painPoints = [
  {
    title: 'Taches oubliees',
    text: 'Vaccinations, traitements, recoltes et controles finissent souvent dans des carnets disperses.',
    icon: BellRing
  },
  {
    title: 'Depenses mal suivies',
    text: "Les sorties d'argent, les achats d'intrants et les revenus sont rarement centralises au meme endroit.",
    icon: Wallet
  },
  {
    title: 'Informations perdues',
    text: 'Quand les donnees terrain restent orales ou eparpillees, la decision devient plus lente et plus risquee.',
    icon: ShieldCheck
  }
];

const features = [
  {
    title: 'Agenda intelligent',
    text: 'Taches automatiques, rappels, alarmes et calendrier professionnel pour ne rien laisser passer.',
    icon: CalendarDays,
    accent: 'Operations quotidiennes maitrisees'
  },
  {
    title: "Gestion d'elevage",
    text: 'Suivi des lots, mouvements, reproduction, pesees et sante animale dans un meme flux.',
    icon: HeartPulse,
    accent: 'Cheptel plus lisible'
  },
  {
    title: 'Gestion des cultures',
    text: 'Parcelles, campagnes culturales, operations et recoltes avec historique de rendement.',
    icon: Leaf,
    accent: 'Production vegetale suivie'
  },
  {
    title: 'Gestion financiere',
    text: 'Depenses, revenus, marges et rentabilite avec une lecture executive tres rapide.',
    icon: PiggyBank,
    accent: 'Vision economique claire'
  },
  {
    title: 'Sante animale',
    text: 'Vaccinations, traitements, mortalite, controles et signaux critiques relies aux alertes.',
    icon: ShieldCheck,
    accent: 'Risque sanitaire reduit'
  },
  {
    title: 'Rapports intelligents',
    text: 'Exports PDF ou Excel, statistiques et syntheses techniques pour mieux rendre compte.',
    icon: LineChart,
    accent: 'Decision plus documentee'
  }
];

const steps = [
  'Creez votre ferme et posez votre structure de travail.',
  "Configurez l'activite: elevage, cultures, infrastructures et ressources.",
  'Recevez automatiquement les taches, rappels et alertes utiles.',
  'Suivez les performances et ameliorez vos decisions jour apres jour.'
];

const agendaTimeline = [
  { time: 'Demain', title: 'Vaccination prevue', detail: 'Lot de volailles pondeuses a confirmer avant 09h00.', tone: 'critical' },
  { time: '08h00', title: "Distribution d'aliments", detail: "Routine planifiee sur le bloc d'elevage principal.", tone: 'warning' },
  { time: 'J+3', title: 'Recolte du mais', detail: 'Fenetre de recolte recommandee avec alerte meteo et rendement attendu.', tone: 'info' }
];

const livestockTypes = ['Bovins', 'Volailles', 'Porcins', 'Caprins', 'Ovins', 'Pisciculture', 'Apiculture', 'Lapins'];
const cropTypes = ['Mais', 'Riz', 'Manioc', 'Cacao', 'Maraichage'];

const benefits = [
  'Gain de temps sur les taches repetitives',
  'Reduction des pertes et oublis',
  'Meilleure organisation quotidienne',
  'Amelioration de la rentabilite',
  'Centralisation des donnees ferme',
  "Aide concrete a la decision"
];

const testimonials = [
  {
    name: 'Awa Traore',
    role: 'Eleveuse de volailles',
    quote: "Grace a FERM+, je n'oublie plus aucune vaccination et je vois enfin mes charges en temps reel."
  },
  {
    name: 'Kouadio Nguessan',
    role: 'Exploitant mixte',
    quote: "Le calendrier et les alertes m'aident a mieux coordonner l'elevage, les parcelles et les achats."
  },
  {
    name: 'Mariam Diallo',
    role: 'Gestionnaire de ferme',
    quote: 'Les rapports et le tableau de bord rendent mes decisions beaucoup plus rapides et plus sures.'
  }
];

const faq = [
  {
    question: "A qui s'adresse FERM+ ?",
    answer: 'FERM+ est pense pour les agriculteurs, eleveurs, gestionnaires de fermes et exploitations mixtes.'
  },
  {
    question: "Quels types d'elevage sont pris en charge ?",
    answer: 'La plateforme couvre plusieurs filieres comme bovins, volailles, porcins, caprins, ovins, pisciculture, apiculture et lapins.'
  },
  {
    question: 'Puis-je gerer plusieurs fermes ?',
    answer: 'Oui, l architecture actuelle permet deja de suivre plusieurs fermes avec un espace centralise.'
  },
  {
    question: 'Les donnees sont-elles securisees ?',
    answer: "Oui, la plateforme integre authentification, controle d'acces et centralisation structuree des informations."
  },
  {
    question: 'Puis-je utiliser FERM+ sur mobile ?',
    answer: 'Oui, l interface a ete pensee pour fonctionner sur mobile avec une navigation simplifiee.'
  }
];

const stepLabels = ['Demarrage', 'Configuration', 'Automatisation', 'Pilotage'];

export default function HomePage() {
  const [activeFeedIndex, setActiveFeedIndex] = useState(0);
  const [heroKpis, setHeroKpis] = useState({
    animals: 248,
    tasks: 14,
    weakStocks: 3,
    weeklyRevenue: 125000
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveFeedIndex((current) => (current + 1) % heroActivityFeed.length);
      setHeroKpis((current) => ({
        animals: current.animals + (current.animals % 2 === 0 ? 1 : 0),
        tasks: current.tasks === 16 ? 14 : current.tasks + 1,
        weakStocks: current.weakStocks === 4 ? 2 : current.weakStocks + 1,
        weeklyRevenue: current.weeklyRevenue + 2500
      }));
    }, 2400);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return (
    <main className="landing-shell landing-page">
      <section className="landing-hero-grid landing-hero-stage">
        <motion.section
          className="hero-card landing-hero-primary"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="landing-hero-badges">
            <Badge variant="success">Plateforme intelligente de gestion agricole et d’élevage</Badge>
            <span className="landing-proof-item">SaaS agricole premium</span>
            <span className="landing-proof-item">Élevage, cultures, pisciculture, finances</span>
          </div>
          <div className="landing-hero-title">
            <h1>
              {heroTitleLines.map((line, lineIndex) => (
                <span key={`line-${lineIndex}`} className="landing-hero-title-line">
                  {line.map((word, wordIndex) => (
                    <motion.span
                      key={`${word.text}-${wordIndex}`}
                      className={word.highlight ? 'landing-highlight' : undefined}
                      initial={{ opacity: 0, y: 18, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{
                        duration: 0.45,
                        delay: lineIndex * 0.24 + wordIndex * 0.05
                      }}
                    >
                      {word.text}{' '}
                    </motion.span>
                  ))}
                </span>
              ))}
            </h1>
          </div>
          <p className="hero-copy landing-hero-copy">
            Gérez vos animaux, cultures, finances et tâches quotidiennes depuis une seule
            plateforme intelligente conçue pour les exploitants agricoles modernes.
          </p>
          <div className="landing-hero-benefits">
            {heroBenefitPills.map((item, index) => (
              <motion.span
                key={item}
                className="landing-hero-benefit-pill"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + index * 0.08 }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {item}
              </motion.span>
            ))}
          </div>
          <div className="hero-actions">
            <motion.div whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Link href="/farms">
                <Button size="lg" className="landing-hero-cta-primary">
                  Explorer FERM+
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
            <motion.div whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Link href="/login">
                <Button variant="secondary" size="lg" className="landing-hero-cta-secondary">
                  <Play className="h-4 w-4" />
                  Voir la demonstration
                </Button>
              </Link>
            </motion.div>
          </div>
          <div className="landing-proof-row">
            <div className="landing-proof-block">
              <strong>Un assistant agricole vraiment utile</strong>
              <span>Priorités, alertes, stocks, opérations et rentabilité restent lisibles sans surcharger votre écran.</span>
            </div>
            <div className="landing-proof-block">
              <strong>Un pilotage qui inspire confiance</strong>
              <span>Chaque module aide à agir plus tôt, mieux organiser le terrain et mieux protéger la production.</span>
            </div>
          </div>

          <div className="landing-stat-grid landing-stat-grid-premium">
            {heroStats.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.label}
                  className="landing-stat-card landing-stat-card-premium"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -6, scale: 1.01 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                >
                  <div className="landing-stat-card-top">
                    <div className="landing-stat-icon">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="landing-stat-sparkline" aria-hidden="true">
                      {item.sparkline.map((point, pointIndex) => (
                        <span
                          key={`${item.label}-${pointIndex}`}
                          style={{ height: `${point * 10}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <strong>
                    <AnimatedNumber value={item.value} prefix={item.prefix} suffix={item.suffix} />
                  </strong>
                  <span>{item.label}</span>
                </motion.article>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          className="hero-card landing-hero-demo landing-hero-demo-premium"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          <div className="landing-demo-header">
            <div>
              <p className="eyebrow">Apercu FERM+</p>
              <h2>Un dashboard vivant qui aide a piloter avant meme la premiere action</h2>
            </div>
            <Badge variant="info">Temps reel simule</Badge>
          </div>

          <div className="landing-dashboard-preview landing-dashboard-preview-premium">
            <div className="landing-dashboard-top">
              <div className="landing-window-dots">
                <span />
                <span />
                <span />
              </div>
              <span className="landing-window-label">Centre de pilotage ferme mixte</span>
            </div>
            <div className="landing-preview-banner">
              <div>
                <strong>Vue executive intelligente</strong>
                <span>Operations, finances, production et signaux critiques dans la meme lecture.</span>
              </div>
              <Badge variant="success">Systeme actif</Badge>
            </div>

            <div className="landing-dashboard-kpis landing-dashboard-kpis-premium">
              <article className="landing-dashboard-card">
                <p>Animaux actifs</p>
                <strong>
                  <AnimatedNumber value={heroKpis.animals} />
                </strong>
                <span>suivi des lots en temps reel</span>
              </article>
              <article className="landing-dashboard-card">
                <p>Taches du jour</p>
                <strong>
                  <AnimatedNumber value={heroKpis.tasks} />
                </strong>
                <span>agenda intelligent synchronise</span>
              </article>
              <article className="landing-dashboard-card">
                <p>Stocks faibles</p>
                <strong>
                  <AnimatedNumber value={heroKpis.weakStocks} prefix="0" />
                </strong>
                <span>alertes pretes a traiter</span>
              </article>
            </div>

            <div className="landing-dashboard-body landing-dashboard-body-premium">
              <article className="landing-signal-card landing-signal-card-premium">
                <div className="landing-signal-head">
                  <span className="status-pill">Mise a jour live</span>
                  <span className="activity-pill">+12% efficacite</span>
                </div>
                <div className="landing-activity-stream">
                  {heroActivityFeed.map((item, index) => (
                    <motion.article
                      key={item.title}
                      className={`landing-activity-item ${activeFeedIndex === index ? 'active' : ''} alert-${item.tone}`}
                      animate={{
                        opacity: activeFeedIndex === index ? 1 : 0.55,
                        y: activeFeedIndex === index ? -2 : 0
                      }}
                    >
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.detail}</span>
                      </div>
                      <span className="landing-activity-pulse" />
                    </motion.article>
                  ))}
                </div>
                <div className="landing-signal-meter">
                  <motion.span
                    animate={{ width: `${72 + activeFeedIndex * 6}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </article>

              <article className="landing-chart-card landing-chart-card-premium">
                <div className="landing-chart-card-head">
                  <div>
                    <strong>Execution hebdomadaire</strong>
                    <span>Operations terrain et performance financiere</span>
                  </div>
                  <AreaChartIcon className="h-5 w-5 text-[var(--accent)]" />
                </div>
                <div className="landing-chart-shell">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={heroPulseSeries}>
                      <defs>
                        <linearGradient id="heroOperations" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16A34A" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="heroFinances" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0284C7" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#0284C7" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="rgba(15, 23, 42, 0.08)" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--muted-soft)', fontSize: 12 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="operations"
                        stroke="#16A34A"
                        strokeWidth={2}
                        fill="url(#heroOperations)"
                      />
                      <Area
                        type="monotone"
                        dataKey="finances"
                        stroke="#0284C7"
                        strokeWidth={2}
                        fill="url(#heroFinances)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </div>

            <div className="landing-dashboard-footer">
              <article className="landing-production-card">
                <div className="landing-production-card-head">
                  <strong>Production par atelier</strong>
                  <span>mise a jour intelligente</span>
                </div>
                <div className="landing-mini-bar-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={heroProductionSeries}>
                      <CartesianGrid vertical={false} stroke="rgba(15, 23, 42, 0.06)" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--muted-soft)', fontSize: 11 }}
                      />
                      <Bar dataKey="value" radius={[10, 10, 4, 4]} fill="#16A34A" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="landing-finance-inline-card">
                <p>Impact hebdomadaire</p>
                <ArrowRight className="h-4 w-4" />
                <strong>
                  <AnimatedNumber value={heroKpis.weeklyRevenue} prefix="+ " suffix=" FCFA" />
                </strong>
                <span>Cette semaine, les flux restent sous controle.</span>
              </article>
            </div>

            <div className="landing-floating-cards">
              {floatingHeroCards.map((item, index) => {
                const Icon = item.icon;

                return (
                  <motion.article
                    key={item.title}
                    className={item.className}
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 4 + index * 0.5,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'easeInOut',
                      delay: index * 0.25
                    }}
                    whileHover={{ y: -10, scale: 1.02 }}
                  >
                    <div className="landing-floating-icon">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.value}</span>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </motion.section>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <p className="eyebrow">Pourquoi FERM+ ?</p>
          <h2>Une reponse concrete aux pertes de temps, aux oublis et au manque de visibilite.</h2>
        </div>
        <div className="module-catalog-grid">
          {painPoints.map((item, index) => {
            const Icon = item.icon;

            return (
              <motion.article
                key={item.title}
                className="module-catalog-card"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="dashboard-inline-actions">
                  <div className="farm-module-icon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="warning">Point de friction</Badge>
                </div>
                <h2>{item.title}</h2>
                <p>{item.text}</p>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <p className="eyebrow">Fonctionnalites principales</p>
          <h2>Tout ce qu il faut pour piloter une ferme moderne sans quitter le meme espace.</h2>
        </div>
        <div className="module-catalog-grid">
          {features.map((item, index) => {
            const Icon = item.icon;

            return (
              <motion.article
                key={item.title}
                className="module-catalog-card"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: index * 0.03 }}
              >
                <div className="dashboard-inline-actions">
                  <div className="farm-module-icon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="info">{item.accent}</Badge>
                </div>
                <h2>{item.title}</h2>
                <p>{item.text}</p>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <p className="eyebrow">Comment ca fonctionne</p>
          <h2>Quatre etapes simples pour structurer votre exploitation.</h2>
        </div>
        <div className="landing-stepper">
          {steps.map((step, index) => (
            <motion.article
              key={step}
              className="landing-step-card landing-step-card-premium"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -6 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ delay: index * 0.05 }}
            >
              <span className="landing-step-label">{stepLabels[index]}</span>
              <div className="landing-step-index">0{index + 1}</div>
              <p>{step}</p>
              {index < steps.length - 1 ? <ChevronRight className="landing-step-arrow h-5 w-5" /> : null}
            </motion.article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-agenda-section">
        <div className="landing-section-head">
          <p className="eyebrow">Agenda intelligent</p>
          <h2>Un calendrier qui previent, rappelle et aide a prioriser avant qu il ne soit trop tard.</h2>
        </div>
        <div className="module-hero-grid">
          <article className="module-list-card">
            <div className="dashboard-inline-actions">
              <div>
                <p className="eyebrow">Timeline terrain</p>
                <h2>Exemples reels de taches</h2>
              </div>
              <div className="farm-module-icon">
                <AlarmClockCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="landing-timeline">
              {agendaTimeline.map((item) => (
                <article key={item.title} className={`landing-timeline-item alert-${item.tone}`}>
                  <span className="landing-timeline-time">{item.time}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="module-spotlight-card">
            <div className="module-card-top">
              <p className="eyebrow">Ce que ca change</p>
              <Badge variant="success">Rappels automatiques</Badge>
            </div>
            <h2>Moins d oublis, plus de serenite operationnelle.</h2>
            <div className="module-detail-list">
              <span>Rappels 24h avant et quelques heures avant</span>
              <span>Alarmes sur les taches en retard</span>
              <span>Priorites visibles dans l agenda et les alertes</span>
            </div>
          </article>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <p className="eyebrow">Types d activites</p>
          <h2>FERM+ couvre les besoins d elevage comme de cultures dans une seule plateforme.</h2>
        </div>
        <div className="landing-activity-grid">
          <article className="module-list-card">
            <div className="dashboard-inline-actions">
              <div>
                <p className="eyebrow">Elevage</p>
                <h2>Filieres prises en charge</h2>
              </div>
              <div className="farm-module-icon">
                <HeartPulse className="h-5 w-5" />
              </div>
            </div>
            <div className="landing-chip-cloud">
              {livestockTypes.map((item) => (
                <span key={item} className="module-detail-chip">
                  {item}
                </span>
              ))}
            </div>
          </article>
          <article className="module-list-card">
            <div className="dashboard-inline-actions">
              <div>
                <p className="eyebrow">Cultures</p>
                <h2>Principales productions</h2>
              </div>
              <div className="farm-module-icon">
                <Wheat className="h-5 w-5" />
              </div>
            </div>
            <div className="landing-chip-cloud">
              {cropTypes.map((item) => (
                <span key={item} className="module-detail-chip">
                  {item}
                </span>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <p className="eyebrow">Tableau de bord</p>
          <h2>Une demonstration produit qui rend visibles performances, finances, alertes et execution.</h2>
        </div>
        <div className="landing-dashboard-showcase">
          <article className="landing-showcase-panel">
            <div className="dashboard-inline-actions">
              <div>
                <p className="eyebrow">KPI</p>
                <h2>Lecture immediate</h2>
              </div>
              <BarChart3 className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div className="landing-mini-grid landing-mini-grid-premium">
              <span><strong>Benefice net</strong><small>vision exec</small></span>
              <span><strong>Stocks faibles</strong><small>priorites terrain</small></span>
              <span><strong>Alertes critiques</strong><small>action rapide</small></span>
              <span><strong>Taches du jour</strong><small>execution claire</small></span>
            </div>
          </article>
          <article className="landing-showcase-panel">
            <div className="dashboard-inline-actions">
              <div>
                <p className="eyebrow">Graphiques</p>
                <h2>Analyse visuelle</h2>
              </div>
              <LineChart className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div className="landing-chart-wave">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </article>
          <article className="landing-showcase-panel">
            <div className="dashboard-inline-actions">
              <div>
                <p className="eyebrow">Alertes</p>
                <h2>Priorites guidees</h2>
              </div>
              <BellRing className="h-5 w-5 text-[var(--warning)]" />
            </div>
            <div className="module-detail-list">
              <span>Risque sanitaire detecte</span>
              <span>Stock aliment sous le seuil</span>
              <span>Tache planifiee non terminee</span>
            </div>
          </article>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <p className="eyebrow">Avantages</p>
          <h2>Des gains concrets pour la gestion quotidienne comme pour la rentabilite.</h2>
        </div>
        <div className="landing-benefit-grid">
          {benefits.map((item, index) => (
            <motion.article
              key={item}
              className="landing-benefit-card landing-benefit-card-premium"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: index * 0.04 }}
            >
              <div className="landing-benefit-icon-wrap">
                <CheckCircle2 className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <div className="landing-benefit-copy">
                <strong>{item}</strong>
                <span>Concret, visible et utile des les premieres utilisations.</span>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <p className="eyebrow">Temoignages</p>
          <h2>Des profils realistes qui montrent ce que FERM+ change dans la pratique.</h2>
        </div>
        <div className="module-catalog-grid">
          {testimonials.map((item, index) => (
            <motion.article
              key={item.name}
              className="module-catalog-card"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ delay: index * 0.04 }}
            >
              <div className="landing-avatar">{item.name.slice(0, 1)}</div>
              <h2>{item.name}</h2>
              <p className="landing-quote-role">{item.role}</p>
              <p>"{item.quote}"</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <p className="eyebrow">FAQ</p>
          <h2>Les questions les plus naturelles avant de commencer.</h2>
        </div>
        <div className="landing-faq-grid">
          {faq.map((item) => (
            <details key={item.question} className="landing-faq-item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="landing-footer premium-card landing-footer-premium">
        <div className="landing-footer-top">
          <div className="landing-footer-brand">
            <div className="brand-logo">F+</div>
            <div>
              <p className="eyebrow">FERM+</p>
              <strong>Plateforme intelligente de gestion agricole et d elevage</strong>
              <span className="landing-footer-tagline">
                Un logiciel de nouvelle generation pour piloter, anticiper et developper votre exploitation.
              </span>
            </div>
          </div>
          <div className="landing-footer-actions">
            <Link href="/farms">
              <Button size="lg" className="landing-footer-cta-primary">
                Explorer FERM+
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg" className="landing-footer-cta-secondary">
                Voir la demonstration
              </Button>
            </Link>
          </div>
        </div>
        <div className="landing-footer-grid">
          <div>
            <h3>Fonctionnalites</h3>
            <p>Agenda intelligent</p>
            <p>Elevage et pisciculture</p>
            <p>Cultures et parcelles</p>
            <p>Finances et rapports</p>
          </div>
          <div>
            <h3>Liens rapides</h3>
            <p>Explorer la plateforme</p>
            <p>Voir la demonstration</p>
            <p>Rapports et analyses</p>
          </div>
          <div>
            <h3>Contact</h3>
            <p>support@ferm-plus.local</p>
            <p>Equipe produit agricole</p>
            <p>Disponible sur web et mobile</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function AnimatedNumber({
  value,
  prefix = '',
  suffix = ''
}: {
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const durationMs = 900;
    const frameMs = 16;
    const steps = Math.max(1, Math.floor(durationMs / frameMs));
    const increment = value / steps;
    let currentValue = 0;

    const interval = window.setInterval(() => {
      currentValue += increment;

      if (currentValue >= value) {
        setDisplayValue(value);
        window.clearInterval(interval);
        return;
      }

      setDisplayValue(Math.round(currentValue));
    }, frameMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [value]);

  return (
    <>
      {prefix}
      {displayValue.toLocaleString('fr-FR')}
      {suffix}
    </>
  );
}
