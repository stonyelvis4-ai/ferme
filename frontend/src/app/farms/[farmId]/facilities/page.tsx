'use client';

import { motion } from 'framer-motion';
import { Building2, Fence, ShieldCheck, Wrench } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { AppShell } from '../../../../components/app-shell';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { useToast } from '../../../../components/ui/toast-provider';
import { useSession } from '../../../../hooks/use-session';
import {
  createFarmBuilding,
  createFarmEnclosure,
  deleteFarmBuilding,
  deleteFarmEnclosure,
  getFarm,
  getFarmFacilities,
  updateFarmBuilding,
  updateFarmEnclosure,
  type BuildingView,
  type EnclosureView
} from '../../../../services/farm-client';

type BuildingFormState = {
  name: string;
  buildingType: BuildingView['buildingType'];
  capacity: number;
  assignedTo: string;
  conditionLabel: string;
  status: BuildingView['status'];
  notes: string;
};

type EnclosureFormState = {
  name: string;
  enclosureType: EnclosureView['enclosureType'];
  capacity: number;
  assignedTo: string;
  conditionLabel: string;
  status: EnclosureView['status'];
  notes: string;
};

const defaultBuildingForm: BuildingFormState = {
  name: '',
  buildingType: 'POULAILLER',
  capacity: 0,
  assignedTo: '',
  conditionLabel: 'Bon etat',
  status: 'OPERATIONNEL',
  notes: ''
};

const defaultEnclosureForm: EnclosureFormState = {
  name: '',
  enclosureType: 'ENCLOS_GENERIC',
  capacity: 0,
  assignedTo: '',
  conditionLabel: 'Pret a utiliser',
  status: 'OPERATIONNEL',
  notes: ''
};

const fishBuildingPreset: BuildingFormState = {
  name: '',
  buildingType: 'BASSIN',
  capacity: 0,
  assignedTo: 'Pisciculture',
  conditionLabel: 'Controle eau effectue',
  status: 'OPERATIONNEL',
  notes: ''
};

const fishEnclosurePreset: EnclosureFormState = {
  name: '',
  enclosureType: 'BASSIN_OUVERT',
  capacity: 0,
  assignedTo: 'Pisciculture',
  conditionLabel: 'Niveau d eau stable',
  status: 'OPERATIONNEL',
  notes: ''
};

function facilityBadge(status: BuildingView['status'] | EnclosureView['status']) {
  if (status === 'OPERATIONNEL') {
    return 'success' as const;
  }

  if (status === 'MAINTENANCE') {
    return 'warning' as const;
  }

  return 'critical' as const;
}

const facilityWorkflowSteps = [
  { title: 'Bâtiment', icon: Building2 },
  { title: 'Enclos', icon: Fence },
  { title: 'Maintenance', icon: Wrench },
  { title: 'Sécurité', icon: ShieldCheck }
] as const;

export default function FarmFacilitiesPage({
  params
}: {
  params: Promise<{ farmId: string }>;
}) {
  const session = useSession();
  const [isPending, startTransition] = useTransition();
  const [farmId, setFarmId] = useState('');
  const [farmName, setFarmName] = useState('Ferme');
  const [isFishFarm, setIsFishFarm] = useState(false);
  const [buildings, setBuildings] = useState<BuildingView[]>([]);
  const [enclosures, setEnclosures] = useState<EnclosureView[]>([]);
  const [stats, setStats] = useState({
    totalBuildings: 0,
    totalEnclosures: 0,
    operationalCount: 0,
    maintenanceCount: 0,
    totalCapacity: 0
  });
  const [buildingForm, setBuildingForm] = useState<BuildingFormState>(defaultBuildingForm);
  const [enclosureForm, setEnclosureForm] = useState<EnclosureFormState>(defaultEnclosureForm);
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [editingEnclosureId, setEditingEnclosureId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { pushToast } = useToast();

  function refresh(activeFarmId: string, token: string) {
    return getFarmFacilities(activeFarmId, token).then((response) => {
      setBuildings(response.buildings);
      setEnclosures(response.enclosures);
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
      .then((farm) => {
        setFarmName(farm.name);
        const nextIsFishFarm = farm.activityType === 'PISCICULTURE';
        setIsFishFarm(nextIsFishFarm);
        if (nextIsFishFarm) {
          setBuildingForm((current) => (current.name ? current : fishBuildingPreset));
          setEnclosureForm((current) => (current.name ? current : fishEnclosurePreset));
        }
      })
      .catch(() => setFarmName(`Ferme ${farmId}`));

    refresh(farmId, session.token).catch(() => {
      setBuildings([]);
      setEnclosures([]);
    });
  }, [farmId, session?.token]);

  const saturatedCount = useMemo(
    () =>
      buildings.filter((item) => item.status === 'SATURATED').length +
      enclosures.filter((item) => item.status === 'SATURATED').length,
    [buildings, enclosures]
  );

  function submitBuilding(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const payload = {
          ...buildingForm,
          capacity: buildingForm.capacity || undefined,
          assignedTo: buildingForm.assignedTo || undefined,
          conditionLabel: buildingForm.conditionLabel || undefined,
          notes: buildingForm.notes || undefined
        };

        if (editingBuildingId) {
          await updateFarmBuilding(farmId, editingBuildingId, payload, session.token);
        } else {
          await createFarmBuilding(farmId, payload, session.token);
        }

        resetBuildingForm();
        await refresh(farmId, session.token);
        pushToast({
          title: editingBuildingId ? 'Batiment mis a jour' : 'Batiment ajoute',
          description: editingBuildingId
            ? "L'infrastructure a ete modifiee avec succes."
            : 'La nouvelle infrastructure a ete creee avec succes.',
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

  function submitEnclosure(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const payload = {
          ...enclosureForm,
          capacity: enclosureForm.capacity || undefined,
          assignedTo: enclosureForm.assignedTo || undefined,
          conditionLabel: enclosureForm.conditionLabel || undefined,
          notes: enclosureForm.notes || undefined
        };

        if (editingEnclosureId) {
          await updateFarmEnclosure(farmId, editingEnclosureId, payload, session.token);
        } else {
          await createFarmEnclosure(farmId, payload, session.token);
        }

        resetEnclosureForm();
        await refresh(farmId, session.token);
        pushToast({
          title: editingEnclosureId ? 'Enclos mis a jour' : 'Enclos ajoute',
          description: editingEnclosureId
            ? 'La zone ouverte a ete modifiee avec succes.'
            : 'La nouvelle zone ouverte a ete enregistree avec succes.',
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

  function resetBuildingForm() {
    setEditingBuildingId(null);
    setBuildingForm(isFishFarm ? fishBuildingPreset : defaultBuildingForm);
  }

  function resetEnclosureForm() {
    setEditingEnclosureId(null);
    setEnclosureForm(isFishFarm ? fishEnclosurePreset : defaultEnclosureForm);
  }

  function startBuildingEdition(building: BuildingView) {
    setEditingBuildingId(building.id);
    setBuildingForm({
      name: building.name,
      buildingType: building.buildingType,
      capacity: building.capacity ?? 0,
      assignedTo: building.assignedTo ?? '',
      conditionLabel: building.conditionLabel ?? '',
      status: building.status,
      notes: building.notes ?? ''
    });
  }

  function startEnclosureEdition(enclosure: EnclosureView) {
    setEditingEnclosureId(enclosure.id);
    setEnclosureForm({
      name: enclosure.name,
      enclosureType: enclosure.enclosureType,
      capacity: enclosure.capacity ?? 0,
      assignedTo: enclosure.assignedTo ?? '',
      conditionLabel: enclosure.conditionLabel ?? '',
      status: enclosure.status,
      notes: enclosure.notes ?? ''
    });
  }

  function handleDeleteBuilding(buildingId: string) {
    if (!session?.token || !window.confirm('Supprimer ce batiment ?')) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await deleteFarmBuilding(farmId, buildingId, session.token);
        if (editingBuildingId === buildingId) {
          resetBuildingForm();
        }
        await refresh(farmId, session.token);
        pushToast({
          title: 'Batiment supprime',
          description: "L'infrastructure a ete retiree de la ferme.",
          variant: 'success'
        });
      } catch (submissionError) {
        const message =
          submissionError instanceof Error ? submissionError.message : 'Suppression impossible';
        setError(message);
        pushToast({
          title: 'Suppression impossible',
          description: message,
          variant: 'error'
        });
      }
    });
  }

  function handleDeleteEnclosure(enclosureId: string) {
    if (!session?.token || !window.confirm("Supprimer cet enclos ?")) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await deleteFarmEnclosure(farmId, enclosureId, session.token);
        if (editingEnclosureId === enclosureId) {
          resetEnclosureForm();
        }
        await refresh(farmId, session.token);
        pushToast({
          title: 'Enclos supprime',
          description: 'La zone ouverte a ete retiree de la ferme.',
          variant: 'success'
        });
      } catch (submissionError) {
        const message =
          submissionError instanceof Error ? submissionError.message : 'Suppression impossible';
        setError(message);
        pushToast({
          title: 'Suppression impossible',
          description: message,
          variant: 'error'
        });
      }
    });
  }

  return (
    <AppShell title={`Infrastructures - ${farmName}`}>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="module-hero-grid facilities-hero-grid">
        <article className="module-hero-card facilities-hero-card">
          <div className="module-hero-top">
            <div>
              <p className="eyebrow">Patrimoine d'exploitation</p>
              <h2 className="module-hero-title">{farmName}</h2>
            </div>
            <Badge variant={stats.maintenanceCount > 0 ? 'warning' : 'success'}>
              {stats.operationalCount} element(s) operationnel(s)
            </Badge>
          </div>
          <p className="hero-copy module-hero-copy">
            {isFishFarm
              ? 'Un cockpit plus clair pour suivre les bassins, zones ouvertes, capacites et besoins de maintenance sans perdre la lecture terrain.'
              : 'Un cockpit plus clair pour suivre les batiments, les enclos, les capacites et les besoins de maintenance sans perdre la lecture terrain.'}
          </p>
          <div className="module-pill-row">
            <span className="module-detail-chip">
              <Building2 className="h-4 w-4" />
              {stats.totalBuildings} unite(s) baties
            </span>
            <span className="module-detail-chip">
              <Fence className="h-4 w-4" />
              {stats.totalEnclosures} zone(s) ouvertes
            </span>
            <span className="module-detail-chip">
              <ShieldCheck className="h-4 w-4" />
              {stats.totalCapacity} capacite cumulee
            </span>
          </div>
          <div className="module-kpi-grid">
            <article className="module-kpi-card">
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <Building2 className="h-5 w-5" />
                </div>
                <Badge variant="info">Batiments</Badge>
              </div>
              <strong>{stats.totalBuildings}</strong>
              <span>
                {isFishFarm
                  ? 'bassins, hangars techniques et magasins de support'
                  : 'poulaillers, etables, hangars, magasins et bassins batis'}
              </span>
            </article>
            <article className="module-kpi-card">
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <Wrench className="h-5 w-5" />
                </div>
                <Badge variant={stats.maintenanceCount > 0 ? 'warning' : 'success'}>Maintenance</Badge>
              </div>
              <strong>{stats.maintenanceCount}</strong>
              <span>element(s) demandant une intervention ou une surveillance</span>
            </article>
            <article className="module-kpi-card">
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <Fence className="h-5 w-5" />
                </div>
                <Badge variant={saturatedCount > 0 ? 'critical' : 'info'}>Saturation</Badge>
              </div>
              <strong>{saturatedCount}</strong>
              <span>zone(s) proches ou au maximum de leur capacite</span>
            </article>
          </div>
        </article>

        <article className="module-spotlight-card facilities-spotlight-card">
          <div className="module-card-top">
            <p className="eyebrow">Vue parc</p>
            <Badge variant="neutral">{isFishFarm ? 'Pisciculture' : 'Exploitation'}</Badge>
          </div>
          <h2>Base solide pour l'affectation</h2>
          <p>
            {isFishFarm
              ? "Chaque bassin et zone ouverte conserve son type, sa capacite, son affectation et son etat pour aider les decisions d'empoissonnement, de rotation et de maintenance."
              : "Chaque structure conserve son type, sa capacite, son affectation et son etat pour aider les decisions d'installation, de rotation et de maintenance."}
          </p>
          <div className="module-detail-list">
            <span>
              {isFishFarm
                ? 'Bassins couverts et ouverts sur une meme logique de gestion'
                : 'Batiments et enclos sur une meme logique de gestion'}
            </span>
            <span>Lecture immediate des actifs critiques ou satures</span>
            <span>PrÃªt pour la suite elevage et stocks</span>
          </div>
        </article>
      </section>

      <section className="module-flow-strip">
        {facilityWorkflowSteps.map((step, index) => {
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

      <section className="module-action-grid facilities-action-grid">
        <article className="module-form-card facilities-form-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">
                {editingBuildingId
                  ? isFishFarm
                    ? 'Edition bassin ferme'
                    : 'Edition batiment'
                  : isFishFarm
                    ? 'Nouveau bassin ferme'
                    : 'Nouveau batiment'}
              </p>
              <h2>{isFishFarm ? 'Structurer les unites aquacoles' : 'Structurer les installations'}</h2>
            </div>
            <div className="farm-module-icon">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <form className="stack-form" onSubmit={submitBuilding}>
            <div className="field-grid">
              <label className="field">
                <span>Nom</span>
                <input value={buildingForm.name} onChange={(event) => setBuildingForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="field">
                <span>Type</span>
                <select value={buildingForm.buildingType} onChange={(event) => setBuildingForm((current) => ({ ...current, buildingType: event.target.value as BuildingView['buildingType'] }))}>
                  <option value="POULAILLER">Poulailler</option>
                  <option value="ETABLE">Etable</option>
                  <option value="BERGERIE">Bergerie</option>
                  <option value="PORCHERIE">Porcherie</option>
                  <option value="BASSIN">Bassin</option>
                  <option value="HANGAR">Hangar</option>
                  <option value="MAGASIN">Magasin</option>
                </select>
              </label>
              <label className="field">
                <span>Capacite</span>
                <input type="number" value={buildingForm.capacity} onChange={(event) => setBuildingForm((current) => ({ ...current, capacity: Number(event.target.value) }))} />
              </label>
              <label className="field">
                <span>Affectation</span>
                <input value={buildingForm.assignedTo} onChange={(event) => setBuildingForm((current) => ({ ...current, assignedTo: event.target.value }))} />
              </label>
              <label className="field">
                <span>Etat</span>
                <input value={buildingForm.conditionLabel} onChange={(event) => setBuildingForm((current) => ({ ...current, conditionLabel: event.target.value }))} />
              </label>
              <label className="field">
                <span>Statut</span>
                <select value={buildingForm.status} onChange={(event) => setBuildingForm((current) => ({ ...current, status: event.target.value as BuildingView['status'] }))}>
                  <option value="OPERATIONNEL">Operationnel</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="INACTIF">Inactif</option>
                  <option value="SATURATED">Sature</option>
                </select>
              </label>
              <label className="field">
                <span>Notes</span>
                <input value={buildingForm.notes} onChange={(event) => setBuildingForm((current) => ({ ...current, notes: event.target.value }))} />
              </label>
            </div>
            <div className="module-inline-note">
              <span>
                {isFishFarm
                  ? "Ideal pour suivre l'usage, la qualite d'accueil et la capacite de chaque bassin."
                  : "Ideal pour suivre l'usage, l'etat et la capacite de chaque infrastructure."}
              </span>
              {session?.user.role === 'ADMIN' ? (
                <div className="dashboard-inline-actions">
                  {editingBuildingId ? (
                    <Button className="facilities-action-button" variant="ghost" type="button" disabled={isPending} onClick={resetBuildingForm}>
                      Annuler
                    </Button>
                  ) : null}
                  <Button className="module-submit-button facilities-action-button" type="submit" disabled={isPending}>
                    {editingBuildingId ? 'Mettre a jour' : 'Ajouter le batiment'}
                  </Button>
                </div>
              ) : (
                <Badge variant="warning">Lecture seule</Badge>
              )}
            </div>
          </form>
        </article>

        <article className="module-form-card facilities-form-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">
                {editingEnclosureId
                  ? isFishFarm
                    ? 'Edition bassin ouvert'
                    : 'Edition enclos'
                  : isFishFarm
                    ? 'Nouveau bassin ouvert'
                    : 'Nouvel enclos'}
              </p>
              <h2>{isFishFarm ? 'Organiser les zones d eau' : 'Organiser les zones ouvertes'}</h2>
            </div>
            <div className="farm-module-icon">
              <Fence className="h-5 w-5" />
            </div>
          </div>
          <form className="stack-form" onSubmit={submitEnclosure}>
            <div className="field-grid">
              <label className="field">
                <span>Nom</span>
                <input value={enclosureForm.name} onChange={(event) => setEnclosureForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="field">
                <span>Type</span>
                <select value={enclosureForm.enclosureType} onChange={(event) => setEnclosureForm((current) => ({ ...current, enclosureType: event.target.value as EnclosureView['enclosureType'] }))}>
                  <option value="ENCLOS_GENERIC">Enclos</option>
                  <option value="PATURAGE">Paturage</option>
                  <option value="PARC_ISOLE">Parc isole</option>
                  <option value="BASSIN_OUVERT">Bassin ouvert</option>
                </select>
              </label>
              <label className="field">
                <span>Capacite</span>
                <input type="number" value={enclosureForm.capacity} onChange={(event) => setEnclosureForm((current) => ({ ...current, capacity: Number(event.target.value) }))} />
              </label>
              <label className="field">
                <span>Affectation</span>
                <input value={enclosureForm.assignedTo} onChange={(event) => setEnclosureForm((current) => ({ ...current, assignedTo: event.target.value }))} />
              </label>
              <label className="field">
                <span>Etat</span>
                <input value={enclosureForm.conditionLabel} onChange={(event) => setEnclosureForm((current) => ({ ...current, conditionLabel: event.target.value }))} />
              </label>
              <label className="field">
                <span>Statut</span>
                <select value={enclosureForm.status} onChange={(event) => setEnclosureForm((current) => ({ ...current, status: event.target.value as EnclosureView['status'] }))}>
                  <option value="OPERATIONNEL">Operationnel</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="INACTIF">Inactif</option>
                  <option value="SATURATED">Sature</option>
                </select>
              </label>
              <label className="field">
                <span>Notes</span>
                <input value={enclosureForm.notes} onChange={(event) => setEnclosureForm((current) => ({ ...current, notes: event.target.value }))} />
              </label>
            </div>
            <div className="module-inline-note">
              <span>
                {isFishFarm
                  ? 'Les bassins ouverts gardent le meme niveau de suivi que les installations fermees.'
                  : 'Les enclos, paturages et bassins gardent le meme niveau de suivi que les batiments.'}
              </span>
              {session?.user.role === 'ADMIN' ? (
                <div className="dashboard-inline-actions">
                  {editingEnclosureId ? (
                    <Button className="facilities-action-button" variant="ghost" type="button" disabled={isPending} onClick={resetEnclosureForm}>
                      Annuler
                    </Button>
                  ) : null}
                  <Button className="module-submit-button facilities-action-button" variant="secondary" type="submit" disabled={isPending}>
                    {editingEnclosureId ? "Mettre a jour" : "Ajouter l'enclos"}
                  </Button>
                </div>
              ) : (
                <Badge variant="warning">Lecture seule</Badge>
              )}
            </div>
          </form>
        </article>
      </section>

      <section className="module-split-grid">
        <article className="module-list-card facilities-list-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Batiments</p>
              <h2>Vue cartes</h2>
            </div>
            <div className="farm-module-icon">
              <Wrench className="h-5 w-5" />
            </div>
          </div>
          <div className="module-catalog-grid">
            {buildings.length ? (
              buildings.map((building, index) => (
                <motion.article
                  key={building.id}
                  className="module-catalog-card facilities-catalog-card"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <div className="module-card-top">
                    <p className="eyebrow">{building.buildingType}</p>
                    <Badge variant={facilityBadge(building.status)}>{building.status}</Badge>
                  </div>
                  <h2>{building.name}</h2>
                  <div className="module-detail-list">
                    <span>Capacite: {building.capacity ?? 0}</span>
                    <span>Affectation: {building.assignedTo || 'Libre'}</span>
                    <span>Etat: {building.conditionLabel || 'NC'}</span>
                    <span>{building.notes || 'Aucune note infrastructure'}</span>
                  </div>
                  {session?.user.role === 'ADMIN' ? (
                    <div className="dashboard-inline-actions">
                      <Button
                        className="facilities-action-button"
                        type="button"
                        variant="secondary"
                        disabled={isPending}
                        onClick={() => startBuildingEdition(building)}
                      >
                        Modifier
                      </Button>
                      <Button
                        className="facilities-action-button"
                        type="button"
                        variant="danger"
                        disabled={isPending}
                        onClick={() => handleDeleteBuilding(building.id)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  ) : null}
                </motion.article>
              ))
            ) : (
              <article className="module-catalog-card facilities-catalog-card module-empty-card">
                <div>
                  <p className="eyebrow">Demarrage</p>
                  <h2>Aucun batiment enregistre</h2>
                  <p>Ajoute une premiere infrastructure batie pour suivre les capacites et affectations.</p>
                </div>
              </article>
            )}
          </div>
        </article>

        <article className="module-list-card facilities-list-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Enclos</p>
              <h2>Vue cartes</h2>
            </div>
            <div className="farm-module-icon">
              <Fence className="h-5 w-5" />
            </div>
          </div>
          <div className="module-catalog-grid">
            {enclosures.length ? (
              enclosures.map((enclosure, index) => (
                <motion.article
                  key={enclosure.id}
                  className="module-catalog-card facilities-catalog-card"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <div className="module-card-top">
                    <p className="eyebrow">{enclosure.enclosureType}</p>
                    <Badge variant={facilityBadge(enclosure.status)}>{enclosure.status}</Badge>
                  </div>
                  <h2>{enclosure.name}</h2>
                  <div className="module-detail-list">
                    <span>Capacite: {enclosure.capacity ?? 0}</span>
                    <span>Affectation: {enclosure.assignedTo || 'Libre'}</span>
                    <span>Etat: {enclosure.conditionLabel || 'NC'}</span>
                    <span>{enclosure.notes || 'Aucune note zone ouverte'}</span>
                  </div>
                  {session?.user.role === 'ADMIN' ? (
                    <div className="dashboard-inline-actions">
                      <Button
                        className="facilities-action-button"
                        type="button"
                        variant="secondary"
                        disabled={isPending}
                        onClick={() => startEnclosureEdition(enclosure)}
                      >
                        Modifier
                      </Button>
                      <Button
                        className="facilities-action-button"
                        type="button"
                        variant="danger"
                        disabled={isPending}
                        onClick={() => handleDeleteEnclosure(enclosure.id)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  ) : null}
                </motion.article>
              ))
            ) : (
              <article className="module-catalog-card facilities-catalog-card module-empty-card">
                <div>
                  <p className="eyebrow">Demarrage</p>
                  <h2>Aucun enclos enregistre</h2>
                  <p>Ajoute un premier enclos pour piloter les espaces ouverts et bassins.</p>
                </div>
              </article>
            )}
          </div>
        </article>
      </section>
    </AppShell>
  );
}

