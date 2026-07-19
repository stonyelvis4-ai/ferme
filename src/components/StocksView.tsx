/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { AlertTriangle, History, Lock, Package, Plus, RefreshCw, ShoppingBag } from 'lucide-react';
import {
  Building,
  Campaign,
  CultureParcelle,
  FishBassin,
  Lot,
  StockArticle,
  StockArticleInput,
  StockCategoryOption,
  StockMovement,
  StockRelationOption,
  SupplierOption,
  UserRole,
} from '../types';
import AdminEntityActions from './AdminEntityActions';
import FormDialog from './FormDialog';

interface StocksViewProps {
  role: UserRole;
  articles: StockArticle[];
  movements: StockMovement[];
  currency: string;
  categories: StockCategoryOption[];
  suppliers: SupplierOption[];
  relationOptions: StockRelationOption[];
  unitOptions: string[];
  storageLocations: string[];
  lots: Lot[];
  bassins: FishBassin[];
  parcelles: CultureParcelle[];
  campaigns: Campaign[];
  buildings: Building[];
  onAdjustStock: (articleId: string, quantityToAdd: number, reason: string) => void;
  onGeneratePurchaseTask: (article: StockArticle) => void;
  onAddSupplier: (payload: { name: string; contactName?: string; phone?: string; email?: string }) => Promise<SupplierOption | null>;
  onAddStockArticle: (data: StockArticleInput) => void;
  onUpdateStockArticle: (articleId: string, updates: Partial<StockArticle>) => void;
  onDeleteStockArticle: (articleId: string) => void;
}

const BUSINESS_MODULE_OPTIONS: Array<{ value: NonNullable<StockArticle['businessModule']>; label: string }> = [
  { value: 'general', label: 'Usage général' },
  { value: 'livestock', label: 'Élevage' },
  { value: 'aquaculture', label: 'Pisciculture' },
  { value: 'crops', label: 'Cultures' },
  { value: 'infrastructure', label: 'Infrastructure' },
];

const PERISHABLE_CATEGORY_SLUGS = ['medicine', 'vaccine', 'veterinary', 'feed'];
const DEFAULT_STOCK_CATEGORIES: StockCategoryOption[] = [
  { id: 'default-feed', name: 'Aliment', slug: 'feed', isActive: true },
  { id: 'default-medicine', name: 'Medicament', slug: 'medicine', isActive: true },
  { id: 'default-vaccine', name: 'Vaccin', slug: 'vaccine', isActive: true },
  { id: 'default-seed', name: 'Semence', slug: 'seed', isActive: true },
  { id: 'default-fertilizer', name: 'Engrais', slug: 'fertilizer', isActive: true },
  { id: 'default-phytosanitary', name: 'Produit phytosanitaire', slug: 'phytosanitary', isActive: true },
  { id: 'default-veterinary', name: 'Produit veterinaire', slug: 'veterinary', isActive: true },
  { id: 'default-material', name: 'Materiel', slug: 'material', isActive: true },
  { id: 'default-equipment', name: 'Equipement', slug: 'equipment', isActive: true },
  { id: 'default-tool', name: 'Outil', slug: 'tool', isActive: true },
  { id: 'default-fuel', name: 'Carburant', slug: 'fuel', isActive: true },
  { id: 'default-packaging', name: 'Emballage', slug: 'packaging', isActive: true },
  { id: 'default-cleaning', name: "Produit d'entretien", slug: 'cleaning', isActive: true },
  { id: 'default-spare-part', name: 'Piece de rechange', slug: 'spare-part', isActive: true },
  { id: 'default-other', name: 'Autre', slug: 'other', isActive: true },
];
const DEFAULT_UNITS = ['kg', 'g', 'tonne', 'litre', 'millilitre', 'sac', 'boite', 'bouteille', 'bidon', 'dose', 'comprime', 'flacon', 'unite', 'piece', 'paquet', 'rouleau', 'metre', 'metre carre', 'hectare'];
const DEFAULT_STORAGE_LOCATIONS = ['Magasin principal', 'Depot', 'Pharmacie', 'Chambre froide', 'Entrepot aliments'];

export default function StocksView({
  role,
  articles,
  movements,
  currency,
  categories,
  suppliers,
  relationOptions,
  unitOptions,
  storageLocations,
  lots,
  bassins,
  parcelles,
  campaigns,
  buildings,
  onAdjustStock,
  onGeneratePurchaseTask,
  onAddSupplier,
  onAddStockArticle,
  onUpdateStockArticle,
  onDeleteStockArticle,
}: StocksViewProps) {
  const effectiveCategories = useMemo(() => {
    if (categories.length > 0) return categories;

    const articleCategories = articles
      .map((article) => ({
        id: `article-category-${article.categoryId || article.category || article.id}`,
        name: article.categoryLabel || article.category || 'Autre',
        slug: article.category || 'other',
        isActive: true,
      }))
      .filter((item, index, list) => list.findIndex((candidate) => candidate.slug === item.slug) === index);

    return articleCategories.length > 0 ? articleCategories : DEFAULT_STOCK_CATEGORIES;
  }, [articles, categories]);

  const effectiveSuppliers = useMemo(() => {
    if (suppliers.length > 0) return suppliers;

    return articles
      .filter((article) => article.supplierName)
      .map((article) => ({
        id: article.supplierId || `article-supplier-${article.id}`,
        name: article.supplierName || 'Fournisseur',
        contactName: '',
        phone: '',
        email: '',
        isActive: true,
      }))
      .filter((item, index, list) => list.findIndex((candidate) => candidate.name === item.name) === index);
  }, [articles, suppliers]);

  const effectiveUnitOptions = useMemo(() => {
    const source = unitOptions.length > 0 ? unitOptions : [...articles.map((article) => article.unit), ...DEFAULT_UNITS];
    return source.filter((item, index, list) => item && list.indexOf(item) === index);
  }, [articles, unitOptions]);

  const effectiveStorageLocations = useMemo(() => {
    const source = storageLocations.length > 0
      ? storageLocations
      : [
          ...articles.map((article) => article.storageLocation || article.locationId),
          ...buildings.filter((building) => building.type === 'magasin').map((building) => building.name),
          ...DEFAULT_STORAGE_LOCATIONS,
        ];
    return source.filter((item, index, list) => item && list.indexOf(item) === index);
  }, [articles, buildings, storageLocations]);

  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);
  const [adjustQty, setAdjustQty] = useState(100);
  const [adjustReason, setAdjustReason] = useState('Approvisionnement periodique');
  const [supplierDraft, setSupplierDraft] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
  });
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [editArticleName, setEditArticleName] = useState('');
  const [editArticleUnitCost, setEditArticleUnitCost] = useState('0');
  const [form, setForm] = useState<StockArticleInput>({
    name: '',
    reference: '',
    description: '',
    brand: '',
    category: categories[0]?.slug ?? DEFAULT_STOCK_CATEGORIES[0].slug,
    categoryId: categories[0]?.id ?? DEFAULT_STOCK_CATEGORIES[0].id,
    supplierId: '',
    batchNumber: '',
    purchaseDate: '',
    manufacturingDate: '',
    expirationDate: '',
    quantity: 0,
    unit: unitOptions[0] ?? DEFAULT_UNITS[0],
    minThreshold: 10,
    minimumStock: 10,
    maximumStock: undefined,
    locationId: storageLocations[0] ?? DEFAULT_STORAGE_LOCATIONS[0],
    storageLocation: storageLocations[0] ?? DEFAULT_STORAGE_LOCATIONS[0],
    unitCost: 0,
    totalPurchasePrice: 0,
    currency: 'XOF',
    notes: '',
    isActive: true,
    businessModule: 'general',
    relatedType: '',
    relatedId: '',
    imageUrl: '',
    imageFile: null,
  });

  const selectedCategory = useMemo(
    () => effectiveCategories.find((item) => item.id === form.categoryId) ?? effectiveCategories.find((item) => item.slug === form.category),
    [effectiveCategories, form.category, form.categoryId]
  );
  const selectedSupplier = useMemo(
    () => effectiveSuppliers.find((item) => item.id === form.supplierId),
    [effectiveSuppliers, form.supplierId]
  );

  const availableRelations = useMemo(
    () => relationOptions.filter((item) => item.businessModule === (form.businessModule ?? 'general')),
    [relationOptions, form.businessModule]
  );
  const selectedRelation = useMemo(
    () => availableRelations.find((item) => item.type === form.relatedType && item.id === form.relatedId),
    [availableRelations, form.relatedId, form.relatedType]
  );

  const requiresExpirationDate = PERISHABLE_CATEGORY_SLUGS.includes(selectedCategory?.slug ?? form.category);
  const totalPurchasePrice = Number(((form.quantity || 0) * (form.unitCost || 0)).toFixed(2));
  const generatedReferencePreview = useMemo(() => {
    if (form.reference?.trim()) return form.reference.trim().toUpperCase();
    const prefix = (selectedCategory?.slug ?? form.category ?? 'ART').replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'ART';
    return `${prefix}-AUTO`;
  }, [form.category, form.reference, selectedCategory?.slug]);

  const formatCurrency = (value: number) =>
    `${new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)} ${currency}`;

  const resetForm = () => {
    setForm({
      name: '',
      reference: '',
      description: '',
      brand: '',
      category: effectiveCategories[0]?.slug ?? DEFAULT_STOCK_CATEGORIES[0].slug,
      categoryId: effectiveCategories[0]?.id ?? DEFAULT_STOCK_CATEGORIES[0].id,
      supplierId: '',
      batchNumber: '',
      purchaseDate: '',
      manufacturingDate: '',
      expirationDate: '',
      quantity: 0,
      unit: effectiveUnitOptions[0] ?? DEFAULT_UNITS[0],
      minThreshold: 10,
      minimumStock: 10,
      maximumStock: undefined,
      locationId: effectiveStorageLocations[0] ?? DEFAULT_STORAGE_LOCATIONS[0],
      storageLocation: effectiveStorageLocations[0] ?? DEFAULT_STORAGE_LOCATIONS[0],
      unitCost: 0,
      totalPurchasePrice: 0,
      currency: 'XOF',
      notes: '',
      isActive: true,
      businessModule: 'general',
      relatedType: '',
      relatedId: '',
      imageUrl: '',
      imageFile: null,
    });
  };

  const handleAdjustSubmit = (articleId: string) => {
    if (adjustQty === 0 || !adjustReason) return;
    onAdjustStock(articleId, adjustQty, adjustReason);
    setActiveArticleId(null);
    setAdjustQty(100);
    setAdjustReason('Approvisionnement periodique');
  };

  const handleCreateArticle = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    onAddStockArticle({
      ...form,
      totalPurchasePrice,
      minThreshold: form.minimumStock ?? form.minThreshold ?? 0,
      minimumStock: form.minimumStock ?? form.minThreshold ?? 0,
      locationId: form.storageLocation ?? form.locationId,
      storageLocation: form.storageLocation ?? form.locationId,
      currency: form.currency || 'XOF',
    });

    resetForm();
    setShowCreateForm(false);
  };

  const resetSupplierDraft = () => {
    setSupplierDraft({
      name: '',
      contactName: '',
      phone: '',
      email: '',
    });
  };

  const openSupplierForm = () => {
    resetSupplierDraft();
    setShowSupplierForm(true);
  };

  const handleSupplierSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supplierDraft.name.trim() || isSavingSupplier) return;

    setIsSavingSupplier(true);
    try {
      const supplier = await onAddSupplier({
        name: supplierDraft.name.trim(),
        contactName: supplierDraft.contactName.trim(),
        phone: supplierDraft.phone.trim(),
        email: supplierDraft.email.trim(),
      });

      if (supplier) {
        setForm((prev) => ({ ...prev, supplierId: supplier.id }));
        setShowSupplierForm(false);
        resetSupplierDraft();
      }
    } finally {
      setIsSavingSupplier(false);
    }
  };

  const linkedEntityCount = lots.length + bassins.length + parcelles.length + campaigns.length + buildings.length;

  const handleSubmitArticleEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingArticleId || !editArticleName.trim()) return;

    onUpdateStockArticle(editingArticleId, {
      name: editArticleName.trim(),
      unitCost: Number(editArticleUnitCost) || 0,
    });

    setEditingArticleId(null);
    setEditArticleName('');
    setEditArticleUnitCost('0');
  };

  return (
    <div id="stocks-view" className="space-y-6">
      <FormDialog
        open={editingArticleId !== null}
        title="Modifier l'article"
        subtitle="Ajustez le libelle et le prix unitaire directement dans l interface."
        confirmLabel="Enregistrer"
        confirmDisabled={!editArticleName.trim()}
        onCancel={() => {
          setEditingArticleId(null);
          setEditArticleName('');
          setEditArticleUnitCost('0');
        }}
        onSubmit={handleSubmitArticleEdit}
      >
        <div className="grid grid-cols-1 gap-4">
          <label className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Nom de l'article</span>
            <input
              autoFocus
              value={editArticleName}
              onChange={(e) => setEditArticleName(e.target.value)}
              placeholder="Ex. Aliment croissance"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <label className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Prix unitaire ({currency})</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={editArticleUnitCost}
              onChange={(e) => setEditArticleUnitCost(e.target.value)}
              placeholder={`Ex. 15000 ${currency}`}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        </div>
      </FormDialog>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            Module Gestion des Stocks & Intrants
          </h2>
          <p className="text-xs text-slate-500">Traçabilité des intrants, coûts, péremptions, emplacements et usages métier.</p>
        </div>
        {role === 'admin' ? (
          <button type="button" onClick={() => setShowCreateForm((prev) => !prev)} className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> Creer un article
          </button>
        ) : (
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full shadow-sm">
            <Lock className="w-3 h-3" /> Lecture seule (proprietaire)
          </span>
        )}
      </div>

      {showCreateForm && role === 'admin' && (
        <form onSubmit={handleCreateArticle} className="bg-white border border-emerald-100 p-5 rounded-2xl shadow-sm space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Reference preview</span>
              <span className="mt-1 block text-sm font-semibold text-emerald-900">{generatedReferencePreview}</span>
              <p className="mt-1 text-[11px] text-emerald-800">La référence sera unique dans la ferme.</p>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Traçabilité</span>
              <span className="mt-1 block text-sm font-semibold text-emerald-900">{selectedRelation?.label || 'Usage général'}</span>
              <p className="mt-1 text-[11px] text-emerald-800">Module: {BUSINESS_MODULE_OPTIONS.find((item) => item.value === (form.businessModule ?? 'general'))?.label}</p>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Impact financier</span>
              <span className="mt-1 block text-sm font-semibold text-emerald-900">{formatCurrency(totalPurchasePrice)}</span>
              <p className="mt-1 text-[11px] text-emerald-800">Montant initial qui remontera en comptabilité.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <label className="space-y-1.5 xl:col-span-2">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Nom de l'article</span>
              <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Ex. Aliment pondeuses croissance" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <span className="block text-[10px] text-slate-500">Nom commercial ou technique exact de l’intrant.</span>
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Référence</span>
              <input value={form.reference ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value.toUpperCase() }))} placeholder="ALI-PON-001" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <span className="block text-[10px] text-slate-500">Laisser vide pour une génération automatique par ferme.</span>
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Marque</span>
              <input value={form.brand ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))} placeholder="Ex. Sanders" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <span className="block text-[10px] text-slate-500">Permet de distinguer deux produits proches.</span>
            </label>

            <label className="space-y-1.5 xl:col-span-2">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Catégorie</span>
              <select
                value={form.categoryId || ''}
                onChange={(e) => {
                  const category = effectiveCategories.find((item) => item.id === e.target.value);
                  setForm((prev) => ({
                    ...prev,
                    categoryId: e.target.value,
                    category: category?.slug ?? prev.category,
                  }));
                }}
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                {effectiveCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              <span className="block text-[10px] text-slate-500">Catégorie configurable du stock utilisée dans les rapports et la finance.</span>
            </label>

            <label className="space-y-1.5 xl:col-span-2">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Fournisseur</span>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select value={form.supplierId ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, supplierId: e.target.value }))} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100">
                  <option value="">Aucun fournisseur</option>
                  {effectiveSuppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
                <button type="button" onClick={openSupplierForm} className="shrink-0 rounded-xl border border-emerald-600 px-3 py-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 sm:py-0">
                  Ajouter
                </button>
              </div>
              <span className="block text-[10px] text-slate-500">Sélectionnez un fournisseur existant pour éviter les doublons.</span>
              {selectedSupplier ? (
                <span className="block text-[10px] text-emerald-700">Contact: {selectedSupplier.contactName || 'non renseigné'}{selectedSupplier.phone ? ` - ${selectedSupplier.phone}` : ''}</span>
              ) : null}
            </label>

            <label className="space-y-1.5 xl:col-span-4">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Description</span>
              <textarea value={form.description ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={3} placeholder="Composition, usage, dosage, conditionnement..." className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <span className="block text-[10px] text-slate-500">Aide les équipes à reconnaître l’article sans ambiguïté.</span>
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Quantité initiale</span>
              <input type="number" min={0} step="0.001" value={form.quantity} onChange={(e) => setForm((prev) => ({ ...prev, quantity: Number(e.target.value) }))} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <span className="block text-[10px] text-slate-500">Quantité achetée ou disponible à l’entrée en stock.</span>
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Unité</span>
              <select value={form.unit} onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100">
                {effectiveUnitOptions.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
              <span className="block text-[10px] text-slate-500">Unité de suivi compatible avec l’activité agricole.</span>
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Prix unitaire</span>
              <input type="number" min={0} step="0.01" value={form.unitCost ?? 0} onChange={(e) => setForm((prev) => ({ ...prev, unitCost: Number(e.target.value) }))} placeholder={`Ex. 12500 ${currency}`} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <span className="block text-[10px] text-slate-500">Prix d’achat d’une unité. Sert aussi à la comptabilité.</span>
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Prix total d'achat</span>
              <input value={formatCurrency(totalPurchasePrice)} readOnly className="w-full border border-emerald-200 bg-emerald-50 rounded-xl p-3 text-sm font-semibold text-emerald-800 focus:outline-none" />
              <span className="block text-[10px] text-slate-500">Calcul instantané : quantité initiale × prix unitaire.</span>
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Stock minimum</span>
              <input type="number" min={0} step="0.001" value={form.minimumStock ?? form.minThreshold ?? 0} onChange={(e) => setForm((prev) => ({ ...prev, minimumStock: Number(e.target.value), minThreshold: Number(e.target.value) }))} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <span className="block text-[10px] text-slate-500">Seuil réel à partir duquel une alerte doit être générée.</span>
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Stock maximum</span>
              <input type="number" min={0} step="0.001" value={form.maximumStock ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, maximumStock: e.target.value ? Number(e.target.value) : undefined }))} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <span className="block text-[10px] text-slate-500">Capacité cible ou seuil de surstockage.</span>
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Emplacement</span>
              <select value={form.storageLocation ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, storageLocation: e.target.value, locationId: e.target.value }))} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100">
                {effectiveStorageLocations.map((location) => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
              <span className="block text-[10px] text-slate-500">Lieu physique de stockage de l’article dans la ferme.</span>
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Précision emplacement</span>
              <input value={form.storageLocation ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, storageLocation: e.target.value, locationId: e.target.value }))} placeholder="Ex. Rayonnage B / Pharmacie nord" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <span className="block text-[10px] text-slate-500">Permet d’affiner l’emplacement exact quand la liste ne suffit pas.</span>
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Numéro de lot</span>
              <input value={form.batchNumber ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, batchNumber: e.target.value }))} placeholder="Lot fournisseur / fabrication" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <span className="block text-[10px] text-slate-500">Essentiel pour la traçabilité sanitaire et les retraits.</span>
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Date d'achat</span>
              <input type="date" value={form.purchaseDate ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, purchaseDate: e.target.value }))} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <span className="block text-[10px] text-slate-500">Date prise en compte pour l’écriture d’achat et les rapports.</span>
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Date de fabrication</span>
              <input type="date" value={form.manufacturingDate ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, manufacturingDate: e.target.value }))} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <span className="block text-[10px] text-slate-500">Utile pour les médicaments, vaccins et produits conditionnés.</span>
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Date de péremption</span>
              <input type="date" value={form.expirationDate ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, expirationDate: e.target.value }))} required={requiresExpirationDate} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <span className="block text-[10px] text-slate-500">{requiresExpirationDate ? 'Requise pour cette catégorie périssable.' : 'Renseignez-la si le produit est périssable.'}</span>
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Devise</span>
              <input value={form.currency ?? 'XOF'} onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value || 'XOF' }))} placeholder="XOF" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <span className="block text-[10px] text-slate-500">Par défaut XOF. Affichage utilisateur : FCFA.</span>
            </label>

            <label className="space-y-1.5 xl:col-span-2">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Domaine concerné</span>
              <select value={form.businessModule ?? 'general'} onChange={(e) => setForm((prev) => ({ ...prev, businessModule: e.target.value as NonNullable<StockArticle['businessModule']>, relatedType: '', relatedId: '' }))} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100">
                {BUSINESS_MODULE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <span className="block text-[10px] text-slate-500">Permet de relier le stock à un module métier précis.</span>
            </label>

            <label className="space-y-1.5 xl:col-span-2">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Élément concerné</span>
              <select
                value={`${form.relatedType ?? ''}:${form.relatedId ?? ''}`}
                onChange={(e) => {
                  const [relatedType, relatedId] = e.target.value.split(':');
                  setForm((prev) => ({ ...prev, relatedType, relatedId }));
                }}
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <option value=":">Usage général</option>
                {availableRelations.map((relation) => (
                  <option key={`${relation.type}:${relation.id}`} value={`${relation.type}:${relation.id}`}>{relation.label}</option>
                ))}
              </select>
              <span className="block text-[10px] text-slate-500">La liste est filtrée sur les éléments de la ferme connectée ({linkedEntityCount} disponibles).</span>
              {selectedRelation ? (
                <span className="block text-[10px] text-emerald-700">Lien actif: {selectedRelation.label}</span>
              ) : null}
            </label>

            <label className="space-y-1.5 xl:col-span-2">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Photo de l'article</span>
              <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setForm((prev) => ({ ...prev, imageFile: e.target.files?.[0] ?? null }))} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-emerald-700" />
              <span className="block text-[10px] text-slate-500">Image sécurisée : jpg, jpeg, png ou webp, taille raisonnable.</span>
            </label>

            <label className="space-y-1.5 xl:col-span-2">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Notes</span>
              <textarea value={form.notes ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} rows={3} placeholder="Consignes de stockage, remarques d'inventaire, précautions..." className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <span className="block text-[10px] text-slate-500">Commentaires opérationnels pour l’équipe ou l’audit.</span>
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 xl:col-span-4">
              <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              <span className="text-sm text-slate-700">
                Article actif. Si désactivé, il n’apparaîtra plus dans les nouvelles opérations, mais son historique restera consultable.
              </span>
            </label>
          </div>

          <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => { setShowCreateForm(false); resetForm(); }} className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
              Annuler
            </button>
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:border-emerald-800 hover:bg-emerald-700">
              Creer l'article
            </button>
          </div>
        </form>
      )}

      {showSupplierForm ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-3 sm:items-center sm:p-6">
          <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-2xl shadow-slate-950/20">
            <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-lime-50 px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">Nouveau fournisseur</span>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">Ajouter un fournisseur proprement</h3>
                  <p className="mt-1 text-xs text-slate-500">Cette fiche sera reutilisable dans les stocks, la finance et la tracabilite des achats.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSupplierForm(false);
                    resetSupplierDraft();
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  Fermer
                </button>
              </div>
            </div>

            <form onSubmit={handleSupplierSubmit} className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Fournisseur</span>
                  <span className="mt-1 block text-sm font-semibold text-emerald-900">{supplierDraft.name || 'Nom en attente'}</span>
                  <p className="mt-1 text-[11px] text-emerald-800">Visible dans la liste des intrants.</p>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Contact</span>
                  <span className="mt-1 block text-sm font-semibold text-emerald-900">{supplierDraft.contactName || 'Contact optionnel'}</span>
                  <p className="mt-1 text-[11px] text-emerald-800">{supplierDraft.phone || supplierDraft.email || 'Telephone ou email non renseignes.'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Nom du fournisseur</span>
                  <input
                    autoFocus
                    value={supplierDraft.name}
                    onChange={(e) => setSupplierDraft((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex. Sanders Abidjan"
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    required
                  />
                  <span className="block text-[10px] text-slate-500">Nom commercial ou raison sociale qui apparaitra dans les achats.</span>
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Nom du contact</span>
                  <input
                    value={supplierDraft.contactName}
                    onChange={(e) => setSupplierDraft((prev) => ({ ...prev, contactName: e.target.value }))}
                    placeholder="Ex. M. Koffi"
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                  <span className="block text-[10px] text-slate-500">Interlocuteur principal pour les commandes.</span>
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Telephone</span>
                  <input
                    value={supplierDraft.phone}
                    onChange={(e) => setSupplierDraft((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="Ex. +225 07 00 00 00 00"
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                  <span className="block text-[10px] text-slate-500">Numero utile pour les relances et livraisons.</span>
                </label>

                <label className="space-y-1.5 sm:col-span-2">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Email</span>
                  <input
                    type="email"
                    value={supplierDraft.email}
                    onChange={(e) => setSupplierDraft((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Ex. commandes@sanders.ci"
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                  <span className="block text-[10px] text-slate-500">Adresse pratique pour les devis, factures et confirmations.</span>
                </label>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowSupplierForm(false);
                    resetSupplierDraft();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingSupplier || !supplierDraft.name.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:border-emerald-800 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none"
                >
                  {isSavingSupplier ? 'Enregistrement...' : 'Creer le fournisseur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <Package className="w-4 h-4 text-emerald-600" />
            Niveaux de stocks disponibles ({articles.length} articles)
          </h3>

          {articles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm font-semibold text-slate-700">Aucun article de stock enregistre.</p>
              <p className="mt-2 text-xs text-slate-500">Les intrants, medicaments, semences, equipements et consommables apparaitront ici apres creation.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {articles.map((article) => {
                const minimumStock = article.minimumStock ?? article.minThreshold ?? 0;
                const isLow = article.quantity <= minimumStock;
                const maxLevelBase = article.maximumStock && article.maximumStock > 0
                  ? article.maximumStock
                  : Math.max(minimumStock * 2.5, article.quantity || 1);
                const progressPct = Math.min((article.quantity / maxLevelBase) * 100, 100);
                const lastKnownUnitCost =
                  article.unitCost ??
                  movements
                    .slice()
                    .reverse()
                    .find((movement) => movement.articleId === article.id && typeof movement.unitCost === 'number')
                    ?.unitCost;

                return (
                  <div key={article.id} className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow transition-shadow ${isLow ? 'border-amber-200 bg-amber-50/10' : 'border-slate-100'}`}>
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{article.name}</h4>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <span className="text-[9px] font-semibold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded tracking-wider inline-block">
                              {article.categoryLabel || article.category}
                            </span>
                            {article.reference ? (
                              <span className="text-[9px] font-semibold text-emerald-700 uppercase bg-emerald-50 px-1.5 py-0.5 rounded tracking-wider inline-block">
                                {article.reference}
                              </span>
                            ) : null}
                            {article.isActive === false ? (
                              <span className="text-[9px] font-semibold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded tracking-wider inline-block">
                                Inactif
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${isLow ? 'text-amber-600' : 'text-slate-800'}`}>
                          {article.quantity} {article.unit}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                        {article.description ? (
                          <div className="col-span-2">
                            <span className="block text-[10px] uppercase tracking-wide text-slate-400">Description</span>
                            <span className="font-medium text-slate-700">{article.description}</span>
                          </div>
                        ) : null}
                        <div>
                          <span className="block text-[10px] uppercase tracking-wide text-slate-400">Prix unitaire</span>
                          <span className="font-semibold text-slate-700">{typeof lastKnownUnitCost === 'number' && lastKnownUnitCost > 0 ? formatCurrency(lastKnownUnitCost) : 'Non renseigne'}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase tracking-wide text-slate-400">Valeur totale</span>
                          <span className="font-semibold text-slate-700">{formatCurrency(article.totalPurchasePrice ?? ((article.quantity || 0) * (lastKnownUnitCost ?? 0)))}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase tracking-wide text-slate-400">Emplacement</span>
                          <span className="font-semibold text-slate-700">{article.storageLocation || article.locationId || 'Non renseigne'}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase tracking-wide text-slate-400">Fournisseur</span>
                          <span className="font-semibold text-slate-700">{article.supplierName || 'Non renseigne'}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase tracking-wide text-slate-400">Marque</span>
                          <span className="font-semibold text-slate-700">{article.brand || 'Non renseignee'}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase tracking-wide text-slate-400">Lot / péremption</span>
                          <span className="font-semibold text-slate-700">{article.batchNumber || article.expirationDate || 'Non renseigne'}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase tracking-wide text-slate-400">Module lié</span>
                          <span className="font-semibold text-slate-700">{BUSINESS_MODULE_OPTIONS.find((item) => item.value === (article.businessModule || 'general'))?.label || 'Usage général'}</span>
                        </div>
                      </div>

                      <div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isLow ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${progressPct}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
                          <span>Min requis : {minimumStock} {article.unit}</span>
                          {isLow ? (
                            <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3 animate-pulse" />
                              Stock faible
                            </span>
                          ) : (
                            <span>Max : {article.maximumStock ?? 'n/a'} {article.unit}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {role === 'admin' && (
                      <div className="mt-4 pt-3 border-t border-slate-50 flex flex-col gap-2">
                        {activeArticleId === article.id ? (
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-2 animate-fade-in">
                            <div className="flex gap-2">
                              <input type="number" value={adjustQty} onChange={(e) => setAdjustQty(Number(e.target.value))} className="w-1/2 p-1.5 border border-slate-200 rounded bg-white text-xs" />
                              <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className="w-1/2 p-1.5 border border-slate-200 rounded bg-white text-xs" />
                            </div>
                            <div className="flex justify-end gap-1.5">
                              <button type="button" onClick={() => setActiveArticleId(null)} className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3.5 py-2 text-[10px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">Annuler</button>
                              <button type="button" onClick={() => handleAdjustSubmit(article.id)} className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-3.5 py-2 text-[10px] font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:border-emerald-800 hover:bg-emerald-700">Confirmer</button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <button type="button" onClick={() => { setActiveArticleId(article.id); setAdjustQty(100); }} className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-[10px] font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:border-emerald-800 hover:bg-emerald-700">
                                <RefreshCw className="w-3 h-3" /> Ajuster
                              </button>
                              {isLow && (
                                <button type="button" onClick={() => onGeneratePurchaseTask(article)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-amber-700 bg-amber-600 px-4 py-2 text-[10px] font-semibold text-white shadow-lg shadow-amber-900/20 transition hover:-translate-y-0.5 hover:border-amber-800 hover:bg-amber-700">
                                  <ShoppingBag className="w-3 h-3" /> Commander
                                </button>
                              )}
                            </div>
                            <AdminEntityActions
                              compact
                              onEdit={() => {
                                setEditingArticleId(article.id);
                                setEditArticleName(article.name);
                                setEditArticleUnitCost(String(article.unitCost ?? lastKnownUnitCost ?? 0));
                              }}
                              onDelete={() => {
                                if (window.confirm(`Supprimer l'article ${article.name} ?`)) {
                                  onDeleteStockArticle(article.id);
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <History className="w-4 h-4 text-emerald-600" />
            Mouvements recents
          </h3>
          <p className="text-[11px] text-slate-400">Historique des entrées, sorties et ajustements de stock tracés pour la ferme.</p>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {movements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-400">
                Aucun mouvement de stock enregistre pour le moment.
              </div>
            ) : (
              movements.slice().reverse().map((movement) => {
                const article = articles.find((item) => item.id === movement.articleId);
                return (
                  <div key={movement.id} className="p-3 border-b border-slate-50 text-xs flex justify-between items-start">
                    <div>
                      <span className="font-semibold text-slate-800">{article?.name || 'Article inconnu'}</span>
                      <p className="text-[10px] text-slate-500 mt-0.5 italic">{movement.reason}</p>
                      <div className="flex gap-2 text-[9px] text-slate-400 mt-1 uppercase tracking-wide">
                        <span>Ref : {article?.reference || 'Stock'}</span>
                        <span>{movement.sourceModule || 'Stocks'}</span>
                        <span>{movement.date}</span>
                      </div>
                    </div>
                    <span className={`font-bold shrink-0 ${movement.type === 'in' ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {movement.type === 'in' ? '+' : '-'}{movement.quantity} {article?.unit}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
