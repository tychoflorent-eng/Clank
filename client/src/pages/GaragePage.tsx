import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Motorcycle, MotorcycleInput } from "../api/types";
import MotorcycleForm from "../components/MotorcycleForm";

export default function GaragePage() {
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api
      .listMotorcycles()
      .then(setMotorcycles)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(input: MotorcycleInput) {
    const created = await api.createMotorcycle(input);
    setMotorcycles((prev) => [...prev, created]);
    setShowAdd(false);
  }

  return (
    <div>
      <div className="page-header">
        <h1>Garage</h1>
        <button className="btn" onClick={() => setShowAdd(true)}>
          + Add Motorcycle
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p>Loading…</p>
      ) : motorcycles.length === 0 ? (
        <div className="empty-state">
          No motorcycles yet. Add one manually, or use Model Search to look up a model first.
        </div>
      ) : (
        <div className="grid">
          {motorcycles.map((m) => (
            <Link key={m.id} to={`/motorcycles/${m.id}`} className="card moto-card">
              <div className="title">
                {m.year} {m.make} {m.model}
              </div>
              <div className="subtitle">
                {m.nickname ? `"${m.nickname}" · ` : ""}
                {m.mileage != null ? `${m.mileage.toLocaleString()} mi` : "Mileage unknown"}
              </div>
            </Link>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Motorcycle</h2>
            <MotorcycleForm onSubmit={handleCreate} onCancel={() => setShowAdd(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
