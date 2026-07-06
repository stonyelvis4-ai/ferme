'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Activity, AlertTriangle, DollarSign, Fish, Package, Waves, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { AppShell } from '../../../../components/app-shell';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { useToast } from '../../../../components/ui/toast-provider';
import { useSession } from '../../../../hooks/use-session';
import {
  addProductSalePayment,
  createFishGrowthRecord,
  createFishHarvestRecord,
  createProductSale,
  getFarmProductionOverview,
  type ProductionOverviewView,
  type ProductSaleView
} from '../../../../services/farm-client';

type PiscicultureMode = 'GROWTH' | 'HARVEST' | 'SALE' | 'PAYMENT';

const paymentMethods: ProductSaleView['paymentMethod'][] = [
  'CASH',
  'MOBILE_MONEY',
  'BANK_TRANSFER',
  'CARD',
  'CREDIT',
  'OTHER'
];

export default function PisciculturePage({
  params
}: {
  params: Promise<{ farmId: string }>;
}) {
  const session = useSession();
  const router = useRouter();
  const { pushToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [farmId, setFarmId] = useState('');
  const farmName = 'Ferme';
  const [overview, setOverview] = useState<ProductionOverviewView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<PiscicultureMode>('GROWTH');
  const [searchText, setSearchText] = useState('');
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

  function refresh(activeFarmId: string, token: string) {
    return getFarmProductionOverview(activeFarmId, token).then((response) => {
      setOverview(response);
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

  const fishRecords = useMemo(() => {
    return overview?.records.filter((record) => record.productionType === 'FISH_GROWTH' || record.productionType === 'FISH_HARVEST') ?? [];
  }, [overview]);

  const filteredRecords = useMemo(() => {
    return fishRecords.filter((record) => {
      if (!searchText.trim()) {
        return true;
      }

      return `${record.productionLabel} ${record.uniqueCode} ${record.notes ?? ''}`
        .toLowerCase()
        .includes(searchText.toLowerCase());
    });
  }, [fishRecords, searchText]);

  const outstandingReceivables =
    overview?.sales.reduce((sum, sale) => sum + sale.remainingAmount, 0) ?? 0;

  const fishStats = useMemo(() => {
    if (!overview) {
      return [];
    }

    return [
      {
        label: 'Biomasse',
        value: `${overview.breakdown.fish.biomass.toFixed(2)} kg`,
        icon: Activity
      },
      {
        label: 'Croissance',
        value: `${overview.breakdown.fish.averageGrowthRate.toFixed(1)}%`,
        icon: TrendingUp
      },
      {
        label: 'Oxygene',
        value: `${overview.breakdown.fish.averageOxygen.toFixed(1)} mg/L`,
        icon: Waves
      },
      {
        label: 'pH moyen',
        value: overview.breakdown.fish.averagePh.toFixed(1),
        icon: AlertTriangle
      },
      {
        label: 'Stock poissons',
        value: `${overview.breakdown.fish.sellableHarvest.toFixed(2)} kg`,
        icon: Package
      },
      {
        label: 'CA poissons',
        value: overview.breakdown.fish.sellableHarvest > 0 ? `${overview.stats.salesRevenue.toFixed(2)} FCFA` : '0 FCFA',
        icon: DollarSign
      }
    ];
  }, [overview]);

  function openAgendaComposer() {
    if (!farmId) {
      return;
    }

    router.push(`/farms/${farmId}/agenda?compose=1&module=pisciculture&entityType=BASSIN`);
  }

  async function runAction(action: () => Promise<void>, successTitle: string, successDescription: string) {
    if (!session?.token) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await action();
        await refresh(farmId, session.token);
        pushToast({ title: successTitle, description: successDescription, variant: 'success' });
      } catch (submissionError) {
        const message =
          submissionError instanceof Error ? submissionError.message : 'Operation impossible';
        setError(message);
        pushToast({ title: 'Operation impossible', description: message, variant: 'error' });
      }
    });
  }

  const workflowSteps = [
    { title: 'Bassin', description: 'Initialiser le site et l’effectif de départ.', icon: Fish },
    { title: 'Empoissonnement', description: 'Lier les alevins au bassin et à la date.', icon: Waves },
    { title: 'Croissance', description: 'Contrôler biomasse, oxygène, pH et alimentation.', icon: Activity },
    { title: 'Récolte', description: 'Relier la pêche, le stock poissons et les ventes.', icon: DollarSign },
    { title: 'Rentabilité', description: 'Garder le résultat visible dans le même cockpit.', icon: TrendingUp }
  ] as const;
  const selectedStock = overview?.stocks.find((stock) => stock.id === saleForm.stockId) ?? null;
  const selectedSale = overview?.sales.find((sale) => sale.id === paymentForm.saleId) ?? null;

  return (
    <AppShell title={`Pisciculture - ${overview?.farm.name ?? farmName}`}>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="module-hero-grid pisciculture-hero-grid pisciculture-hero-grid-premium">
        <article className="module-hero-card pisciculture-hero-card pisciculture-hero-card-premium">
          <div className="module-hero-top">
            <div>
              <p className="eyebrow">Pisciculture premium</p>
              <h2 className="module-hero-title">Pilotage complet du bassin</h2>
            </div>
            <Badge variant="info">{overview?.farm.activityType ?? 'PISCICULTURE'}</Badge>
          </div>
          <p className="hero-copy module-hero-copy">
            Empoissonnement, suivi de croissance, qualité de l’eau, récolte, stock poissons, ventes et rentabilité
            restent relies dans un flux unique.
          </p>
          <div className="module-pill-row">
            {workflowSteps.map((step) => (
              <span key={step.title} className="module-detail-chip">
                {step.title}
              </span>
            ))}
          </div>
          <div className="module-inline-actions">
            <Button className="module-submit-button pisciculture-action-button pisciculture-action-button-primary" type="button" onClick={openAgendaComposer}>
              Planifier une tache
            </Button>
            <Button
              className="module-submit-button pisciculture-action-button pisciculture-action-button-secondary"
              type="button"
              variant="secondary"
              onClick={() => router.push(`/farms/${farmId}/agenda`)}
            >
              Ouvrir l agenda
            </Button>
          </div>
          <div className="module-kpi-grid">
            {fishStats.map((stat) => {
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
                </article>
              );
            })}
          </div>
        </article>

        <article className="module-spotlight-card pisciculture-spotlight-card pisciculture-spotlight-card-premium">
          <div className="module-card-top">
            <p className="eyebrow">Sante du bassin</p>
            <Badge variant={overview && (overview.breakdown.fish.averageOxygen < 4 || overview.breakdown.fish.averagePh < 5.5 || overview.breakdown.fish.averagePh > 9) ? 'critical' : 'success'}>
              {overview?.breakdown.fish.growthRecords ?? 0} suivis
            </Badge>
          </div>
          <h2>Vue metier unifiee</h2>
          <div className="module-detail-list">
            <span>Biomasse estimée: {overview?.breakdown.fish.biomass.toFixed(2) ?? '0.00'} kg</span>
            <span>Croissance moyenne: {overview?.breakdown.fish.averageGrowthRate.toFixed(1) ?? '0.0'}%</span>
            <span>Oxygène moyen: {overview?.breakdown.fish.averageOxygen.toFixed(1) ?? '0.0'} mg/L</span>
            <span>pH moyen: {overview?.breakdown.fish.averagePh.toFixed(1) ?? '0.0'}</span>
            <span>Stock disponible: {overview?.breakdown.fish.sellableHarvest.toFixed(2) ?? '0.00'} kg</span>
          </div>
        </article>
      </section>

      <section className="module-flow-strip pisciculture-flow-strip pisciculture-flow-strip-premium">
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
              <span>{step.description}</span>
            </article>
          );
        })}
      </section>

      <section className="module-split-grid pisciculture-summary-grid pisciculture-summary-grid-premium">
        <article className="module-list-card pisciculture-summary-card pisciculture-summary-card-premium">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Performance bassin</p>
              <h2>Indicateurs clefs pisciculture</h2>
            </div>
            <Badge variant="info">{overview?.breakdown.fish.harvestRecords ?? 0} recolte(s)</Badge>
          </div>
          <div className="module-detail-list">
            <span>Biomasse: {overview?.breakdown.fish.biomass.toFixed(2) ?? '0.00'} kg</span>
            <span>Mortalité: {overview?.breakdown.fish.mortality ?? 0}</span>
            <span>Aliment distribué: {overview?.breakdown.fish.feedCost.toFixed(2) ?? '0.00'} FCFA</span>
            <span>Oxygène: {overview?.breakdown.fish.averageOxygen.toFixed(1) ?? '0.0'} mg/L</span>
            <span>pH: {overview?.breakdown.fish.averagePh.toFixed(1) ?? '0.0'}</span>
          </div>
        </article>

        <article className="module-list-card pisciculture-summary-card pisciculture-summary-card-premium">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Finance</p>
              <h2>Revenus et encaissements</h2>
            </div>
            <Badge variant={outstandingReceivables > 0 ? 'warning' : 'success'}>
              {outstandingReceivables.toFixed(2)} FCFA
            </Badge>
          </div>
          <div className="module-detail-list">
            <span>Chiffre d affaires: {overview?.stats.salesRevenue.toFixed(2) ?? '0.00'} FCFA</span>
            <span>Montant encaisse: {overview?.stats.salesPaid.toFixed(2) ?? '0.00'} FCFA</span>
            <span>Marge: {overview?.stats.margin.toFixed(2) ?? '0.00'} FCFA</span>
            <span>Stock poissons: {overview?.breakdown.fish.sellableHarvest.toFixed(2) ?? '0.00'} kg</span>
          </div>
        </article>
      </section>

      {overview?.breakdown.alerts.length ? (
        <section className="module-split-grid pisciculture-alert-grid pisciculture-alert-grid-premium">
          <article className="module-list-card pisciculture-alert-card pisciculture-alert-card-premium">
            <div className="dashboard-inline-actions">
              <div>
                <p className="eyebrow">Alerte eau</p>
                <h2>Signaux critiques</h2>
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

      <section className="module-action-grid pisciculture-action-grid pisciculture-action-grid-premium">
        <article className="module-form-card pisciculture-form-card pisciculture-form-card-premium">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Nouvel enregistrement</p>
              <h2>Saisie piscicole guidee</h2>
            </div>
            <div className="farm-module-icon">
              <Fish className="h-5 w-5" />
            </div>
          </div>

          <div className="module-pill-row">
            <button className="module-detail-chip pisciculture-mode-chip pisciculture-mode-chip-premium" type="button" onClick={() => setMode('GROWTH')}>
              Croissance
            </button>
            <button className="module-detail-chip pisciculture-mode-chip pisciculture-mode-chip-premium" type="button" onClick={() => setMode('HARVEST')}>
              Recolte
            </button>
            <button className="module-detail-chip pisciculture-mode-chip pisciculture-mode-chip-premium" type="button" onClick={() => setMode('SALE')}>
              Vente
            </button>
            <button className="module-detail-chip pisciculture-mode-chip pisciculture-mode-chip-premium" type="button" onClick={() => setMode('PAYMENT')}>
              Paiement
            </button>
          </div>

          {mode === 'GROWTH' ? (
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
                  <span>Bassin / lot</span>
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
                  <input value={fishGrowthForm.species} onChange={(event) => setFishGrowthForm((current) => ({ ...current, species: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Empoissonnement</span>
                  <input type="date" value={fishGrowthForm.stockingDate} onChange={(event) => setFishGrowthForm((current) => ({ ...current, stockingDate: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Date suivi</span>
                  <input type="date" value={fishGrowthForm.productionDate} onChange={(event) => setFishGrowthForm((current) => ({ ...current, productionDate: event.target.value }))} />
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
                <label className="field field-span-2">
                  <span>Observations</span>
                  <input value={fishGrowthForm.notes} onChange={(event) => setFishGrowthForm((current) => ({ ...current, notes: event.target.value }))} />
                </label>
              </div>
              <div className="module-inline-note">
                <span>Biomasse, qualité de l’eau et rentabilité seront tracées automatiquement.</span>
                <Button className="module-submit-button pisciculture-action-button pisciculture-action-button-primary" type="submit" disabled={isPending}>
                  Enregistrer le suivi
                </Button>
              </div>
            </form>
          ) : null}

          {mode === 'HARVEST' ? (
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
                  <span>Bassin / lot</span>
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
                <label className="field field-span-2">
                  <span>Observations</span>
                  <input value={fishHarvestForm.notes} onChange={(event) => setFishHarvestForm((current) => ({ ...current, notes: event.target.value }))} />
                </label>
              </div>
              <div className="module-inline-note">
                <span>Le stock poissons sera mis a jour automatiquement apres la recolte.</span>
                <Button className="module-submit-button pisciculture-action-button pisciculture-action-button-primary" type="submit" disabled={isPending}>
                  Recolter
                </Button>
              </div>
            </form>
          ) : null}

          {mode === 'SALE' ? (
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
                  'La vente a ete ajoutee au suivi commercial.'
                );
              }}
            >
              <div className="field-grid">
                <label className="field">
                  <span>Stock poissons</span>
                  <select value={saleForm.stockId} onChange={(event) => setSaleForm((current) => ({ ...current, stockId: event.target.value }))}>
                    {overview?.stocks.map((stock) => (
                      <option key={stock.id} value={stock.id}>
                        {stock.productName} - {stock.availableQuantity.toFixed(2)} {stock.unit}
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
                  <span>Client</span>
                  <input value={saleForm.customerName} onChange={(event) => setSaleForm((current) => ({ ...current, customerName: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Date vente</span>
                  <input type="date" value={saleForm.saleDate} onChange={(event) => setSaleForm((current) => ({ ...current, saleDate: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Mode paiement</span>
                  <select value={saleForm.paymentMethod} onChange={(event) => setSaleForm((current) => ({ ...current, paymentMethod: event.target.value as ProductSaleView['paymentMethod'] }))}>
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field field-span-2">
                  <span>Notes</span>
                  <input value={saleForm.notes} onChange={(event) => setSaleForm((current) => ({ ...current, notes: event.target.value }))} />
                </label>
              </div>
              <div className="module-inline-note">
                <span>{selectedStock ? `${selectedStock.productName} disponible: ${selectedStock.availableQuantity.toFixed(2)} ${selectedStock.unit}` : 'Choisis un stock pour vendre.'}</span>
                <Button className="module-submit-button pisciculture-action-button pisciculture-action-button-primary" type="submit" disabled={isPending}>
                  Enregistrer la vente
                </Button>
              </div>
            </form>
          ) : null}

          {mode === 'PAYMENT' ? (
            <form
              className="stack-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!session?.token || !paymentForm.saleId) {
                  return;
                }
                void runAction(
                  () => addProductSalePayment(farmId, paymentForm.saleId, paymentForm, session.token).then(() => undefined),
                  'Paiement enregistre',
                  'Le paiement a ete rattache a la vente.'
                );
              }}
            >
              <div className="field-grid">
                <label className="field">
                  <span>Vente</span>
                  <select value={paymentForm.saleId} onChange={(event) => setPaymentForm((current) => ({ ...current, saleId: event.target.value }))}>
                    {overview?.sales.map((sale) => (
                      <option key={sale.id} value={sale.id}>
                        {sale.saleCode} - reste {sale.remainingAmount.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Date paiement</span>
                  <input type="date" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentDate: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Montant</span>
                  <input type="number" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: Number(event.target.value) }))} />
                </label>
                <label className="field">
                  <span>Mode paiement</span>
                  <select value={paymentForm.paymentMethod} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentMethod: event.target.value as ProductSaleView['paymentMethod'] }))}>
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field field-span-2">
                  <span>Note</span>
                  <input value={paymentForm.note} onChange={(event) => setPaymentForm((current) => ({ ...current, note: event.target.value }))} />
                </label>
              </div>
              <div className="module-inline-note">
                <span>{selectedSale ? `${selectedSale.saleCode} - reste ${selectedSale.remainingAmount.toFixed(2)} FCFA` : 'Choisis une vente en attente.'}</span>
                <Button className="module-submit-button pisciculture-action-button pisciculture-action-button-primary" type="submit" disabled={isPending}>
                  Enregistrer le paiement
                </Button>
              </div>
            </form>
          ) : null}
        </article>

        <article className="module-list-card pisciculture-history-card pisciculture-history-card-premium">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Historique piscicole</p>
              <h2>Derniers mouvements du bassin</h2>
            </div>
            <Badge variant="success">{filteredRecords.length}</Badge>
          </div>

          <label className="agenda-search">
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Rechercher un suivi, une recolte ou une vente..."
            />
          </label>

          <div className="agenda-quick-list">
            {filteredRecords.length ? (
              filteredRecords.slice(0, 8).map((record, index) => (
                <motion.button
                  key={record.id}
                  type="button"
                  className="agenda-snippet agenda-snippet-button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <strong>{record.productionLabel}</strong>
                  <span className="muted">{record.uniqueCode}</span>
                  <span>{new Date(record.productionDate).toLocaleDateString('fr-FR')}</span>
                </motion.button>
              ))
            ) : (
              <p className="muted">Aucun mouvement piscicole pour le moment.</p>
            )}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
