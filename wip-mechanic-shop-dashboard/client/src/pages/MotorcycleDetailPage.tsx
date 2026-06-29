import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Motorcycle, MotorcycleInput } from "../api/types";
import MotorcycleForm from "../components/MotorcycleForm";
import MaintenanceTab from "../components/MaintenanceTab";
import DiagramsTab from "../components/DiagramsTab";

type Tab = "overview" | "maintenance" | "diagrams";

export default function MotorcycleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const motorcycleId = Number(id);
  const navigate = useNavigate();

  const [motorcycle, setMotorcycle] = useState<Motorcycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .getMotorcycle(motorcycleId)
      .then(setMotorcycle)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [motorcycleId]);

  async function handleUpdate(input: MotorcycleInput) {
    const updated = await api.updateMotorcycle(motorcycleId, input);
    setMotorcycle(updated);
    setEditing(false);
  }

  async function handleDelete() {
    if (!motorcycle) return;
    if (!confirm(`Delete ${motorcycle.year} ${motorcycle.make} ${motorcycle.model}? This removes all its maintenance records and diagrams too.`)) return;
    await api.deleteMotorcycle(motorcycleId);
    navigate("/");
  }

  if (loading) return <p>Loading…</p>;
  if (error) return <div className="error-banner">{error}</div>;
  if (!motorcycle) return null;

  return (
    <div>
      <Link to="/" className="subtitle">
        ← Back to Garage
      </Link>

      <div className="page-header" style={{ marginTop: "0.5rem" }}>
        <h1>
          {motorcycle.year} {motorcycle.make} {motorcycle.model}
          {motorcycle.nickname ? ` "${motorcycle.nickname}"` : ""}
        </h1>
        <div className="row-actions">
          <button className="btn secondary" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button className="btn danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>
          Overview
        </button>
        <button className={tab === "maintenance" ? "active" : ""} onClick={() => setTab("maintenance")}>
          Maintenance
        </button>
        <button className={tab === "diagrams" ? "active" : ""} onClick={() => setTab("diagrams")}>
          Diagrams
        </button>
      </div>

      {tab === "overview" && (
        <div className="card">
          <div className="spec-grid">
            <div className="spec-item">
              <div className="label">VIN</div>
              <div className="value">{motorcycle.vin || "—"}</div>
            </div>
            <div className="spec-item">
              <div className="label">Plate</div>
              <div className="value">{motorcycle.plate || "—"}</div>
            </div>
            <div className="spec-item">
              <div className="label">Color</div>
              <div className="value">{motorcycle.color || "—"}</div>
            </div>
            <div className="spec-item">
              <div className="label">Mileage</div>
              <div className="value">{motorcycle.mileage != null ? motorcycle.mileage.toLocaleString() : "—"}</div>
            </div>
          </div>
          {motorcycle.notes && (
            <p style={{ marginTop: "1rem", whiteSpace: "pre-wrap" }}>{motorcycle.notes}</p>
          )}
        </div>
      )}

      {tab === "maintenance" && <MaintenanceTab motorcycleId={motorcycleId} />}
      {tab === "diagrams" && <DiagramsTab motorcycleId={motorcycleId} />}

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Motorcycle</h2>
            <MotorcycleForm initial={motorcycle} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
