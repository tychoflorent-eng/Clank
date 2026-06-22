import { useState, type FormEvent } from "react";
import type { MotorcycleInput } from "../api/types";

interface Props {
  initial?: Partial<MotorcycleInput>;
  submitLabel?: string;
  onSubmit: (input: MotorcycleInput) => Promise<void>;
  onCancel?: () => void;
}

export default function MotorcycleForm({ initial, submitLabel = "Save", onSubmit, onCancel }: Props) {
  const [make, setMake] = useState(initial?.make ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [year, setYear] = useState(initial?.year ? String(initial.year) : "");
  const [nickname, setNickname] = useState(initial?.nickname ?? "");
  const [vin, setVin] = useState(initial?.vin ?? "");
  const [plate, setPlate] = useState(initial?.plate ?? "");
  const [color, setColor] = useState(initial?.color ?? "");
  const [mileage, setMileage] = useState(initial?.mileage ? String(initial.mileage) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!make.trim() || !model.trim() || !year.trim()) {
      setError("Make, model, and year are required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        make: make.trim(),
        model: model.trim(),
        year: Number(year),
        nickname: nickname.trim() || null,
        vin: vin.trim() || null,
        plate: plate.trim() || null,
        color: color.trim() || null,
        mileage: mileage.trim() ? Number(mileage) : null,
        notes: notes.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}
      <div className="field-row">
        <div className="field">
          <label htmlFor="make">Make *</label>
          <input id="make" value={make} onChange={(e) => setMake(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="model">Model *</label>
          <input id="model" value={model} onChange={(e) => setModel(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="year">Year *</label>
          <input
            id="year"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="nickname">Nickname</label>
          <input id="nickname" value={nickname ?? ""} onChange={(e) => setNickname(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="color">Color</label>
          <input id="color" value={color ?? ""} onChange={(e) => setColor(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="mileage">Mileage</label>
          <input
            id="mileage"
            type="number"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
          />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="vin">VIN</label>
          <input id="vin" value={vin ?? ""} onChange={(e) => setVin(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="plate">Plate</label>
          <input id="plate" value={plate ?? ""} onChange={(e) => setPlate(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" rows={3} value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="row-actions">
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button className="btn secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
