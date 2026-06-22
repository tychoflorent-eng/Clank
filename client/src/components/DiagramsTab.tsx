import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { Diagram, ExternalDiagramLink } from "../api/types";

function isImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

export default function DiagramsTab({ motorcycleId }: { motorcycleId: number }) {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [externalLinks, setExternalLinks] = useState<ExternalDiagramLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    Promise.all([api.listDiagrams(motorcycleId), api.getExternalDiagramLinks(motorcycleId)])
      .then(([d, links]) => {
        setDiagrams(d);
        setExternalLinks(links);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [motorcycleId]);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a file to upload");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const created = await api.uploadDiagram(motorcycleId, file, title.trim() || file.name);
      setDiagrams((prev) => [created, ...prev]);
      setTitle("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this diagram?")) return;
    await api.deleteDiagram(id);
    setDiagrams((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div>
      <h2>Diagrams &amp; Manuals</h2>
      {error && <div className="error-banner">{error}</div>}

      <form className="card stack" onSubmit={handleUpload} style={{ marginBottom: "1.25rem" }}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="diagram-title">Title</label>
            <input
              id="diagram-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Wiring diagram, exploded engine view, …"
            />
          </div>
          <div className="field">
            <label htmlFor="diagram-file">File (PDF / PNG / JPEG / WEBP)</label>
            <input
              id="diagram-file"
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <div className="row-actions">
          <button className="btn" type="submit" disabled={uploading}>
            {uploading ? "Uploading…" : "Upload Diagram"}
          </button>
        </div>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : diagrams.length === 0 ? (
        <div className="empty-state">No diagrams uploaded yet for this motorcycle.</div>
      ) : (
        <div className="diagram-grid">
          {diagrams.map((d) => (
            <div className="diagram-tile" key={d.id}>
              <a href={api.diagramFileUrl(d.id)} target="_blank" rel="noreferrer">
                <div className="preview">
                  {isImage(d.mimeType) ? (
                    <img src={api.diagramFileUrl(d.id)} alt={d.title} />
                  ) : (
                    <span>📄</span>
                  )}
                </div>
              </a>
              <div className="meta">
                <div className="name">{d.title}</div>
                <div className="row-actions" style={{ marginTop: "0.5rem" }}>
                  <button className="btn danger" onClick={() => handleDelete(d.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ marginTop: "2rem" }}>Look up diagrams online</h3>
      <p className="subtitle">
        No public API exposes OEM parts diagrams, so these links jump to each retailer's own
        search results for this model instead.
      </p>
      <div className="external-links">
        {externalLinks.map((link) => (
          <a key={link.site} href={link.url} target="_blank" rel="noreferrer">
            {link.site} ↗
          </a>
        ))}
      </div>
    </div>
  );
}
