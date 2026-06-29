import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { MaintenanceInput, MaintenanceRecord } from "../api/types";

const TODAY = () => new Date().toISOString().slice(0, 10);

export default function MaintenanceTab({ motorcycleId }: { motorcycleId: number }) {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [date, setDate] = useState(TODAY());
  const [type, setType] = useState("");
  const [mileage, setMileage] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [cost, setCost] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    api
      .listMaintenance(motorcycleId)
      .then(setRecords)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [motorcycleId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!date || !type.trim()) {
      setError("Date and type are required");
      return;
    }
    setSubmitting(true);
    setError(null);
    const input: MaintenanceInput = {
      date,
      type: type.trim(),
      mileage: mileage.trim() ? Number(mileage) : null,
      performedBy: performedBy.trim() || null,
      cost: cost.trim() ? Number(cost) : null,
      description: description.trim() || null,
    };
    try {
      const created = await api.createMaintenance(motorcycleId, input);
      setRecords((prev) => [created, ...prev]);
      setShowAdd(false);
      setType("");
      setMileage("");
      setPerformedBy("");
      setCost("");
      setDescription("");
      setDate(TODAY());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this maintenance record?")) return;
    await api.deleteMaintenance(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div>
      <div className="page-header">
        <h2>Maintenance History</h2>
        <button className="btn" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? "Cancel" : "+ Log Maintenance"}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showAdd && (
        <form className="card stack" onSubmit={handleSubmit} style={{ marginBottom: "1.25rem" }}>
          <div className="field-row">
            <div className="field">
              <label htmlFor="m-date">Date *</label>
              <input id="m-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="m-type">Type *</label>
              <input
                id="m-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="Oil change, brake pads, …"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="m-mileage">Mileage</label>
              <input id="m-mileage" type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="m-by">Performed by</label>
              <input id="m-by" value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="m-cost">Cost</label>
              <input id="m-cost" type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="m-desc">Description</label>
            <textarea id="m-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="row-actions">
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save Record"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : records.length === 0 ? (
        <div className="empty-state">No maintenance logged yet.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Mileage</th>
              <th>Performed By</th>
              <th>Cost</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{r.date}</td>
                <td>{r.type}</td>
                <td>{r.mileage != null ? r.mileage.toLocaleString() : "—"}</td>
                <td>{r.performedBy || "—"}</td>
                <td>{r.cost != null ? `$${r.cost.toFixed(2)}` : "—"}</td>
                <td>{r.description || "—"}</td>
                <td>
                  <button className="btn danger" onClick={() => handleDelete(r.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
