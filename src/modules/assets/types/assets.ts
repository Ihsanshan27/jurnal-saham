export type AssetGroup = 'investment' | 'office_inventory';

export type AssetCategory =
  | 'gold'
  | 'deposit'
  | 'crypto'
  | 'real_estate'
  | 'receivable'
  | 'it_equipment'
  | 'vehicle'
  | 'furniture'
  | 'software_license'
  | 'other';

export type AssetStatus = 'active' | 'disposed' | 'maintenance' | 'matured';

export interface AssetItem {
  id: string;
  name: string;
  code: string; // e.g. AST-2026-001
  group: AssetGroup;
  category: AssetCategory;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  quantity: number;
  unit: string; // gram, unit, lembar, unit, lokasi
  pic?: string; // Penanggung Jawab / Lokasi
  serialNumber?: string;
  warrantyExpiry?: string;
  depreciationRateYearly?: number; // % penyusutan per tahun
  linkedFinanceAccountId?: string;
  notes?: string;
  status: AssetStatus;
  createdAt: string;
  updatedAt?: string;
}

export const ASSET_GROUP_LABELS: Record<AssetGroup, string> = {
  investment: 'Aset Investasi & Kekayaan',
  office_inventory: 'Inventaris & Peralatan Kantor',
};

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, { label: string; group: AssetGroup; icon: string }> = {
  gold: { label: 'Emas & Logam Mulia', group: 'investment', icon: 'Coins' },
  deposit: { label: 'Deposito & SBN', group: 'investment', icon: 'Landmark' },
  crypto: { label: 'Crypto & Assets', group: 'investment', icon: 'Bitcoin' },
  real_estate: { label: 'Properti & Tanah', group: 'investment', icon: 'Home' },
  receivable: { label: 'Piutang / Tagihan', group: 'investment', icon: 'Receipt' },
  it_equipment: { label: 'Peralatan IT / Elektronik', group: 'office_inventory', icon: 'Laptop' },
  vehicle: { label: 'Kendaraan Operasional', group: 'office_inventory', icon: 'Car' },
  furniture: { label: 'Furniture Kantor', group: 'office_inventory', icon: 'Armchair' },
  software_license: { label: 'Lisensi Software / SaaS', group: 'office_inventory', icon: 'Key' },
  other: { label: 'Lain-lain', group: 'office_inventory', icon: 'Box' },
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, { label: string; badge: string }> = {
  active: { label: 'Aktif', badge: 'badge-green' },
  maintenance: { label: 'Maintenance / Servis', badge: 'badge-yellow' },
  matured: { label: 'Jatuh Tempo', badge: 'badge-blue' },
  disposed: { label: 'Disusutkan / Terjual', badge: 'badge-red' },
};

export function calculateAssetSummary(assets: AssetItem[] = []) {
  let totalPurchaseCost = 0;
  let totalCurrentValue = 0;
  let investmentValue = 0;
  let inventoryValue = 0;

  const list = Array.isArray(assets) ? assets : [];
  list.forEach((a) => {
    if (a && a.status !== 'disposed') {
      const val = a.currentValue || a.purchasePrice || 0;
      const cost = a.purchasePrice || 0;
      totalPurchaseCost += cost;
      totalCurrentValue += val;

      if (a.group === 'investment') {
        investmentValue += val;
      } else {
        inventoryValue += val;
      }
    }
  });

  const totalGainLoss = totalCurrentValue - totalPurchaseCost;
  const gainLossPercent = totalPurchaseCost > 0 ? (totalGainLoss / totalPurchaseCost) * 100 : 0;

  return {
    totalPurchaseCost,
    totalCurrentValue,
    investmentValue,
    inventoryValue,
    totalGainLoss,
    gainLossPercent,
  };
}
