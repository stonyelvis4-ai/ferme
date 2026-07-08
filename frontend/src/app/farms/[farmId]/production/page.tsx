'use client';

import { motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Boxes,
  DollarSign,
  Egg,
  Fish,
  Package,
  Sprout,
  TrendingUp
} from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { AppShell } from '../../../../components/app-shell';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { useToast } from '../../../../components/ui/toast-provider';
import { useSession } from '../../../../hooks/use-session';
import {
  addProductSalePayment,
  createCropHarvestProduction,
  createEggProductionRecord,
  createFishGrowthRecord,
  createFishHarvestRecord,
  createProductSale,
  getFarmProductionOverview,
  type ProductionOverviewView,
  type ProductSaleView
} from '../../../../services/farm-client';

type ProductionMode = 'EGGS' | 'FISH_GROWTH' | 'FISH_HARVEST' | 'CROP_HARVEST';

const paymentMethods: ProductSaleView['paymentMethod'][] = [
  'CASH',
  'MOBILE_MONEY',
  'BANK_TRANSFER',
  'CARD',
  'CREDIT',
  'OTHER'
];

export default function ProductionPage({
  params
}: {
  params: Promise<{ farmId: string }>;
}) {
  const session = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { pushToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [farmId, setFarmId] = useState('');
  const [overview, setOverview] = useState<ProductionOverviewView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ProductionMode>('EGGS');
  const [recordTypeFilter, setRecordTypeFilter] = useState<'ALL' | ProductionOverviewView['records'][number]['productionType']>('ALL');
  const [saleStatusFilter, setSaleStatusFilter] = useState<'ALL' | 'SETTLED' | 'PARTIAL'>('ALL');
  const [searchText, setSearchText] = useState('');

  const [eggForm, setEggForm] = useState({
    animalGroupId: '',
    productionDate: new Date().toISOString().slice(0, 10),
    currentHeadcount: 1,
    eggsProduced: 0,
    eggsBroken: 0,
    eggsDirty: 0,
    eggsLost: 0,
    mortalityToday: 0,
    feedConsumed: 0,
    feedCost: 0,
    notes: ''
  });
  const [fishGrowthForm, setFishGrowthForm] = useState({
    animalGroupId: '',
    buildingId: '',
    enclosureId: '',
    species: 'Tilapia',
    stockingDate: new Date().toISOString().slice(0, 10),
    productionDate: new Date().toISOString().slice(0, 10),
    initialFingerlings: 500,
    initialAverageWeight: 0.03,
    currentAverageWeight: 0.12,
    mortality: 0,
    feedDistributed: 0,
    feedCost: 0,
    waterQuality: 'Correcte',
    temperature: 28,
    oxygen: 6,
    ph: 7,
    notes: ''
  });
  const [fishHarvestForm, setFishHarvestForm] = useState({
    animalGroupId: '',
    buildingId: '',
    enclosureId: '',
    harvestedAt: new Date().toISOString().slice(0, 10),
    totalWeight: 0,
    fishCount: 0,
    losses: 0,
    sellableQuantity: 0,
    destination: '',
    notes: ''
  });
  const [cropHarvestForm, setCropHarvestForm] = useState({
    cropId: '',
    harvestedAt: new Date().toISOString().slice(0, 10),
    quantity: 0,
    losses: 0,
    unit: 'kg',
    quality: 'BONNE' as const,
    notes: ''
  });
  const [saleForm, setSaleForm] = useState({
    stockId: '',
    quantitySold: 0,
    unitPrice: 0,
    amountPaid: 0,
    paymentMethod: 'CASH' as ProductSaleView['paymentMethod'],
    customerName: '',
    saleDate: new Date().toISOString().slice(0, 10),
    notes: ''
  });
  const [paymentForm, setPaymentForm] = useState({
    saleId: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    amount: 0,
    paymentMethod: 'CASH' as ProductSaleView['paymentMethod'],
    note: ''
  });
  const isFishRoute = pathname.includes('/pisciculture') || pathname.includes('/layers/pisciculture');
  const isLayersRoute = pathname.includes('/layers/production');

  useEffect(() => {
    setMode(isFishRoute ? 'FISH_GROWTH' : 'EGGS');
  }, [isFishRoute, isLayersRoute]);

  const workflowSteps = useMemo(() => {
    if (isFishRoute) {
      return [
        { title: 'Bassin', icon: Package },
        { title: 'Empoissonnement', icon: Activity },
        { title: 'Croissance', icon: TrendingUp },
        { title: 'Récolte', icon: DollarSign }
      ];
    }

    if (isLayersRoute) {
      return [
        { title: 'Lot', icon: Package },
        { title: 'Production quotidienne', icon: Activity },
        { title: 'Stock d’œufs', icon: Boxes },
        { title: 'Vente & finance', icon: DollarSign }
      ];
    }

    return [
      { title: 'Production', icon: Package },
      { title: 'Stock', icon: Boxes },
      { title: 'Vente', icon: DollarSign },
      { title: 'Finance', icon: TrendingUp }
    ];
  }, [isFishRoute, isLayersRoute]);

  function openAgendaComposer() {
    if (!farmId) {
      return;
    }

    const moduleName = isFishRoute ? 'pisciculture' : isLayersRoute ? 'layers/production' : 'production';
    const entityType = isFishRoute ? 'BASSIN' : isLayersRoute ? 'LOT' : 'PRODUCTION';

    router.push(`/farms/${farmId}/agenda?compose=1&module=${encodeURIComponent(moduleName)}&entityType=${entityType}`);
  }

  function refresh(activeFarmId: string, token: string) {
    return getFarmProductionOverview(activeFarmId, token).then((response) => {
      setOverview(response);
      setEggForm((current) => ({
        ...current,
        animalGroupId: current.animalGroupId || response.options.animalGroups[0]?.id || ''
      }));
      setFishGrowthForm((current) => ({
        ...current,
        animalGroupId: current.animalGroupId || response.options.animalGroups[0]?.id || '',
        buildingId: current.buildingId || response.options.buildings[0]?.id || '',
        enclosureId: current.enclosureId || response.options.enclosures[0]?.id || ''
      }));
      setFishHarvestForm((current) => ({
        ...current,
        animalGroupId: current.animalGroupId || response.options.animalGroups[0]?.id || '',
        buildingId: current.buildingId || response.options.buildings[0]?.id || '',
        enclosureId: current.enclosureId || response.options.enclosures[0]?.id || ''
      }));
      setCropHarvestForm((current) => ({
        ...current,
        cropId: current.cropId || response.options.crops[0]?.id || ''
      }));
      setSaleForm((current) => ({
        ...current,
        stockId: current.stockId || response.stocks[0]?.id || ''
      }));
      setPaymentForm((current) => ({
        ...current,
        saleId:
          current.saleId ||
          response.sales.find((sale) => sale.remainingAmount > 0)?.id ||
          response.sales[0]?.id ||
          ''
      }));
    });
  }

  useEffect(() => {
    params.then((value) => setFarmId(value.farmId));
  }, [params]);

  useEffect(() => {
    if (!session?.token || !farmId) {
      return;
    }

    refresh(farmId, session.token).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'Chargement impossible');
      setOverview(null);
    });
  }, [farmId, session?.token]);

  const outstandingReceivables =
    overview?.sales.reduce((sum, sale) => sum + sale.remainingAmount, 0) ?? 0;

  const quickStats = useMemo(() => {
    if (!overview) {
      return [];
    }

    const stats = [
      {
        label: 'Production du jour',
        value: overview.stats.productionToday.toFixed(2),
        icon: Activity
      },
      {
        label: 'Stock disponible',
        value: overview.stats.stockAvailable.toFixed(2),
        icon: Package
      },
      {
        label: "Chiffre d'affaires",
        value: overview.stats.salesRevenue.toFixed(2),
        icon: DollarSign
      },
      {
        label: 'Marge',
        value: overview.stats.margin.toFixed(2),
        icon: TrendingUp
      },
      {
        label: 'Reliquats clients',
        value: outstandingReceivables.toFixed(2),
        icon: DollarSign
      }
    ];

    if (isLayersRoute) {
      stats.unshift({
        label: 'Taux de ponte',
        value: overview.breakdown.eggs.averageLayingRate.toFixed(1),
        icon: Egg
      });
    }

    if (isFishRoute) {
      stats.unshift({
        label: 'Biomasse',
        value: overview.breakdown.fish.biomass.toFixed(2),
        icon: Fish
      });
    }

    return stats;
  }, [isFishRoute, isLayersRoute, outstandingReceivables, overview]);

  const selectedStock = overview?.stocks.find((stock) => stock.id === saleForm.stockId) ?? null;
  const selectedAnimal = overview?.options.animalGroups.find((animal) => animal.id === eggForm.animalGroupId) ?? null;
  const selectedOutstandingSale = overview?.sales.find((sale) => sale.id === paymentForm.saleId) ?? null;
  const eggPreviewSellable = Math.max(
    0,
    eggForm.eggsProduced - eggForm.eggsBroken - eggForm.eggsDirty - eggForm.eggsLost
  );
  const eggPreviewTrays = eggPreviewSellable / 30;
  const eggPreviewRate =
    eggForm.currentHeadcount > 0 ? (eggForm.eggsProduced / eggForm.currentHeadcount) * 100 : 0;
  const filteredRecords =
    overview?.records.filter((record) => {
      const matchesType = recordTypeFilter === 'ALL' || record.productionType === recordTypeFilter;
      const matchesSearch =
        !searchText.trim() ||
        `${record.productionLabel} ${record.uniqueCode}`.toLowerCase().includes(searchText.toLowerCase());
      return matchesType && matchesSearch;
    }) ?? [];
  const filteredSales =
    overview?.sales.filter((sale) => {
      const matchesStatus =
        saleStatusFilter === 'ALL' ||
        (saleStatusFilter === 'SETTLED' ? sale.remainingAmount <= 0 : sale.remainingAmount > 0);
      const matchesSearch =
        !searchText.trim() ||
        `${sale.productName} ${sale.customerName} ${sale.saleCode}`.toLowerCase().includes(searchText.toLowerCase());
      return matchesStatus && matchesSearch;
    }) ?? [];

  async function runAction(action: () => Promise<void>, successTitle: string, successDescription: string) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        if (session?.token && farmId) {
          await refresh(farmId, session.token);
        }
        pushToast({
          title: successTitle,
          description: successDescription,
          variant: 'success'
        });
      } catch (submissionError) {
        const message =
          submissionError instanceof Error ? submissionError.message : 'Operation impossible';
        setError(message);
        pushToast({
          title: 'Operation impossible',
          description: message,
          variant: 'error'
        });
      }
    });
  }

  return (
    <AppShell title={`Production - ${overview?.farm.name ?? 'Ferme'}`}>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="module-hero-grid production-hero-grid production-hero-grid-premium">
        <article className="module-hero-card production-hero-card production-hero-card-premium">
          <div className="module-hero-top">
            <div>
              <p className="eyebrow">
                {isFishRoute ? 'Pisciculture premium' : isLayersRoute ? 'Pondeuses premium' : 'Workflow production'}
              </p>
              <h2 className="module-hero-title">
                {isFishRoute
                  ? 'Pilotage complet du bassin'
                  : isLayersRoute
                    ? 'Pilotage complet du lot pondeuses'
                    : overview?.farm.name ?? 'Chargement...'}
              </h2>
            </div>
            <Badge variant="info">{overview?.farm.activityType ?? 'MIXTE'}</Badge>
          </div>
          <p className="hero-copy module-hero-copy">
            {isFishRoute
              ? 'Empoissonnement, suivi de croissance, qualité de l eau, récolte, stock poissons, ventes et rentabilité restent reliés dans un flux unique.'
              : isLayersRoute
                ? 'Production quotidienne, stock d œufs, ventes, alimentation et rentabilité restent reliés dans un flux unique.'
                : 'Production, stock produit, vente, revenu et tracabilite sont relies dans un seul espace pour les animaux, poissons et cultures.'}
          </p>
          <div className="module-pill-row">
            {workflowSteps.map((step) => (
              <span key={step.title} className="module-detail-chip">
                {step.title}
              </span>
            ))}
          </div>
          <div className="module-inline-actions">
            <Button className="module-submit-button production-action-button production-action-button-primary" type="button" onClick={openAgendaComposer}>
              Planifier une tache
            </Button>
            <Button className="module-submit-button production-action-button production-action-button-secondary" type="button" variant="secondary" onClick={() => router.push(`/farms/${farmId}/agenda`)}>
              Ouvrir l agenda
            </Button>
          </div>
          <div className="module-kpi-grid">
            {quickStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <article key={stat.label} className="module-kpi-card">
                  <div className="module-kpi-header">
                    <div className="module-kpi-icon">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="neutral">{stat.label}</Badge>
                  </div>
                  <strong>{stat.value}</strong>
                  <span>{stat.label.toLowerCase()}</span>
                </article>
              );
            })}
          </div>
        </article>

        <article className="module-spotlight-card production-spotlight-card production-spotlight-card-premium">
          <div className="module-card-top">
            <p className="eyebrow">Sous-modules</p>
            <Badge variant="success">{overview?.records.length ?? 0} enregistrement(s)</Badge>
          </div>
          <h2>Vue metier unifiee</h2>
          <div className="module-detail-list">
            <span>{overview?.breakdown.eggs.records ?? 0} saisie(s) pondeuses</span>
            <span>{overview?.breakdown.fish.growthRecords ?? 0} suivi(s) piscicoles</span>
            <span>{overview?.breakdown.crops.harvestRecords ?? 0} recolte(s) cultures</span>
            <span>{overview?.sales.length ?? 0} vente(s) rattachee(s)</span>
            <span>{outstandingReceivables.toFixed(2)} a encaisser</span>
          </div>
        </article>
      </section>

      <section className="module-flow-strip production-flow-strip production-flow-strip-premium">
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;

          return (
            <article key={step.title} className="module-flow-card">
              <div className="module-card-top">
                <span className="module-flow-index">0{index + 1}</span>
                <Badge variant="neutral">{step.title}</Badge>
              </div>
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="module-split-grid production-summary-grid production-summary-grid-premium">
        <article className="module-list-card production-summary-card production-summary-card-premium">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Pondeuses</p>
              <h2>Performance journaliere</h2>
            </div>
            <Badge variant={overview && overview.breakdown.eggs.averageLayingRate < 65 ? 'warning' : 'success'}>
              {overview?.breakdown.eggs.averageLayingRate.toFixed(1) ?? '0.0'}%
            </Badge>
          </div>
          <div className="module-detail-list">
            <span>Taux de ponte moyen: {overview?.breakdown.eggs.averageLayingRate.toFixed(1) ?? '0.0'}%</span>
            <span>Plateaux disponibles: {overview?.breakdown.eggs.traysAvailable.toFixed(2) ?? '0.00'}</span>
            <span>Mortalite enregistree: {overview?.breakdown.eggs.mortality ?? 0}</span>
            <span>Oeufs casses: {overview?.breakdown.eggs.brokenEggs ?? 0}</span>
            <span>Cout aliment: {overview?.breakdown.eggs.feedCost.toFixed(2) ?? '0.00'}</span>
          </div>
        </article>

        <article className="module-list-card production-summary-card production-summary-card-premium">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Pisciculture</p>
              <h2>Biomasse et eau</h2>
            </div>
            <Badge
              variant={
                overview && (overview.breakdown.fish.averageOxygen < 4 || overview.breakdown.fish.averagePh < 5.5 || overview.breakdown.fish.averagePh > 9)
                  ? 'critical'
                  : 'info'
              }
            >
              {overview?.breakdown.fish.biomass.toFixed(2) ?? '0.00'} kg
            </Badge>
          </div>
          <div className="module-detail-list">
            <span>Biomasse estimee: {overview?.breakdown.fish.biomass.toFixed(2) ?? '0.00'} kg</span>
            <span>Croissance moyenne: {overview?.breakdown.fish.averageGrowthRate.toFixed(1) ?? '0.0'}%</span>
            <span>Oxygene moyen: {overview?.breakdown.fish.averageOxygen.toFixed(1) ?? '0.0'}</span>
            <span>pH moyen: {overview?.breakdown.fish.averagePh.toFixed(1) ?? '0.0'}</span>
            <span>Recolte vendable: {overview?.breakdown.fish.sellableHarvest.toFixed(2) ?? '0.00'} kg</span>
          </div>
        </article>

        <article className="module-list-card production-summary-card production-summary-card-premium">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Cultures</p>
              <h2>Rendement agricole</h2>
            </div>
            <Badge variant="success">
              {overview?.breakdown.crops.yieldPerHectare.toFixed(2) ?? '0.00'} / ha
            </Badge>
          </div>
          <div className="module-detail-list">
            <span>Surface cultivee: {overview?.breakdown.crops.cultivatedArea.toFixed(2) ?? '0.00'} ha</span>
            <span>Recoltes enregistrees: {overview?.breakdown.crops.harvestRecords ?? 0}</span>
            <span>Quantite recoltee: {overview?.breakdown.crops.harvestedQuantity.toFixed(2) ?? '0.00'}</span>
            <span>Rendement / ha: {overview?.breakdown.crops.yieldPerHectare.toFixed(2) ?? '0.00'}</span>
            <span>Pertes: {overview?.breakdown.crops.losses.toFixed(2) ?? '0.00'}</span>
          </div>
        </article>
      </section>

      {overview?.breakdown.alerts.length ? (
        <section className="module-split-grid production-alert-grid production-alert-grid-premium">
          <article className="module-list-card production-alert-card production-alert-card-premium">
            <div className="dashboard-inline-actions">
              <div>
                <p className="eyebrow">Signaux critiques</p>
                <h2>Points a surveiller</h2>
              </div>
              <Badge variant="warning">{overview.breakdown.alerts.length}</Badge>
            </div>
            <div className="module-detail-list">
              {overview.breakdown.alerts.map((alert) => (
                <span key={alert}>{alert}</span>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      <section className="module-action-grid production-action-grid production-action-grid-premium">
        <article className="module-form-card production-form-card production-form-card-premium">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Nouvelle production</p>
              <h2>Saisie guidee par activite</h2>
            </div>
            <div className="farm-module-icon">
              {mode === 'EGGS' ? <Egg className="h-5 w-5" /> : mode === 'CROP_HARVEST' ? <Sprout className="h-5 w-5" /> : <Fish className="h-5 w-5" />}
            </div>
          </div>
          <div className="module-pill-row">
            <button className="module-detail-chip production-mode-chip production-mode-chip-premium" type="button" onClick={() => setMode('EGGS')}>Pondeuses</button>
            <button className="module-detail-chip production-mode-chip production-mode-chip-premium" type="button" onClick={() => setMode('FISH_GROWTH')}>Pisciculture</button>
            <button className="module-detail-chip production-mode-chip production-mode-chip-premium" type="button" onClick={() => setMode('FISH_HARVEST')}>Recolter poissons</button>
            <button className="module-detail-chip production-mode-chip production-mode-chip-premium" type="button" onClick={() => setMode('CROP_HARVEST')}>Recolter culture</button>
          </div>

          {mode === 'EGGS' ? (
            <form
              className="stack-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!session?.token) {
                  return;
                }
                void runAction(
                  () => createEggProductionRecord(farmId, eggForm, session.token).then(() => undefined),
                  'Production enregistree',
                  'La production pondeuse a ete ajoutee au stock.'
                );
              }}
            >
              <div className="field-grid">
                <label className="field">
                  <span>Lot pondeuses</span>
                  <select
                    value={eggForm.animalGroupId}
                    onChange={(event) => setEggForm((current) => ({ ...current, animalGroupId: event.target.value }))}
                  >
                    {overview?.options.animalGroups.map((animal) => (
                      <option key={animal.id} value={animal.id}>
                        {animal.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Date</span>
                  <input
                    type="date"
                    value={eggForm.productionDate}
                    onChange={(event) => setEggForm((current) => ({ ...current, productionDate: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Effectif actuel</span>
                  <input
                    type="number"
                    value={eggForm.currentHeadcount}
                    onChange={(event) => setEggForm((current) => ({ ...current, currentHeadcount: Number(event.target.value) }))}
                  />
                </label>
                <label className="field">
                  <span>Oeufs produits</span>
                  <input
                    type="number"
                    value={eggForm.eggsProduced}
                    onChange={(event) => setEggForm((current) => ({ ...current, eggsProduced: Number(event.target.value) }))}
                  />
                </label>
                <label className="field">
                  <span>Oeufs casses</span>
                  <input
                    type="number"
                    value={eggForm.eggsBroken}
                    onChange={(event) => setEggForm((current) => ({ ...current, eggsBroken: Number(event.target.value) }))}
                  />
                </label>
                <label className="field">
                  <span>Oeufs sales</span>
                  <input
                    type="number"
                    value={eggForm.eggsDirty}
                    onChange={(event) => setEggForm((current) => ({ ...current, eggsDirty: Number(event.target.value) }))}
                  />
                </label>
                <label className="field">
                  <span>Oeufs perdus</span>
                  <input
                    type="number"
                    value={eggForm.eggsLost}
                    onChange={(event) => setEggForm((current) => ({ ...current, eggsLost: Number(event.target.value) }))}
                  />
                </label>
                <label className="field">
                  <span>Mortalite du jour</span>
                  <input
                    type="number"
                    value={eggForm.mortalityToday}
                    onChange={(event) => setEggForm((current) => ({ ...current, mortalityToday: Number(event.target.value) }))}
                  />
                </label>
                <label className="field">
                  <span>Aliment consomme</span>
                  <input
                    type="number"
                    value={eggForm.feedConsumed}
                    onChange={(event) => setEggForm((current) => ({ ...current, feedConsumed: Number(event.target.value) }))}
                  />
                </label>
                <label className="field">
                  <span>Cout alimentaire</span>
                  <input
                    type="number"
                    value={eggForm.feedCost}
                    onChange={(event) => setEggForm((current) => ({ ...current, feedCost: Number(event.target.value) }))}
                  />
                </label>
                <label className="field">
                  <span>Observations</span>
                  <input
                    value={eggForm.notes}
                    onChange={(event) => setEggForm((current) => ({ ...current, notes: event.target.value }))}
                  />
                </label>
              </div>
              <div className="module-inline-note">
                <span>
                  {selectedAnimal?.label ?? 'Lot'}: {eggPreviewSellable} oeuf(s) vendable(s), {eggPreviewTrays.toFixed(2)} plateau(x), taux {eggPreviewRate.toFixed(1)}%
                </span>
                <Button className="module-submit-button production-action-button production-action-button-primary" type="submit" disabled={isPending}>
                  Enregistrer
                </Button>
              </div>
            </form>
          ) : null}

          {mode === 'FISH_GROWTH' ? (
            <form
              className="stack-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!session?.token) {
                  return;
                }
                void runAction(
                  () => createFishGrowthRecord(farmId, fishGrowthForm, session.token).then(() => undefined),
                  'Suivi piscicole enregistre',
                  'Le suivi de croissance et de biomasse a ete ajoute.'
                );
              }}
            >
              <div className="field-grid">
                <label className="field">
                  <span>Lot poissons</span>
                  <select
                    value={fishGrowthForm.animalGroupId}
                    onChange={(event) => setFishGrowthForm((current) => ({ ...current, animalGroupId: event.target.value }))}
                  >
                    {overview?.options.animalGroups.map((animal) => (
                      <option key={animal.id} value={animal.id}>
                        {animal.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Bassin bati</span>
                  <select
                    value={fishGrowthForm.buildingId}
                    onChange={(event) => setFishGrowthForm((current) => ({ ...current, buildingId: event.target.value }))}
                  >
                    <option value="">Aucun</option>
                    {overview?.options.buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Bassin ouvert</span>
                  <select
                    value={fishGrowthForm.enclosureId}
                    onChange={(event) => setFishGrowthForm((current) => ({ ...current, enclosureId: event.target.value }))}
                  >
                    <option value="">Aucun</option>
                    {overview?.options.enclosures.map((enclosure) => (
                      <option key={enclosure.id} value={enclosure.id}>
                        {enclosure.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Espece</span>
                  <input
                    value={fishGrowthForm.species}
                    onChange={(event) => setFishGrowthForm((current) => ({ ...current, species: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Empoissonnement</span>
                  <input
                    type="date"
                    value={fishGrowthForm.stockingDate}
                    onChange={(event) => setFishGrowthForm((current) => ({ ...current, stockingDate: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Date suivi</span>
                  <input
                    type="date"
                    value={fishGrowthForm.productionDate}
                    onChange={(event) => setFishGrowthForm((current) => ({ ...current, productionDate: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Nombre initial</span>
                  <input type="number" value={fishGrowthForm.initialFingerlings} onChange={(event) => setFishGrowthForm((current) => ({ ...current, initialFingerlings: Number(event.target.value) }))} />
                </label>
                <label className="field">
                  <span>Poids initial moyen</span>
                  <input type="number" value={fishGrowthForm.initialAverageWeight} onChange={(event) => setFishGrowthForm((current) => ({ ...current, initialAverageWeight: Number(event.target.value) }))} />
                </label>
                <label className="field">
                  <span>Poids moyen actuel</span>
                  <input type="number" value={fishGrowthForm.currentAverageWeight} onChange={(event) => setFishGrowthForm((current) => ({ ...current, currentAverageWeight: Number(event.target.value) }))} />
                </label>
                <label className="field">
                  <span>Mortalite</span>
                  <input type="number" value={fishGrowthForm.mortality} onChange={(event) => setFishGrowthForm((current) => ({ ...current, mortality: Number(event.target.value) }))} />
                </label>
                <label className="field">
                  <span>Aliment distribue</span>
                  <input type="number" value={fishGrowthForm.feedDistributed} onChange={(event) => setFishGrowthForm((current) => ({ ...current, feedDistributed: Number(event.target.value) }))} />
                </label>
                <label className="field">
                  <span>Cout aliment</span>
                  <input type="number" value={fishGrowthForm.feedCost} onChange={(event) => setFishGrowthForm((current) => ({ ...current, feedCost: Number(event.target.value) }))} />
                </label>
                <label className="field">
                  <span>Qualite eau</span>
                  <input value={fishGrowthForm.waterQuality} onChange={(event) => setFishGrowthForm((current) => ({ ...current, waterQuality: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Temperature</span>
                  <input type="number" value={fishGrowthForm.temperature} onChange={(event) => setFishGrowthForm((current) => ({ ...current, temperature: Number(event.target.value) }))} />
                </label>
                <label className="field">
                  <span>Oxygene</span>
                  <input type="number" value={fishGrowthForm.oxygen} onChange={(event) => setFishGrowthForm((current) => ({ ...current, oxygen: Number(event.target.value) }))} />
                </label>
                <label className="field">
                  <span>pH</span>
                  <input type="number" value={fishGrowthForm.ph} onChange={(event) => setFishGrowthForm((current) => ({ ...current, ph: Number(event.target.value) }))} />
                </label>
              </div>
              <div className="module-inline-note">
                <span>Biomasse et qualite de l eau seront tracees automatiquement.</span>
                <Button className="module-submit-button production-action-button production-action-button-primary" type="submit" disabled={isPending}>
                  Enregistrer le suivi
                </Button>
              </div>
            </form>
          ) : null}

          {mode === 'FISH_HARVEST' ? (
            <form
              className="stack-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!session?.token) {
                  return;
                }
                void runAction(
                  () => createFishHarvestRecord(farmId, fishHarvestForm, session.token).then(() => undefined),
                  'Recolte piscicole enregistree',
                  'La recolte a alimente le stock de poissons recoltes.'
                );
              }}
            >
              <div className="field-grid">
                <label className="field">
                  <span>Lot poissons</span>
                  <select value={fishHarvestForm.animalGroupId} onChange={(event) => setFishHarvestForm((current) => ({ ...current, animalGroupId: event.target.value }))}>
                    {overview?.options.animalGroups.map((animal) => (
                      <option key={animal.id} value={animal.id}>
                        {animal.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Date recolte</span>
                  <input type="date" value={fishHarvestForm.harvestedAt} onChange={(event) => setFishHarvestForm((current) => ({ ...current, harvestedAt: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Poids total recolte</span>
                  <input type="number" value={fishHarvestForm.totalWeight} onChange={(event) => setFishHarvestForm((current) => ({ ...current, totalWeight: Number(event.target.value) }))} />
                </label>
                <label className="field">
                  <span>Nombre de poissons</span>
                  <input type="number" value={fishHarvestForm.fishCount} onChange={(event) => setFishHarvestForm((current) => ({ ...current, fishCount: Number(event.target.value) }))} />
                </label>
                <label className="field">
                  <span>Pertes</span>
                  <input type="number" value={fishHarvestForm.losses} onChange={(event) => setFishHarvestForm((current) => ({ ...current, losses: Number(event.target.value) }))} />
                </label>
                <label className="field">
                  <span>Quantite vendable</span>
                  <input type="number" value={fishHarvestForm.sellableQuantity} onChange={(event) => setFishHarvestForm((current) => ({ ...current, sellableQuantity: Number(event.target.value) }))} />
                </label>
                <label className="field">
                  <span>Destination</span>
                  <input value={fishHarvestForm.destination} onChange={(event) => setFishHarvestForm((current) => ({ ...current, destination: event.target.value }))} />
                </label>
              </div>
              <div className="module-inline-note">
                <span>Le stock Poissons recoltes sera mis a jour automatiquement.</span>
                <Button className="module-submit-button production-action-button production-action-button-primary" type="submit" disabled={isPending}>
                  Recolter
                </Button>
              </div>
            </form>
          ) : null}

          {mode === 'CROP_HARVEST' ? (
            <form
              className="stack-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!session?.token) {
                  return;
                }
                void runAction(
                  () => createCropHarvestProduction(farmId, cropHarvestForm, session.token).then(() => undefined),
                  'Recolte culture enregistree',
                  'La recolte a ete ajoutee au stock produit et a la tracabilite.'
                );
              }}
            >
              <div className="field-grid">
                <label className="field">
                  <span>Culture</span>
                  <select value={cropHarvestForm.cropId} onChange={(event) => setCropHarvestForm((current) => ({ ...current, cropId: event.target.value }))}>
                    {overview?.options.crops.map((crop) => (
                      <option key={crop.id} value={crop.id}>
                        {crop.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Date recolte</span>
                  <input type="date" value={cropHarvestForm.harvestedAt} onChange={(event) => setCropHarvestForm((current) => ({ ...current, harvestedAt: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Quantite recoltee</span>
                  <input type="number" value={cropHarvestForm.quantity} onChange={(event) => setCropHarvestForm((current) => ({ ...current, quantity: Number(event.target.value) }))} />
                </label>
                <label className="field">
                  <span>Pertes</span>
                  <input type="number" value={cropHarvestForm.losses} onChange={(event) => setCropHarvestForm((current) => ({ ...current, losses: Number(event.target.value) }))} />
                </label>
                <label className="field">
                  <span>Unite</span>
                  <input value={cropHarvestForm.unit} onChange={(event) => setCropHarvestForm((current) => ({ ...current, unit: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Qualite</span>
                  <select value={cropHarvestForm.quality} onChange={(event) => setCropHarvestForm((current) => ({ ...current, quality: event.target.value as typeof current.quality }))}>
                    <option value="EXCELLENT">Excellente</option>
                    <option value="BONNE">Bonne</option>
                    <option value="MOYENNE">Moyenne</option>
                    <option value="FAIBLE">Faible</option>
                  </select>
                </label>
              </div>
              <div className="module-inline-note">
                <span>La recolte est reliee a la culture d origine puis transformee en stock vendable.</span>
                <Button className="module-submit-button production-action-button production-action-button-primary" type="submit" disabled={isPending}>
                  Enregistrer la recolte
                </Button>
              </div>
            </form>
          ) : null}
        </article>

        <article className="module-form-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Vendre</p>
              <h2>Transformation en revenu</h2>
            </div>
            <div className="farm-module-icon">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!session?.token) {
                return;
              }
              void runAction(
                () => createProductSale(farmId, saleForm, session.token).then(() => undefined),
                'Vente enregistree',
                'La vente a ete rattachee au stock, a la finance et a la tracabilite.'
              );
            }}
          >
            <div className="field-grid">
              <label className="field">
                <span>Stock produit</span>
                <select value={saleForm.stockId} onChange={(event) => setSaleForm((current) => ({ ...current, stockId: event.target.value }))}>
                  {overview?.stocks.map((stock) => (
                    <option key={stock.id} value={stock.id}>
                      {stock.productName} - {stock.availableQuantity} {stock.unit}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Quantite vendue</span>
                <input type="number" value={saleForm.quantitySold} onChange={(event) => setSaleForm((current) => ({ ...current, quantitySold: Number(event.target.value) }))} />
              </label>
              <label className="field">
                <span>Prix unitaire</span>
                <input type="number" value={saleForm.unitPrice} onChange={(event) => setSaleForm((current) => ({ ...current, unitPrice: Number(event.target.value) }))} />
              </label>
              <label className="field">
                <span>Montant paye</span>
                <input type="number" value={saleForm.amountPaid} onChange={(event) => setSaleForm((current) => ({ ...current, amountPaid: Number(event.target.value) }))} />
              </label>
              <label className="field">
                <span>Mode de paiement</span>
                <select value={saleForm.paymentMethod} onChange={(event) => setSaleForm((current) => ({ ...current, paymentMethod: event.target.value as ProductSaleView['paymentMethod'] }))}>
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Client</span>
                <input value={saleForm.customerName} onChange={(event) => setSaleForm((current) => ({ ...current, customerName: event.target.value }))} />
              </label>
              <label className="field">
                <span>Date vente</span>
                <input type="date" value={saleForm.saleDate} onChange={(event) => setSaleForm((current) => ({ ...current, saleDate: event.target.value }))} />
              </label>
            </div>
            <div className="module-inline-note">
              <span>
                {selectedStock
                  ? `${selectedStock.productName} - reste ${selectedStock.availableQuantity.toFixed(2)} ${selectedStock.unit}`
                  : 'Choisir un stock a vendre'}
              </span>
              <Button className="module-submit-button production-action-button production-action-button-secondary" variant="secondary" type="submit" disabled={isPending || !saleForm.stockId}>
                Vendre
              </Button>
            </div>
          </form>

            <div className="dashboard-inline-actions" style={{ marginTop: 24 }}>
            <div>
              <p className="eyebrow">Paiement complementaire</p>
              <h2>Encaisser un reliquat</h2>
            </div>
            <div className="farm-module-icon">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!session?.token || !paymentForm.saleId) {
                return;
              }
              void runAction(
                () => addProductSalePayment(farmId, paymentForm.saleId, paymentForm, session.token).then(() => undefined),
                'Paiement ajoute',
                'Le reliquat client a ete mis a jour.'
              );
            }}
          >
            <div className="field-grid">
              <label className="field">
                <span>Vente concernee</span>
                <select
                  value={paymentForm.saleId}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, saleId: event.target.value }))}
                >
                  {overview?.sales
                    .filter((sale) => sale.remainingAmount > 0)
                    .map((sale) => (
                      <option key={sale.id} value={sale.id}>
                        {sale.saleCode} - {sale.customerName} - reste {sale.remainingAmount.toFixed(2)}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field">
                <span>Date paiement</span>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, paymentDate: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Montant</span>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, amount: Number(event.target.value) }))}
                />
              </label>
              <label className="field">
                <span>Mode</span>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      paymentMethod: event.target.value as ProductSaleView['paymentMethod']
                    }))
                  }
                >
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="module-inline-note">
              <span>
                {selectedOutstandingSale
                  ? `Client ${selectedOutstandingSale.customerName} - reste ${selectedOutstandingSale.remainingAmount.toFixed(2)}`
                  : 'Aucune vente partielle disponible'}
              </span>
              <Button className="module-submit-button production-action-button production-action-button-secondary" variant="secondary" type="submit" disabled={isPending || !paymentForm.saleId}>
                Ajouter le paiement
              </Button>
            </div>
          </form>
        </article>
      </section>

      <section className="module-split-grid">
        <article className="module-list-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Historique production</p>
              <h2>50 derniers enregistrements</h2>
            </div>
            <Badge variant="neutral">{overview?.records.length ?? 0}</Badge>
          </div>
          <div className="field-grid">
            <label className="field">
              <span>Type</span>
              <select value={recordTypeFilter} onChange={(event) => setRecordTypeFilter(event.target.value as typeof recordTypeFilter)}>
                <option value="ALL">Tous</option>
                <option value="EGGS">Pondeuses</option>
                <option value="FISH_GROWTH">Pisciculture</option>
                <option value="FISH_HARVEST">Recolte poissons</option>
                <option value="CROP_HARVEST">Recolte cultures</option>
              </select>
            </label>
            <label className="field">
              <span>Recherche</span>
              <input value={searchText} onChange={(event) => setSearchText(event.target.value)} />
            </label>
          </div>
          <div className="module-catalog-grid">
            {filteredRecords.map((record, index) => (
              <motion.article
                key={record.id}
                className="module-catalog-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <div className="module-card-top">
                  <p className="eyebrow">{record.productionType}</p>
                  <Badge variant="info">{record.uniqueCode}</Badge>
                </div>
                <h2>{record.productionLabel}</h2>
                <div className="module-detail-list">
                  <span>{record.quantityProduced.toFixed(2)} {record.unit} produits</span>
                  <span>{record.quantitySellable.toFixed(2)} {record.unit} vendables</span>
                  <span>{record.quantityLost.toFixed(2)} {record.unit} perdus</span>
                  <span>{new Date(record.productionDate).toLocaleDateString()}</span>
                </div>
              </motion.article>
            ))}
            {!filteredRecords.length ? (
              <article className="module-catalog-card module-empty-card">
                <div>
                  <p className="eyebrow">Filtre</p>
                  <h2>Aucun enregistrement visible</h2>
                  <p>Ajuste les filtres ou commence par saisir une production.</p>
                </div>
              </article>
            ) : null}
          </div>
        </article>

        <article className="module-list-card">
          <div className="dashboard-inline-actions">
            <div>
            <p className="eyebrow">Traçabilite et ventes</p>
              <h2>Du produit jusqu au client</h2>
            </div>
            <Badge variant="success">{overview?.traceability.length ?? 0} evenement(s)</Badge>
          </div>
          <div className="field-grid">
            <label className="field">
              <span>Statut vente</span>
              <select value={saleStatusFilter} onChange={(event) => setSaleStatusFilter(event.target.value as typeof saleStatusFilter)}>
                <option value="ALL">Toutes</option>
                <option value="PARTIAL">Partielles</option>
                <option value="SETTLED">Reglees</option>
              </select>
            </label>
          </div>
          <div className="module-catalog-grid">
            {filteredSales.map((sale) => (
              <article key={sale.id} className="module-catalog-card">
                <div className="module-card-top">
                  <p className="eyebrow">{sale.saleCode}</p>
                  <Badge variant={sale.remainingAmount > 0 ? 'warning' : 'success'}>
                    {sale.remainingAmount > 0 ? 'Partiel' : 'Regle'}
                  </Badge>
                </div>
                <h2>{sale.productName}</h2>
                <div className="module-detail-list">
                  <span>{sale.quantitySold.toFixed(2)} {sale.unit}</span>
                  <span>Total: {sale.totalAmount.toFixed(2)}</span>
                  <span>Paye: {sale.amountPaid.toFixed(2)}</span>
                  <span>Reste: {sale.remainingAmount.toFixed(2)}</span>
                  <span>{sale.customerName}</span>
                </div>
              </article>
            ))}
            {overview?.traceability.slice(0, 8).map((event) => (
              <article key={event.id} className="module-catalog-card">
                <div className="module-card-top">
                  <p className="eyebrow">{event.eventType}</p>
                  <Badge variant="neutral">{new Date(event.eventDate).toLocaleDateString()}</Badge>
                </div>
                <h2>{event.title}</h2>
                <p>{event.details ?? 'Evenement de tracabilite enregistre.'}</p>
              </article>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}




