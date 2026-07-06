'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Boxes, PackagePlus, TrendingDown } from 'lucide-react';
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
  type StockItemView
} from '../../../../services/farm-client';

const defaultItem = {
  category: 'ALIMENTS' as const,
  name: '',
  unit: 'kg',
  currentQuantity: 0,
  lowStockThreshold: 10
};

const inventoryWorkflowSteps = [
  {
    title: 'Article',
    description: 'Créer la ressource avec son seuil de sécurité.',
    icon: Boxes
  },
  {
    title: 'Seuil',
    description: 'Déclencher les alertes avant la rupture.',
    icon: AlertTriangle
  },
  {
    title: 'Mouvement',
    description: 'Suivre les sorties et les consommations terrain.',
    icon: PackagePlus
  },
  {
    title: 'Stock',
    description: 'Lire la disponibilité réelle en un coup d’œil.',
    icon: TrendingDown
  }
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
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockCount: 0,
    outOfStockCount: 0
  });
  const [form, setForm] = useState(defaultItem);
  const [error, setError] = useState<string | null>(null);
  const { pushToast } = useToast();

  function refresh(activeFarmId: string, token: string) {
    return getFarmStockItems(activeFarmId, token).then((response) => {
      setItems(response.items);
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
            note: 'Sortie operationnelle'
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

  return (
    <AppShell title={`Stocks - ${farmName}`}>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="dashboard-hero-grid inventory-hero-grid-premium">
        <article className="dashboard-hero-card inventory-hero-card-premium">
          <div className="dashboard-hero-top">
            <div>
              <p className="eyebrow">Stocks intelligents</p>
              <h2 className="dashboard-hero-title">Une lecture plus claire de vos ressources</h2>
            </div>
            <Badge variant={lowStockCount ? 'warning' : 'success'}>
              {lowStockCount ? 'Approvisionnement requis' : 'Niveau stable'}
            </Badge>
          </div>
          <p className="hero-copy dashboard-hero-copy">
            Suivez vos articles, reperez les seuils faibles plus vite et pilotez les sorties avec
            une interface plus nette.
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
              <TrendingDown className="h-4 w-4" />
              {outOfStockCount} rupture(s)
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
              <span>{step.description}</span>
            </article>
          );
        })}
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
            <h2 className="farms-section-title">Ajouter un article avec seuil intelligent</h2>
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
                    category: event.target.value as typeof form.category
                  }))
                }
              >
                <option value="ALIMENTS">Aliments</option>
                <option value="MEDICAMENTS">Medicaments</option>
                <option value="SEMENCES">Semences</option>
                <option value="ENGRAIS">Engrais</option>
                <option value="EQUIPEMENTS">Equipements</option>
                <option value="MATERIELS">Materiels</option>
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
            Ajouter le stock
          </Button>
        </form>
      </section>

      <section className="dashboard-summary-grid inventory-summary-grid">
        {items.length ? (
          items.map((item, index) => (
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
                <p className="eyebrow">{item.category}</p>
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
              <strong className="metric-number">
                {item.currentQuantity} {item.unit}
              </strong>
              <p className="muted">Seuil critique: {item.lowStockThreshold}</p>
              {item.recommendedReorderQuantity > 0 ? (
                <p className="muted">
                  Reappro conseille: {item.recommendedReorderQuantity} {item.unit}
                </p>
              ) : (
                <p className="muted">Niveau de stock confortable.</p>
              )}
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
            <h2>Aucun stock enregistre</h2>
            <p className="muted">Ajoute un premier article pour commencer le suivi des stocks.</p>
          </article>
        )}
      </section>
    </AppShell>
  );
}
