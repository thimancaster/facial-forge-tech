/**
 * Centralized constants for the application
 */

// Toxin products with conversion factors
export interface ToxinProduct {
  id: string;
  name: string;
  genericName: string;
  conversionFactor: number;
  description: string;
}

export const TOXIN_PRODUCTS: ToxinProduct[] = [
  {
    id: "botox",
    name: "Botox®",
    genericName: "OnabotulinumtoxinA",
    conversionFactor: 1.0,
    description: "Allergan - Padrão de referência"
  },
  {
    id: "dysport",
    name: "Dysport®",
    genericName: "AbobotulinumtoxinA",
    conversionFactor: 2.5,
    description: "Galderma - Fator de conversão 2.5:1"
  },
  {
    id: "xeomin",
    name: "Xeomin®",
    genericName: "IncobotulinumtoxinA",
    conversionFactor: 1.0,
    description: "Merz - Equivalente 1:1 ao Botox"
  },
  {
    id: "jeuveau",
    name: "Jeuveau®",
    genericName: "PrabotulinumtoxinA",
    conversionFactor: 1.0,
    description: "Evolus - Equivalente 1:1 ao Botox"
  },
  {
    id: "daxxify",
    name: "Daxxify®",
    genericName: "DaxibotulinumtoxinA",
    conversionFactor: 1.0,
    description: "Revance - Longa duração"
  }
];

// Get product by ID
export function getProductById(id: string): ToxinProduct | undefined {
  return TOXIN_PRODUCTS.find(p => p.id === id);
}

// Get product by generic name
export function getProductByGenericName(genericName: string): ToxinProduct | undefined {
  return TOXIN_PRODUCTS.find(p => p.genericName === genericName);
}

// Get display name from generic name
export function getProductDisplayName(genericName: string | null): string {
  if (!genericName) return 'Botox®';
  if (genericName.includes('Ona')) return 'Botox®';
  if (genericName.includes('Abo')) return 'Dysport®';
  if (genericName.includes('Inco')) return 'Xeomin®';
  if (genericName.includes('Prabo')) return 'Jeuveau®';
  if (genericName.includes('Daxi')) return 'Daxxify®';
  return genericName;
}

// Facial regions for filtering
export const FACIAL_REGIONS = [
  { value: 'all', label: 'Todas as regiões' },
  { value: 'glabela', label: 'Glabela' },
  { value: 'frontal', label: 'Frontal' },
  { value: 'periorbital', label: 'Periorbital' },
  { value: 'nasal', label: 'Nasal' },
  { value: 'perioral', label: 'Perioral' },
  { value: 'mentual', label: 'Mentual' },
] as const;

// Product filter options
export const PRODUCT_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos os produtos' },
  { value: 'OnabotulinumtoxinA', label: 'Botox®' },
  { value: 'AbobotulinumtoxinA', label: 'Dysport®' },
  { value: 'IncobotulinumtoxinA', label: 'Xeomin®' },
] as const;

// Appointment types
export const APPOINTMENT_TYPES = [
  { value: "followup", label: "Retorno / Follow-up" },
  { value: "new_session", label: "Nova Sessão" },
  { value: "consultation", label: "Consulta" },
  { value: "adjustment", label: "Ajuste" },
] as const;

// Reminder options for appointments
export const REMINDER_OPTIONS = [
  { value: 1, label: "1 dia antes" },
  { value: 3, label: "3 dias antes" },
  { value: 7, label: "7 dias antes" },
  { value: 14, label: "14 dias antes" },
] as const;

// Time slots for appointments
export const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
];

// Gender options
export const GENDER_OPTIONS = [
  { value: 'feminino', label: 'Feminino' },
  { value: 'masculino', label: 'Masculino' },
] as const;

// Skin type Glogau scale
export const GLOGAU_TYPES = [
  { value: 'I', label: 'Tipo I - Sem rugas' },
  { value: 'II', label: 'Tipo II - Rugas em movimento' },
  { value: 'III', label: 'Tipo III - Rugas em repouso' },
  { value: 'IV', label: 'Tipo IV - Rugas severas' },
] as const;

// Muscle strength options
export const MUSCLE_STRENGTH_OPTIONS = [
  { value: 'low', label: 'Fraca', modifier: 0.8 },
  { value: 'medium', label: 'Média', modifier: 1.0 },
  { value: 'high', label: 'Forte', modifier: 1.2 },
] as const;
