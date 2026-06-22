export interface Motorcycle {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname: string | null;
  vin: string | null;
  plate: string | null;
  color: string | null;
  mileage: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MotorcycleInput = Omit<Motorcycle, "id" | "createdAt" | "updatedAt">;

export interface MaintenanceRecord {
  id: number;
  motorcycleId: number;
  date: string;
  mileage: number | null;
  type: string;
  description: string | null;
  performedBy: string | null;
  cost: number | null;
  createdAt: string;
}

export type MaintenanceInput = Omit<MaintenanceRecord, "id" | "motorcycleId" | "createdAt">;

export interface Diagram {
  id: number;
  motorcycleId: number;
  title: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface ExternalDiagramLink {
  site: string;
  url: string;
}

export interface MotorcycleSpec {
  make: string;
  model: string;
  year: number;
  type?: string;
  displacement?: string;
  engine?: string;
  power?: string;
  torque?: string;
  top_speed?: string;
  dry_weight?: string;
  [key: string]: unknown;
}
