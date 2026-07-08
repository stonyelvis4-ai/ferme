'use client';

import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Clock3,
  Filter,
  History,
  PackagePlus,
  Search,
  Sparkles,
  TrendingDown
} from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { AppShell } from '../../../../components/app-shell';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { useToast } from '../../../../components/ui/toast-provider';
import { useSession } from '../../../../hooks/use-session';
import {
  createStockItem,
  createStockMovement,
  getFarm,
  getFarmStockItems,
  type StockMovementView,
  type StockItemView
} from '../../../../services/farm-client';

const defaultItem: InventoryForm = {
  category: 'ALIMENTS' as const,
  name: '',
  unit: 'kg',
  currentQuantity: 0,
  lowStockThreshold: 10
};

type InventoryForm = {
  category: StockItemView['category'];
  name: string;
  unit: string;
  currentQuantity: number;
  lowStockThreshold: number;
};

const movementTypeLabels = {
  ENTREE: 'Entrée',
  SORTIE: 'Sortie',
  INVENTAIRE: 'Inventaire',
  AJUSTEMENT: 'Ajustement'
} as const;

const inventoryWorkflowSteps = [
  { title: 'Article', icon: Boxes },
  { title: 'Prévision', icon: Sparkles },
  { title: 'Mouvement', icon: PackagePlus },
  { title: 'Traçabilité', icon: History }
] as const;

const categoryOptions = [
  { value: 'ALIMENTS', label: 'Aliments' },
  { value: 'MEDICAMENTS', label: 'Medicaments' },
  { value: 'SEMENCES', label: 'Semences' },
  { value: 'ENGRAIS', label: 'Engrais' },
  { value: 'EQUIPEMENTS', label: 'Equipements' },
  { value: 'MATERIELS', label: 'Materiels' },
  { value: 'VACCINS', label: 'Vaccins' },
  { value: 'CARBURANT', label: 'Carburant' },
  { value: 'PRODUITS_VETERINAIRES', label: 'Produits veterinaires' },
  { value: 'PRODUITS_ELEVAGE', label: "Produits d'elevage" },
  { value: 'PRODUITS_PISCICOLES', label: 'Produits piscicoles' },
  { value: 'PRODUITS_AGRICOLES', label: 'Produits agricoles' }
] as const;

export default function FarmInventoryPage({
  params
}: {
  params: Promise<{ farmId: string }>;
}) {
  const session = useSession();
  const [isPending, startTransition] = useTransition();
  const [farmId, setFarmId] = useState('');
  const [farmName, setFarmName] = useState('Ferme');
  const [items, setItems] = useState<StockItemView[]>([]);
  const [movements, setMovements] = useState<StockMovementView[]>([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    criticalItemsCount: 0,
    averageAutonomyDays: 0,
    recentMovementsCount: 0,
    outgoingQuantity30d: 0,
    incomingQuantity30d: 0
  });
  const [form, setForm] = useState<InventoryForm>(defaultItem);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [error, setError] = useState<string | null>(null);
  const { pushToast } = useToast();

  function refresh(activeFarmId: string, token: string) {
    return getFarmStockItems(activeFarmId, token).then((response) => {
      setItems(response.items);
      setMovements(response.movements);
      setStats(response.stats);
    });
  }

  useEffect(() => {
    params.then((value) => setFarmId(value.farmId));
  }, [params]);

  useEffect(() => {
    if (!session?.token || !farmId) {
      return;
    }

    getFarm(farmId, session.token)
      .then((farm) => setFarmName(farm.name))
      .catch(() => setFarmName(`Ferme ${farmId}`));

    refresh(farmId, session.token).catch(() => setItems([]));
  }, [farmId, session?.token]);

  function submitItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token) {
      return;
    }

    startTransition(async () => {
      try {
        await createStockItem(farmId, form, session.token);
        setForm(defaultItem);
        await refresh(farmId, session.token);
        pushToast({
          title: 'Article ajoute',
          description: 'Le nouvel article de stock a ete creee avec succes.',
          variant: 'success'
        });
      } catch (submissionError) {
        const message =
          submissionError instanceof Error ? submissionError.message : 'Creation impossible';
        setError(message);
        pushToast({
          title: 'Creation impossible',
          description: message,
          variant: 'error'
        });
      }
    });
  }

  function withdraw(item: StockItemView) {
    if (!session?.token) {
      return;
    }

    startTransition(async () => {
      try {
        await createStockMovement(
          farmId,
          {
            stockItemId: item.id,
            movementType: 'SORTIE',
            quantity: Math.max(1, Math.min(5, item.currentQuantity || 1)),
            note: 'Sortie operationnelle',
            sourceModule: 'INVENTORY',
            sourceEntityType: 'STOCK_ITEM',
            sourceEntityId: item.id,
            sourceEntityLabel: item.name,
            movementDate: new Date().toISOString()
          },
          session.token
        );
        await refresh(farmId, session.token);
        pushToast({
          title: 'Mouvement enregistre',
          description: `Sortie enregistree pour ${item.name}.`,
          variant: 'success'
        });
      } catch (submissionError) {
        const message =
          submissionError instanceof Error ? submissionError.message : 'Mouvement impossible';
        setError(message);
        pushToast({
          title: 'Mouvement impossible',
          description: message,
          variant: 'error'
        });
      }
    });
  }

  const lowStockCount = stats.lowStockCount;
  const outOfStockCount = stats.outOfStockCount;
  const availableCount = items.filter((item) => item.stockStatus === 'AVAILABLE').length;
  const filteredItems = items.filter((item) => {
    const matchesQuery =
      !query ||
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.categoryLabel.toLowerCase().includes(query.toLowerCase()) ||
      item.family.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || item.stockStatus === statusFilter;

    return matchesQuery && matchesCategory && matchesStatus;
  });
  const recentMovements = movements.slice(0, 8);

  return (
    <AppShell title={`Stocks - ${farmName}`}>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="dashboard-hero-grid inventory-hero-grid-premium">
        <article className="dashboard-hero-card inventory-hero-card-premium">
          <div className="dashboard-hero-top">
            <div>
              <p className="eyebrow">Stocks intelligents</p>
              <h2 className="dashboard-hero-title">Un centre logistique clair et traçable</h2>
            </div>
            <Badge variant={lowStockCount ? 'warning' : 'success'}>
              {lowStockCount ? 'Approvisionnement requis' : 'Niveau stable'}
            </Badge>
          </div>
          <p className="hero-copy dashboard-hero-copy">
            Suivez vos articles de consommation et de production, anticipez les ruptures et
            gardez une trace nette de chaque entrée, sortie et ajustement.
          </p>
          <div className="dashboard-hero-pills">
            <span className="dashboard-hero-pill">
              <Boxes className="h-4 w-4" />
              {items.length} article(s)
            </span>
            <span className="dashboard-hero-pill">
              <AlertTriangle className="h-4 w-4" />
              {lowStockCount} alerte(s)
            </span>
            <span className="dashboard-hero-pill">
              <Clock3 className="h-4 w-4" />
              {stats.recentMovementsCount} mouvement(s) 30j
            </span>
          </div>
          <div className="dashboard-hero-stat-grid inventory-hero-grid">
            <article className="dashboard-hero-stat dashboard-hero-stat-accent">
              <span className="dashboard-hero-stat-label">Disponibles</span>
              <strong>{availableCount}</strong>
              <span>Articles prets pour utilisation</span>
            </article>
            <article className="dashboard-hero-stat">
              <span className="dashboard-hero-stat-label">Seuils faibles</span>
              <strong>{lowStockCount}</strong>
              <span>Reapprovisionnement a planifier</span>
            </article>
            <article className="dashboard-hero-stat dashboard-hero-stat-muted">
              <span className="dashboard-hero-stat-label">Ruptures</span>
              <strong>{outOfStockCount}</strong>
              <span>Articles a traiter en urgence</span>
            </article>
            <article className="dashboard-hero-stat">
              <span className="dashboard-hero-stat-label">Autonomie moyenne</span>
              <strong>{stats.averageAutonomyDays.toFixed(1)}</strong>
              <span>Jours avant tension de stock</span>
            </article>
          </div>
        </article>

        <article className="dashboard-spotlight-card inventory-spotlight-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Synthese</p>
              <h2>{farmName}</h2>
            </div>
            <div className="farm-module-icon">
              <PackagePlus className="h-5 w-5" />
            </div>
          </div>
          <div className="metric-list">
            <span>Inventaire: {items.length}</span>
            <span>Stocks faibles: {lowStockCount}</span>
            <span>Ruptures: {outOfStockCount}</span>
          </div>
          <div className="inventory-summary-strip">
            <span className="status-pill">{availableCount} disponibles</span>
            <span className="status-pill">{stats.totalItems} total</span>
            <span className="status-pill">{stats.incomingQuantity30d.toFixed(0)} entrées 30j</span>
            <span className="status-pill">{stats.outgoingQuantity30d.toFixed(0)} sorties 30j</span>
          </div>
          <div className="inventory-mini-forecast">
            <article className="inventory-mini-metric">
              <ArrowDownRight className="h-4 w-4" />
              <span>Critiques</span>
              <strong>{stats.criticalItemsCount}</strong>
            </article>
            <article className="inventory-mini-metric">
              <ArrowUpRight className="h-4 w-4" />
              <span>Autonomie</span>
              <strong>{stats.averageAutonomyDays.toFixed(1)} j</strong>
            </article>
          </div>
        </article>
      </section>

      <section className="module-flow-strip">
        {inventoryWorkflowSteps.map((step, index) => {
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

      <section className="panel inventory-search-panel">
        <div className="dashboard-inline-actions">
          <div>
            <p className="eyebrow">Lecture rapide</p>
            <h2 className="farms-section-title">Filtrer les articles et suivre les mouvements</h2>
          </div>
          <div className="farm-module-icon">
            <Filter className="h-5 w-5" />
          </div>
        </div>
        <div className="field-grid inventory-filter-grid">
          <div className="field">
            <span>Recherche</span>
            <div className="field-with-icon">
              <Search className="field-icon h-4 w-4" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nom, categorie ou famille"
              />
            </div>
          </div>
          <label className="field">
            <span>Categorie</span>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="ALL">Toutes les categories</option>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Statut</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">Tous les statuts</option>
              <option value="AVAILABLE">Disponible</option>
              <option value="LOW">Faible</option>
              <option value="OUT_OF_STOCK">Rupture</option>
            </select>
          </label>
        </div>
      </section>

      <section className="dashboard-kpi-grid">
        <article className="metric-tile dashboard-kpi-tile">
          <div className="metric-header">
            <div className="metric-icon">
              <Boxes className="h-5 w-5" />
            </div>
            <Badge variant="info">Inventaire</Badge>
          </div>
          <p className="eyebrow">Articles suivis</p>
          <strong className="metric-number">{items.length}</strong>
          <span className="metric-delta">Ressources actives de la ferme</span>
        </article>
        <article className="metric-tile dashboard-kpi-tile">
          <div className="metric-header">
            <div className="metric-icon">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <Badge variant={lowStockCount ? 'warning' : 'success'}>Seuils</Badge>
          </div>
          <p className="eyebrow">Stocks faibles</p>
          <strong className="metric-number">{lowStockCount}</strong>
          <span className="metric-delta">Approvisionnement a planifier</span>
        </article>
        <article className="metric-tile dashboard-kpi-tile">
          <div className="metric-header">
            <div className="metric-icon">
              <TrendingDown className="h-5 w-5" />
            </div>
            <Badge variant={outOfStockCount ? 'critical' : 'success'}>Rupture</Badge>
          </div>
          <p className="eyebrow">Articles indisponibles</p>
          <strong className="metric-number">{outOfStockCount}</strong>
          <span className="metric-delta">Intervention immediate sur les stocks a zero</span>
        </article>
      </section>

      <section className="panel create-panel farm-management-panel inventory-form-panel">
        <div className="dashboard-inline-actions">
          <div>
            <p className="eyebrow">Nouveau stock</p>
            <h2 className="farms-section-title">Ajouter un article avec seuil et famille clairs</h2>
          </div>
          <div className="farm-module-icon">
            <PackagePlus className="h-5 w-5" />
          </div>
        </div>
        <form className="stack-form" onSubmit={submitItem}>
          <div className="field-grid">
            <label className="field">
              <span>Categorie</span>
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value as InventoryForm['category']
                    }))
                  }
                >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Nom</span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Unite</span>
              <input
                value={form.unit}
                onChange={(event) =>
                  setForm((current) => ({ ...current, unit: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Quantite</span>
              <input
                type="number"
                value={form.currentQuantity}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    currentQuantity: Number(event.target.value)
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Seuil faible</span>
              <input
                type="number"
                value={form.lowStockThreshold}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    lowStockThreshold: Number(event.target.value)
                  }))
                }
              />
            </label>
          </div>
          <Button
            className="module-submit-button inventory-action-button inventory-action-button-primary"
            type="submit"
            disabled={isPending}
          >
            Ajouter l'article
          </Button>
        </form>
      </section>

      <section className="dashboard-summary-grid inventory-summary-grid">
        {filteredItems.length ? (
          filteredItems.map((item, index) => (
            <motion.article
              key={item.id}
              className={`panel dashboard-summary-card inventory-card ${
                item.stockStatus === 'OUT_OF_STOCK'
                  ? 'alert-critical'
                  : item.stockStatus === 'LOW'
                    ? 'alert-warning'
                    : ''
              }`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <div className="dashboard-inline-actions">
                <div>
                  <p className="eyebrow">{item.categoryLabel}</p>
                  <p className="inventory-family-label">{item.family === 'PRODUCTION' ? 'Stock produit' : item.family === 'SUPPORT' ? 'Stock support' : 'Stock consommation'}</p>
                </div>
                <Badge
                  variant={
                    item.stockStatus === 'OUT_OF_STOCK'
                      ? 'critical'
                      : item.stockStatus === 'LOW'
                        ? 'warning'
                        : 'success'
                  }
                >
                  {item.stockStatus === 'OUT_OF_STOCK'
                    ? 'Rupture'
                    : item.stockStatus === 'LOW'
                      ? 'Faible'
                      : 'OK'}
                </Badge>
              </div>
              <h2>{item.name}</h2>
              <div className="inventory-card-meta">
                <span>Dernier mouvement: {item.lastMovementAt ? new Date(item.lastMovementAt).toLocaleDateString('fr-FR') : 'Aucun'}</span>
                <span>30j: {item.movementCount30d}</span>
              </div>
              <strong className="metric-number">
                {item.currentQuantity} {item.unit}
              </strong>
              <p className="muted">Seuil critique: {item.lowStockThreshold}</p>
              <p className="muted">
                Consommation moyenne: {item.averageDailyConsumption.toFixed(2)} {item.unit} / jour
              </p>
              <p className="muted">
                Autonomie estimée:{' '}
                {item.daysOfAutonomy !== null ? `${item.daysOfAutonomy.toFixed(1)} jours` : 'non calculable'}
              </p>
              {item.recommendedReorderQuantity > 0 ? (
                <p className="muted">
                  Reappro conseille: {item.recommendedReorderQuantity} {item.unit}
                </p>
              ) : (
                <p className="muted">Niveau de stock confortable.</p>
              )}
              {item.estimatedStockoutAt ? (
                <p className="muted">
                  Rupture estimee: {new Date(item.estimatedStockoutAt).toLocaleDateString('fr-FR')}
                </p>
              ) : null}
              {session?.user.role === 'ADMIN' ? (
                <Button
                  variant="secondary"
                  type="button"
                  disabled={isPending}
                  className="inventory-action-button inventory-action-button-premium inventory-action-button-secondary"
                  onClick={() => withdraw(item)}
                >
                  <TrendingDown className="h-4 w-4" />
                  Sortie rapide
                </Button>
              ) : null}
            </motion.article>
          ))
        ) : (
          <article className="panel empty-state farms-empty-state">
            <h2>Aucun article ne correspond aux filtres</h2>
            <p className="muted">
              Ajuste la recherche ou les filtres pour retrouver les articles de stock.
            </p>
          </article>
        )}
      </section>

      <section className="panel inventory-timeline-panel">
        <div className="dashboard-inline-actions">
          <div>
            <p className="eyebrow">Traçabilité</p>
            <h2 className="farms-section-title">Mouvements récents</h2>
          </div>
          <div className="farm-module-icon">
            <Activity className="h-5 w-5" />
          </div>
        </div>
        {recentMovements.length ? (
          <div className="inventory-timeline-list">
            {recentMovements.map((movement) => (
              <article key={movement.id} className="inventory-timeline-row">
                <div className="inventory-timeline-badge">
                  {movement.movementType === 'SORTIE' ? (
                    <ArrowDownRight className="h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </div>
                <div className="inventory-timeline-body">
                  <div className="inventory-timeline-top">
                    <strong>{movementTypeLabels[movement.movementType]}</strong>
                    <Badge variant={movement.movementType === 'SORTIE' ? 'warning' : 'success'}>
                      {movement.quantity}
                    </Badge>
                  </div>
                  <p>
                    {movement.sourceEntityLabel || movement.note || 'Mouvement trace'}{' '}
                    {movement.sourceModule ? `· ${movement.sourceModule}` : ''}
                  </p>
                  <span>
                    {new Date(movement.movementDate).toLocaleString('fr-FR')}
                    {movement.recordedByUserName ? ` · ${movement.recordedByUserName}` : ''}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">Aucun mouvement recent pour le moment.</p>
        )}
      </section>
    </AppShell>
  );
}

