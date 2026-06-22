import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { MotorcycleInput, MotorcycleSpec } from "../api/types";
import MotorcycleForm from "../components/MotorcycleForm";

const SPEC_FIELDS: Array<[keyof MotorcycleSpec, string]> = [
  ["type", "Type"],
  ["displacement", "Displacement"],
  ["engine", "Engine"],
  ["power", "Power"],
  ["torque", "Torque"],
  ["top_speed", "Top Speed"],
  ["dry_weight", "Dry Weight"],
];

export default function ModelSearchPage() {
  const navigate = useNavigate();
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [results, setResults] = useState<MotorcycleSpec[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addTarget, setAddTarget] = useState<MotorcycleSpec | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!make.trim()) {
      setError("Make is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.searchSpecs(make.trim(), model.trim() || undefined, year ? Number(year) : undefined);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(input: MotorcycleInput) {
    const created = await api.createMotorcycle(input);
    setAddTarget(null);
    navigate(`/motorcycles/${created.id}`);
  }

  return (
    <div>
      <h1>Model Search</h1>
      <p className="subtitle">
        Look up specs by make/model/year (powered by API Ninjas). Add any result straight to your
        garage.
      </p>

      <form className="card stack" onSubmit={handleSearch} style={{ marginBottom: "1.5rem" }}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="search-make">Make *</label>
            <input id="search-make" value={make} onChange={(e) => setMake(e.target.value)} placeholder="Honda" />
          </div>
          <div className="field">
            <label htmlFor="search-model">Model</label>
            <input id="search-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="CBR600RR" />
          </div>
          <div className="field">
            <label htmlFor="search-year">Year</label>
            <input id="search-year" type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2020" />
          </div>
        </div>
        <div className="row-actions">
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {error && <div className="error-banner">{error}</div>}

      {results && results.length === 0 && (
        <div className="empty-state">No matches found. Try a broader search.</div>
      )}

      {results && results.length > 0 && (
        <div className="grid">
          {results.map((spec, i) => (
            <div className="card" key={i}>
              <div className="title" style={{ fontWeight: 700, marginBottom: "0.5rem" }}>
                {spec.year} {spec.make} {spec.model}
              </div>
              <div className="spec-grid">
                {SPEC_FIELDS.filter(([key]) => spec[key]).map(([key, label]) => (
                  <div className="spec-item" key={key}>
                    <div className="label">{label}</div>
                    <div className="value">{String(spec[key])}</div>
                  </div>
                ))}
              </div>
              <div className="row-actions" style={{ marginTop: "0.75rem" }}>
                <button className="btn" onClick={() => setAddTarget(spec)}>
                  + Add to Garage
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {addTarget && (
        <div className="modal-backdrop" onClick={() => setAddTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add to Garage</h2>
            <MotorcycleForm
              initial={{ make: addTarget.make, model: addTarget.model, year: addTarget.year }}
              submitLabel="Add"
              onSubmit={handleAdd}
              onCancel={() => setAddTarget(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
