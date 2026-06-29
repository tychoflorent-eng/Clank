import type {
  Diagram,
  ExternalDiagramLink,
  MaintenanceInput,
  MaintenanceRecord,
  Motorcycle,
  MotorcycleInput,
  MotorcycleSpec,
} from "./types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: options?.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : undefined,
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listMotorcycles: () => request<Motorcycle[]>("/api/motorcycles"),
  getMotorcycle: (id: number) => request<Motorcycle>(`/api/motorcycles/${id}`),
  createMotorcycle: (input: MotorcycleInput) =>
    request<Motorcycle>("/api/motorcycles", { method: "POST", body: JSON.stringify(input) }),
  updateMotorcycle: (id: number, input: Partial<MotorcycleInput>) =>
    request<Motorcycle>(`/api/motorcycles/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteMotorcycle: (id: number) => request<void>(`/api/motorcycles/${id}`, { method: "DELETE" }),

  listMaintenance: (motorcycleId: number) =>
    request<MaintenanceRecord[]>(`/api/motorcycles/${motorcycleId}/maintenance`),
  createMaintenance: (motorcycleId: number, input: MaintenanceInput) =>
    request<MaintenanceRecord>(`/api/motorcycles/${motorcycleId}/maintenance`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateMaintenance: (id: number, input: Partial<MaintenanceInput>) =>
    request<MaintenanceRecord>(`/api/maintenance/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  deleteMaintenance: (id: number) => request<void>(`/api/maintenance/${id}`, { method: "DELETE" }),

  listDiagrams: (motorcycleId: number) =>
    request<Diagram[]>(`/api/motorcycles/${motorcycleId}/diagrams`),
  getExternalDiagramLinks: (motorcycleId: number) =>
    request<ExternalDiagramLink[]>(`/api/motorcycles/${motorcycleId}/diagrams/external-links`),
  uploadDiagram: (motorcycleId: number, file: File, title: string) => {
    const form = new FormData();
    form.append("file", file);
    return request<Diagram>(
      `/api/motorcycles/${motorcycleId}/diagrams?title=${encodeURIComponent(title)}`,
      { method: "POST", body: form },
    );
  },
  deleteDiagram: (id: number) => request<void>(`/api/diagrams/${id}`, { method: "DELETE" }),
  diagramFileUrl: (id: number) => `/api/diagrams/${id}/file`,

  searchSpecs: (make: string, model?: string, year?: number) => {
    const params = new URLSearchParams({ make });
    if (model) params.set("model", model);
    if (year) params.set("year", String(year));
    return request<MotorcycleSpec[]>(`/api/specs/search?${params.toString()}`);
  },
};
