// Kuriom -- onboard.kuriom.ai
// Onboarding Portal -- Knowledge Node Lifecycle Management
// Six screens: Login, Node Queue, Node Submit Form (6-step),
// Bulk Upload (CSV + document extraction), Attestation Inbox + Review, Promotion Queue
// Same Cognito pool as app.kuriom.ai and gip.kuriom.ai
// Author: Srinivasan Ramanan
// Patent Pending: 64/008,411 et al.

import React, { useState, useEffect, useCallback } from "react";
import { AuthProvider, RequireAuth, useAuth } from "./auth/CognitoAuth.jsx";

const API = "https://api.kuriom.ai";

const T = {
  bg:         "#0B0F19",
  bgCard:     "#111827",
  bgSidebar:  "#0D1117",
  border:     "#1E293B",
  text:       "#F1F5F9",
  textMuted:  "#64748B",
  textSub:    "#94A3B8",
  brand:      "#3B82F6",
  green:      "#10B981",
  amber:      "#F59E0B",
  red:        "#EF4444",
  purple:     "#8B5CF6",
};

// ─── API HELPERS ────────────────────────────────────────────────────────────

function getHeaders(token) {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

async function apiFetch(path, token, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...getHeaders(token), ...(options.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error: ${res.status}`);
  }
  return res.json();
}

// ─── SHARED COMPONENTS ──────────────────────────────────────────────────────

function Badge({ label, color }) {
  const colors = {
    yellow: { bg: "rgba(245,158,11,0.15)", text: "#F59E0B", border: "rgba(245,158,11,0.3)" },
    green:  { bg: "rgba(16,185,129,0.15)", text: "#10B981", border: "rgba(16,185,129,0.3)" },
    red:    { bg: "rgba(239,68,68,0.15)",  text: "#EF4444", border: "rgba(239,68,68,0.3)" },
    blue:   { bg: "rgba(59,130,246,0.15)", text: "#3B82F6", border: "rgba(59,130,246,0.3)" },
    purple: { bg: "rgba(139,92,246,0.15)", text: "#8B5CF6", border: "rgba(139,92,246,0.3)" },
    gray:   { bg: "rgba(100,116,139,0.15)", text: "#64748B", border: "rgba(100,116,139,0.3)" },
  };
  const c = colors[color] || colors.gray;
  return (
    <span style={{
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
    }}>{label}</span>
  );
}

function Btn({ children, onClick, disabled, variant = "primary", style = {} }) {
  const styles = {
    primary:   { background: T.brand, color: "#fff" },
    secondary: { background: "transparent", color: T.textSub, border: `1px solid ${T.border}` },
    danger:    { background: "rgba(239,68,68,0.15)", color: T.red, border: `1px solid rgba(239,68,68,0.3)` },
    success:   { background: "rgba(16,185,129,0.15)", color: T.green, border: `1px solid rgba(16,185,129,0.3)` },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        border: "none", transition: "opacity 0.15s",
        ...styles[variant], ...style,
      }}>
      {children}
    </button>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: T.bgCard, border: `1px solid ${T.border}`,
      borderRadius: 8, padding: 20, ...style,
    }}>{children}</div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text", required, disabled }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={{ display: "block", fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}{required && <span style={{ color: T.red }}> *</span>}</label>}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required} disabled={disabled}
        style={{
          width: "100%", background: T.bg, border: `1px solid ${T.border}`,
          borderRadius: 6, padding: "8px 12px", color: T.text, fontSize: 13,
          boxSizing: "border-box", outline: "none",
        }}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, required, disabled }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={{ display: "block", fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}{required && <span style={{ color: T.red }}> *</span>}</label>}
      <select
        value={value} onChange={e => onChange(e.target.value)}
        required={required} disabled={disabled}
        style={{
          width: "100%", background: T.bg, border: `1px solid ${T.border}`,
          borderRadius: 6, padding: "8px 12px", color: T.text, fontSize: 13,
          boxSizing: "border-box",
        }}>
        <option value="">Select...</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 3, required }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={{ display: "block", fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}{required && <span style={{ color: T.red }}> *</span>}</label>}
      <textarea
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={rows} required={required}
        style={{
          width: "100%", background: T.bg, border: `1px solid ${T.border}`,
          borderRadius: 6, padding: "8px 12px", color: T.text, fontSize: 13,
          boxSizing: "border-box", resize: "vertical", outline: "none",
        }}
      />
    </div>
  );
}

// ─── STATUS HELPERS ─────────────────────────────────────────────────────────

const STATUS_BADGE = {
  PENDING_ATTESTATION:        { label: "Pending Attestation",        color: "yellow" },
  PENDING_SECOND_ATTESTATION: { label: "Pending 2nd Attestation",    color: "amber" },
  IN_LEARNING_PERIOD:         { label: "In Learning Period",         color: "blue" },
  ATTESTED:                   { label: "Attested",                   color: "green" },
  REJECTED:                   { label: "Rejected",                   color: "red" },
};

const NODE_TYPES = [
  "REGULATORY_GUIDANCE","CLINICAL_LITERATURE","PROCESS_SPECIFICATION",
  "POLICY","CERTIFICATE","APPROVAL","ADVERSE_EVENT_RECORD",
  "PROTOCOL_DOCUMENT","BATCH_RECORD","DEVIATION_RECORD",
  "DOMAIN_REQUIREMENT","CONNECTOR_DERIVED",
].map(v => ({ value: v, label: v.replace(/_/g, " ") }));

const TTL_BASIS = ["CALENDAR","EVENT_DRIVEN","REGULATORY_CYCLE","OPERATIONAL"]
  .map(v => ({ value: v, label: v.replace(/_/g, " ") }));

const PROV_TIERS = [
  { value: "T1", label: "T1 -- Primary Source (regulation, standard)" },
  { value: "T2", label: "T2 -- Validated Secondary" },
  { value: "T3", label: "T3 -- Internal / Derived" },
];

const FIVE_ELEMENTS = [
  { key: "accuracy",     label: "Accuracy",     desc: "The assertion is factually correct and verifiable against the source." },
  { key: "scope",        label: "Scope",        desc: "The scope of applicability is correctly defined and not overly broad." },
  { key: "authority",    label: "Authority",    desc: "The named authority has standing to make this assertion." },
  { key: "currency",     label: "Currency",     desc: "The knowledge is current and within its stated validity period." },
  { key: "completeness", label: "Completeness", desc: "No material conditions or exceptions have been omitted." },
];

// ─── SCREEN 1: NODE SUBMISSION QUEUE ────────────────────────────────────────

function NodeQueue({ token, user, onNavigate }) {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : "";
      const data = await apiFetch(`/api/v1/knowledge/candidates${params}`, token);
      setNodes(data.candidates || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [token, statusFilter]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const pending = nodes.filter(n => n.status === "PENDING_ATTESTATION" || n.status === "PENDING_SECOND_ATTESTATION").length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ color: T.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Node Submission Queue</h1>
          <p style={{ color: T.textMuted, fontSize: 13, marginTop: 4 }}>CandidateKnowledgeNodes awaiting attestation before gate promotion.</p>
        </div>
        <Btn onClick={() => onNavigate("submit")}>+ Submit Node</Btn>
      </div>

      {/* Summary */}
      <Card style={{ marginBottom: 20, borderColor: pending > 0 ? T.amber : T.green }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ color: T.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Pending Attestation</p>
            <p style={{ color: pending > 0 ? T.amber : T.green, fontSize: 36, fontWeight: 700, fontFamily: "monospace" }}>{pending}</p>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: T.textMuted }}>
            <p>{nodes.filter(n => n.status === "IN_LEARNING_PERIOD").length} in learning period</p>
            <p>{nodes.filter(n => n.status === "ATTESTED").length} attested</p>
            <p>{nodes.filter(n => n.status === "REJECTED").length} rejected</p>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["", "PENDING_ATTESTATION", "PENDING_SECOND_ATTESTATION", "IN_LEARNING_PERIOD", "ATTESTED", "REJECTED"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{
              padding: "5px 12px", borderRadius: 4, fontSize: 12, fontWeight: 600,
              cursor: "pointer", border: `1px solid ${statusFilter === s ? T.brand : T.border}`,
              background: statusFilter === s ? "rgba(59,130,246,0.15)" : "transparent",
              color: statusFilter === s ? T.brand : T.textMuted,
            }}>
            {s || "All"}
          </button>
        ))}
        <Btn variant="secondary" onClick={fetch_} style={{ marginLeft: "auto" }}>Refresh</Btn>
      </div>

      {loading ? (
        <p style={{ color: T.textMuted, fontSize: 13 }}>Loading...</p>
      ) : error ? (
        <p style={{ color: T.red, fontSize: 13 }}>{error}</p>
      ) : nodes.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: T.textMuted, fontSize: 13 }}>No candidates found. Submit a node to begin the attestation lifecycle.</p>
          <div style={{ marginTop: 16 }}>
            <Btn onClick={() => onNavigate("submit")}>Submit First Node</Btn>
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {nodes.map(n => {
            const sb = STATUS_BADGE[n.status] || { label: n.status, color: "gray" };
            return (
              <Card key={n.candidate_node_id} style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    <Badge label={n.node_type} color="blue" />
                    <Badge label={sb.label} color={sb.color} />
                    <span style={{ color: T.textMuted, fontSize: 12 }}>{n.domain}</span>
                  </div>
                  <p style={{ color: T.text, fontSize: 14, fontWeight: 500, margin: "0 0 4px" }}>{n.assertion_what || "—"}</p>
                  <p style={{ color: T.textSub, fontSize: 12, margin: 0 }}>{n.assertion_scope || ""}</p>
                  <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12, color: T.textMuted }}>
                    <span>By {n.submitted_by || "—"}</span>
                    <span>{n.submitted_at ? new Date(n.submitted_at).toLocaleDateString() : "—"}</span>
                    <span style={{ color: T.textSub }}>{n.authority_name} ({n.authority_role})</span>
                  </div>
                  <p style={{ color: T.border, fontSize: 11, fontFamily: "monospace", marginTop: 4 }}>{n.candidate_node_id}</p>
                </div>
                {user?.role === "governance_admin" && (n.status === "PENDING_ATTESTATION" || n.status === "PENDING_SECOND_ATTESTATION") && (
                  <Btn onClick={() => onNavigate("attest", n)}>Attest</Btn>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SCREEN 2: NODE SUBMISSION FORM (6-STEP) ────────────────────────────────

const EMPTY_FORM = {
  node_type: "", domain: "",
  assertion: { what: "", scope: "", conditions: "", jurisdiction: "" },
  provenance: { tier: "", source_type: "", source_reference: "", source_authority: "" },
  validity: { ttl_basis: "", ttl_value: "", ttl_event: "", valid_from: "", valid_until: "" },
  authority: { authority_id: "", name: "", role: "", sso_identity: "" },
};

const STEPS = ["Node Type", "Assertion", "Provenance", "Validity", "Authority", "Review & Submit"];

function NodeSubmitForm({ token, user, onNavigate }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  function setField(section, field, value) {
    if (section) {
      setForm(f => ({ ...f, [section]: { ...f[section], [field]: value } }));
    } else {
      setForm(f => ({ ...f, [field]: value }));
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...form,
        tenant_id: user?.tenantId || "default",
        authority: { ...form.authority, authority_id: form.authority.authority_id || `AUTH-${Date.now()}` },
      };
      const data = await apiFetch("/api/v1/knowledge/submit", token, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <Card style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: 40 }}>
        <p style={{ fontSize: 32, marginBottom: 12 }}>✓</p>
        <h2 style={{ color: T.green, fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Node Submitted</h2>
        <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 16 }}>Your candidate node has been created and is pending attestation.</p>
        <p style={{ color: T.textSub, fontSize: 12, fontFamily: "monospace", marginBottom: 24 }}>{result.candidate_node_id}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <Btn onClick={() => { setResult(null); setForm(EMPTY_FORM); setStep(0); }}>Submit Another</Btn>
          <Btn variant="secondary" onClick={() => onNavigate("queue")}>View Queue</Btn>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: T.text, fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Submit Knowledge Node</h1>
        <p style={{ color: T.textMuted, fontSize: 13, margin: 0 }}>6-step guided form. All fields feed the 16-field CandidateKnowledgeNode schema.</p>
      </div>

      {/* Step indicators */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, flexWrap: "wrap" }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{
            padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600,
            background: i === step ? T.brand : i < step ? "rgba(16,185,129,0.2)" : T.bgCard,
            color: i === step ? "#fff" : i < step ? T.green : T.textMuted,
            border: `1px solid ${i === step ? T.brand : i < step ? T.green : T.border}`,
            cursor: i < step ? "pointer" : "default",
          }} onClick={() => i < step && setStep(i)}>
            {i + 1}. {s}
          </div>
        ))}
      </div>

      <Card>
        {/* Step 0: Node Type + Domain */}
        {step === 0 && (
          <div>
            <h3 style={{ color: T.text, fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Node Type & Domain</h3>
            <Select label="Node Type" value={form.node_type} onChange={v => setField(null, "node_type", v)} options={NODE_TYPES} required />
            <Input label="Domain" value={form.domain} onChange={v => setField(null, "domain", v)} placeholder="e.g. pharma_quality" required />
          </div>
        )}

        {/* Step 1: Assertion */}
        {step === 1 && (
          <div>
            <h3 style={{ color: T.text, fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Assertion</h3>
            <Textarea label="What (governed claim)" value={form.assertion.what} onChange={v => setField("assertion", "what", v)} placeholder="Single declarative sentence -- the governed claim." required rows={2} />
            <Textarea label="Scope" value={form.assertion.scope} onChange={v => setField("assertion", "scope", v)} placeholder="Scope of applicability." required rows={2} />
            <Input label="Conditions (optional)" value={form.assertion.conditions} onChange={v => setField("assertion", "conditions", v)} placeholder="Conditions under which this applies." />
            <Input label="Jurisdiction (optional)" value={form.assertion.jurisdiction} onChange={v => setField("assertion", "jurisdiction", v)} placeholder="e.g. EU, US, GLOBAL" />
          </div>
        )}

        {/* Step 2: Provenance */}
        {step === 2 && (
          <div>
            <h3 style={{ color: T.text, fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Provenance</h3>
            <Select label="Tier" value={form.provenance.tier} onChange={v => setField("provenance", "tier", v)} options={PROV_TIERS} required />
            <Select label="Source Type" value={form.provenance.source_type} onChange={v => setField("provenance", "source_type", v)}
              options={["REGULATORY","CLINICAL","INTERNAL","VENDOR","DERIVED"].map(v => ({ value: v, label: v }))} required />
            <Input label="Source Reference (URL)" value={form.provenance.source_reference} onChange={v => setField("provenance", "source_reference", v)} placeholder="https://..." />
            <Input label="Source Authority" value={form.provenance.source_authority} onChange={v => setField("provenance", "source_authority", v)} placeholder="e.g. EMA, FDA, ICH" />
          </div>
        )}

        {/* Step 3: Validity */}
        {step === 3 && (
          <div>
            <h3 style={{ color: T.text, fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Validity</h3>
            <Select label="TTL Basis" value={form.validity.ttl_basis} onChange={v => setField("validity", "ttl_basis", v)} options={TTL_BASIS} required />
            <Input label="TTL Value (optional)" value={form.validity.ttl_value} onChange={v => setField("validity", "ttl_value", v)} placeholder="e.g. P1Y for 1 year" />
            <Input label="TTL Event (optional)" value={form.validity.ttl_event} onChange={v => setField("validity", "ttl_event", v)} placeholder="Triggering event for expiry" />
            <Input label="Valid From (optional)" value={form.validity.valid_from} onChange={v => setField("validity", "valid_from", v)} placeholder="YYYY-MM-DD" />
            <Input label="Valid Until (optional)" value={form.validity.valid_until} onChange={v => setField("validity", "valid_until", v)} placeholder="YYYY-MM-DD" />
          </div>
        )}

        {/* Step 4: Authority */}
        {step === 4 && (
          <div>
            <h3 style={{ color: T.text, fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Authority</h3>
            <Input label="Authority ID (optional)" value={form.authority.authority_id} onChange={v => setField("authority", "authority_id", v)} placeholder="Auto-assigned if blank" />
            <Input label="Name" value={form.authority.name} onChange={v => setField("authority", "name", v)} placeholder="Name of responsible person or body" required />
            <Input label="Role" value={form.authority.role} onChange={v => setField("authority", "role", v)} placeholder="e.g. Quality Director, Regulatory Affairs" required />
            <Input label="SSO Identity (optional)" value={form.authority.sso_identity} onChange={v => setField("authority", "sso_identity", v)} placeholder="email@org.com" />
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div>
            <h3 style={{ color: T.text, fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Review & Submit</h3>
            {[
              ["Node Type", form.node_type],
              ["Domain", form.domain],
              ["Assertion", form.assertion.what],
              ["Scope", form.assertion.scope],
              ["Provenance Tier", form.provenance.tier],
              ["Source Type", form.provenance.source_type],
              ["Source Reference", form.provenance.source_reference],
              ["TTL Basis", form.validity.ttl_basis],
              ["Authority Name", form.authority.name],
              ["Authority Role", form.authority.role],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
                <span style={{ color: T.textMuted, fontSize: 12, fontWeight: 600, width: 140, flexShrink: 0 }}>{label}</span>
                <span style={{ color: T.text, fontSize: 13 }}>{value || "—"}</span>
              </div>
            ))}
            {error && <p style={{ color: T.red, fontSize: 13, marginTop: 12 }}>{error}</p>}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
          <Btn variant="secondary" onClick={() => step === 0 ? onNavigate("queue") : setStep(s => s - 1)}>
            {step === 0 ? "Cancel" : "Back"}
          </Btn>
          {step < 5 ? (
            <Btn onClick={() => setStep(s => s + 1)}
              disabled={
                (step === 0 && (!form.node_type || !form.domain)) ||
                (step === 1 && (!form.assertion.what || !form.assertion.scope)) ||
                (step === 2 && (!form.provenance.tier || !form.provenance.source_type)) ||
                (step === 3 && !form.validity.ttl_basis) ||
                (step === 4 && (!form.authority.name || !form.authority.role))
              }>
              Next →
            </Btn>
          ) : (
            <Btn onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Node"}
            </Btn>
          )}
        </div>
      </Card>
    </div>
  );
}

// ─── SCREEN 3: BULK UPLOAD ───────────────────────────────────────────────────

function BulkUpload({ token, user, onNavigate }) {
  const [mode, setMode] = useState("document"); // document | csv
  const [file, setFile] = useState(null);
  const [domain, setDomain] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [extractError, setExtractError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [selectedDrafts, setSelectedDrafts] = useState({});

  async function handleExtract() {
    if (!file || !domain) return;
    setExtracting(true);
    setExtractError(null);
    setDrafts([]);
    setSelectedDrafts({});
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("domain", domain);
      fd.append("tenant_id", user?.tenantId || "default");
      const res = await fetch(`${API}/api/v1/knowledge/extract/document`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `API error: ${res.status}`);
      }
      const data = await res.json();
      setDrafts(data.draft_claims || []);
      const sel = {};
      (data.draft_claims || []).forEach((_, i) => { sel[i] = true; });
      setSelectedDrafts(sel);
    } catch (e) {
      setExtractError(e.message);
    } finally {
      setExtracting(false);
    }
  }

  async function handleBulkSubmit() {
    const nodes = drafts
      .filter((_, i) => selectedDrafts[i])
      .map(d => ({ ...d, tenant_id: user?.tenantId || "default" }));
    if (nodes.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const data = await apiFetch("/api/v1/knowledge/submit/bulk", token, {
        method: "POST",
        body: JSON.stringify({ nodes }),
      });
      setSubmitResult(data);
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitResult) {
    return (
      <Card style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: 40 }}>
        <p style={{ fontSize: 32, marginBottom: 12 }}>✓</p>
        <h2 style={{ color: T.green, fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Bulk Submit Complete</h2>
        <p style={{ color: T.text, fontSize: 15, marginBottom: 4 }}>{submitResult.submitted_count} nodes submitted · {submitResult.error_count} errors</p>
        <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 24 }}>All submitted nodes are pending attestation.</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <Btn onClick={() => { setSubmitResult(null); setDrafts([]); setFile(null); }}>Upload Another</Btn>
          <Btn variant="secondary" onClick={() => onNavigate("queue")}>View Queue</Btn>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: T.text, fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Bulk Upload</h1>
        <p style={{ color: T.textMuted, fontSize: 13, margin: 0 }}>Upload a document or CSV. Stage 1 extracts text. Stage 2 uses Claude API to generate draft knowledge claims. Review before submitting.</p>
      </div>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {[["document", "Document Upload (PDF/DOCX)"], ["csv", "CSV Template"]].map(([m, l]) => (
          <button key={m} onClick={() => setMode(m)}
            style={{
              padding: "6px 14px", borderRadius: 4, fontSize: 12, fontWeight: 600,
              cursor: "pointer", border: `1px solid ${mode === m ? T.brand : T.border}`,
              background: mode === m ? "rgba(59,130,246,0.15)" : "transparent",
              color: mode === m ? T.brand : T.textMuted,
            }}>{l}</button>
        ))}
      </div>

      {mode === "document" && (
        <Card style={{ marginBottom: 16 }}>
          <h3 style={{ color: T.text, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Stage 1+2: Document Extraction</h3>
          <Input label="Domain" value={domain} onChange={setDomain} placeholder="e.g. pharma_quality" required />
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 600, textTransform: "uppercase" }}>
              Document <span style={{ color: T.red }}>*</span>
            </label>
            <input type="file" accept=".pdf,.docx,.txt,.csv,.json"
              onChange={e => setFile(e.target.files[0])}
              style={{ color: T.textSub, fontSize: 13 }} />
            {file && <p style={{ color: T.textMuted, fontSize: 11, marginTop: 4 }}>{file.name} · {(file.size / 1024).toFixed(1)} KB</p>}
          </div>
          {extractError && <p style={{ color: T.red, fontSize: 13, marginBottom: 8 }}>{extractError}</p>}
          <Btn onClick={handleExtract} disabled={extracting || !file || !domain}>
            {extracting ? "Extracting claims..." : "Extract Claims (Stage 1+2)"}
          </Btn>
          {extracting && (
            <p style={{ color: T.textMuted, fontSize: 12, marginTop: 8 }}>
              Stage 1: extracting text... Stage 2: Claude API generating knowledge claims... This may take 10-30 seconds.
            </p>
          )}
        </Card>
      )}

      {mode === "csv" && (
        <Card style={{ marginBottom: 16 }}>
          <h3 style={{ color: T.text, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>CSV Template</h3>
          <p style={{ color: T.textMuted, fontSize: 12, marginBottom: 12 }}>
            Download the template, fill in your knowledge claims, then upload for bulk submission.
          </p>
          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, padding: 12, fontFamily: "monospace", fontSize: 11, color: T.textSub, marginBottom: 12 }}>
            node_type,assertion_what,assertion_scope,domain,provenance_tier,source_type,source_reference,authority_name,authority_role,ttl_basis
          </div>
          <Btn variant="secondary" onClick={() => {
            const csv = "node_type,assertion_what,assertion_scope,domain,provenance_tier,source_type,source_reference,authority_name,authority_role,ttl_basis\nPOLICY,Example assertion,Example scope,pharma_quality,T1,REGULATORY,https://example.com,Quality Director,QD,CALENDAR";
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "kuriom-node-template.csv"; a.click();
            URL.revokeObjectURL(url);
          }}>Download Template</Btn>
        </Card>
      )}

      {/* Draft claims review */}
      {drafts.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ color: T.text, fontSize: 15, fontWeight: 600, margin: 0 }}>
              {drafts.length} claims extracted -- review before submitting
            </h3>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="secondary" style={{ fontSize: 11 }} onClick={() => {
                const all = {};
                drafts.forEach((_, i) => { all[i] = true; });
                setSelectedDrafts(all);
              }}>Select All</Btn>
              <Btn variant="secondary" style={{ fontSize: 11 }} onClick={() => setSelectedDrafts({})}>Deselect All</Btn>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {drafts.map((draft, i) => (
              <Card key={i} style={{ borderColor: selectedDrafts[i] ? T.brand : T.border }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <input type="checkbox" checked={!!selectedDrafts[i]}
                    onChange={e => setSelectedDrafts(prev => ({ ...prev, [i]: e.target.checked }))}
                    style={{ marginTop: 3, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <Badge label={draft.node_type || "UNKNOWN"} color="blue" />
                      <Badge label={draft.provenance?.tier || "T1"} color="purple" />
                    </div>
                    <p style={{ color: T.text, fontSize: 13, fontWeight: 500, margin: "0 0 4px" }}>{draft.assertion?.what || "—"}</p>
                    <p style={{ color: T.textSub, fontSize: 12, margin: "0 0 4px" }}>{draft.assertion?.scope || ""}</p>
                    {draft.extraction_note && (
                      <p style={{ color: T.textMuted, fontSize: 11, fontStyle: "italic", margin: 0 }}>{draft.extraction_note}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {submitError && <p style={{ color: T.red, fontSize: 13, marginBottom: 8 }}>{submitError}</p>}
          <Btn
            onClick={handleBulkSubmit}
            disabled={submitting || Object.values(selectedDrafts).filter(Boolean).length === 0}>
            {submitting ? "Submitting..." : `Submit ${Object.values(selectedDrafts).filter(Boolean).length} Selected Nodes`}
          </Btn>
        </div>
      )}
    </div>
  );
}

// ─── SCREEN 4: ATTESTATION INBOX ────────────────────────────────────────────

const FIVE_EL_KEYS = FIVE_ELEMENTS.map(e => e.key);

function AttestationInbox({ token, user, onNavigate }) {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [scope, setScope] = useState(null);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [elements, setElements] = useState({});
  const [disposition, setDisposition] = useState("APPROVE");
  const [notes, setNotes] = useState("");
  const [attesting, setAttesting] = useState(false);
  const [attestError, setAttestError] = useState(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/v1/knowledge/candidates?status=PENDING_ATTESTATION", token);
      const data2 = await apiFetch("/api/v1/knowledge/candidates?status=PENDING_SECOND_ATTESTATION", token);
      setNodes([...(data.candidates || []), ...(data2.candidates || [])]);
    } catch (e) {} finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function openAttest(node) {
    setSelected(node);
    setScope(null);
    setElements({});
    setDisposition("APPROVE");
    setNotes("");
    setAttestError(null);
    setScopeLoading(true);
    try {
      const data = await apiFetch(`/api/v1/knowledge/attest/${node.candidate_node_id}/consent-scope`, token);
      setScope(data);
    } catch (e) {} finally { setScopeLoading(false); }
  }

  async function handleAttest() {
    setAttesting(true);
    setAttestError(null);
    try {
      await apiFetch("/api/v1/knowledge/attest", token, {
        method: "POST",
        body: JSON.stringify({
          candidate_node_id: selected.candidate_node_id,
          disposition,
          elements_confirmed: disposition === "APPROVE" ? elements : {},
          notes: notes.trim() || undefined,
          attester_id: user?.email || "unknown",
        }),
      });
      setSelected(null);
      fetch_();
    } catch (e) {
      setAttestError(e.message);
    } finally {
      setAttesting(false);
    }
  }

  const allElementsConfirmed = FIVE_EL_KEYS.every(k => elements[k]);

  return (
    <div style={{ display: "flex", gap: 20, height: "100%" }}>
      {/* Inbox list */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h1 style={{ color: T.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Attestation Inbox</h1>
          <Btn variant="secondary" onClick={fetch_}>Refresh</Btn>
        </div>
        {loading ? (
          <p style={{ color: T.textMuted, fontSize: 13 }}>Loading...</p>
        ) : nodes.length === 0 ? (
          <Card style={{ textAlign: "center", padding: 48 }}>
            <p style={{ color: T.green, fontSize: 24, marginBottom: 8 }}>✓</p>
            <p style={{ color: T.textMuted, fontSize: 13 }}>No nodes pending attestation.</p>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {nodes.map(n => (
              <Card key={n.candidate_node_id}
                style={{ cursor: "pointer", borderColor: selected?.candidate_node_id === n.candidate_node_id ? T.brand : T.border }}
                onClick={() => openAttest(n)}>
                <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <Badge label={n.node_type} color="blue" />
                  <Badge label={n.status?.replace(/_/g, " ")} color="yellow" />
                  <span style={{ color: T.textMuted, fontSize: 12 }}>{n.domain}</span>
                </div>
                <p style={{ color: T.text, fontSize: 13, fontWeight: 500, margin: "0 0 4px" }}>{n.assertion_what || "—"}</p>
                <p style={{ color: T.textSub, fontSize: 12, margin: 0 }}>{n.authority_name} · {n.submitted_by}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Review panel */}
      {selected && (
        <div style={{ width: 420, flexShrink: 0 }}>
          <Card style={{ position: "sticky", top: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ color: T.text, fontSize: 14, fontWeight: 700, margin: 0 }}>Attestation Review</h3>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>

            {scopeLoading ? (
              <p style={{ color: T.textMuted, fontSize: 13 }}>Loading consent scope...</p>
            ) : (
              <>
                {scope?.scope_presented && (
                  <div style={{ background: T.bg, borderRadius: 6, padding: 12, marginBottom: 12 }}>
                    <p style={{ color: T.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>What you are attesting</p>
                    <p style={{ color: T.text, fontSize: 13, margin: 0 }}>{scope.scope_presented}</p>
                  </div>
                )}

                {scope?.conflicting_nodes?.length > 0 && (
                  <div style={{ background: "rgba(245,158,11,0.1)", border: `1px solid rgba(245,158,11,0.3)`, borderRadius: 6, padding: 12, marginBottom: 12 }}>
                    <p style={{ color: T.amber, fontSize: 11, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>
                      ⚠ {scope.conflicting_nodes.length} conflicting node{scope.conflicting_nodes.length !== 1 ? "s" : ""}
                    </p>
                    {scope.conflicting_nodes.map((n, i) => (
                      <p key={i} style={{ color: T.amber, fontSize: 12, fontFamily: "monospace", margin: "2px 0" }}>{n.node_id || n}</p>
                    ))}
                  </div>
                )}

                {/* Five elements */}
                <p style={{ color: T.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Five Governance Elements</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                  {FIVE_ELEMENTS.map(el => (
                    <label key={el.key} style={{
                      display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer",
                      padding: "8px 10px", borderRadius: 6,
                      background: elements[el.key] ? "rgba(16,185,129,0.1)" : T.bg,
                      border: `1px solid ${elements[el.key] ? T.green : T.border}`,
                    }}>
                      <input type="checkbox" checked={!!elements[el.key]}
                        onChange={e => setElements(prev => ({ ...prev, [el.key]: e.target.checked }))}
                        style={{ marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <p style={{ color: T.text, fontSize: 12, fontWeight: 600, margin: "0 0 2px" }}>{el.label}</p>
                        <p style={{ color: T.textMuted, fontSize: 11, margin: 0 }}>{el.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <Textarea label="Notes (optional)" value={notes} onChange={setNotes} rows={2} />

                {/* Disposition */}
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {["APPROVE", "REJECT"].map(d => (
                    <button key={d} onClick={() => setDisposition(d)}
                      style={{
                        flex: 1, padding: "8px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                        cursor: "pointer",
                        border: `2px solid ${disposition === d ? (d === "APPROVE" ? T.green : T.red) : T.border}`,
                        background: disposition === d ? (d === "APPROVE" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)") : "transparent",
                        color: disposition === d ? (d === "APPROVE" ? T.green : T.red) : T.textMuted,
                      }}>{d}</button>
                  ))}
                </div>

                {disposition === "APPROVE" && !allElementsConfirmed && (
                  <p style={{ color: T.amber, fontSize: 12, marginBottom: 8 }}>Confirm all five governance elements before approving.</p>
                )}

                {attestError && <p style={{ color: T.red, fontSize: 13, marginBottom: 8 }}>{attestError}</p>}

                <Btn onClick={handleAttest} disabled={attesting || (disposition === "APPROVE" && !allElementsConfirmed)} style={{ width: "100%" }}>
                  {attesting ? "Recording..." : "Record Attestation"}
                </Btn>
                <p style={{ color: T.textMuted, fontSize: 11, fontStyle: "italic", marginTop: 8, textAlign: "center" }}>
                  Written to KGIF immutable ledger. Your session identity is bound to this record.
                </p>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── SCREEN 5: PROMOTION QUEUE ───────────────────────────────────────────────

function PromotionQueue({ token, user, onNavigate }) {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState({});
  const [results, setResults] = useState({});
  const [error, setError] = useState(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/v1/knowledge/candidates?status=IN_LEARNING_PERIOD", token);
      setNodes(data.candidates || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function handlePromote(node) {
    setPromoting(p => ({ ...p, [node.candidate_node_id]: true }));
    try {
      const data = await apiFetch("/api/v1/knowledge/promote", token, {
        method: "POST",
        body: JSON.stringify({
          candidate_node_id: node.candidate_node_id,
          promoted_by: user?.email || "unknown",
          tenant_id: user?.tenantId || "default",
        }),
      });
      setResults(r => ({ ...r, [node.candidate_node_id]: data }));
      setNodes(prev => prev.filter(n => n.candidate_node_id !== node.candidate_node_id));
    } catch (e) {
      setResults(r => ({ ...r, [node.candidate_node_id]: { error: e.message } }));
    } finally {
      setPromoting(p => ({ ...p, [node.candidate_node_id]: false }));
    }
  }

  const promotedCount = Object.values(results).filter(r => r.node_id && !r.error).length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ color: T.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Promotion Queue</h1>
          <p style={{ color: T.textMuted, fontSize: 13, marginTop: 4 }}>
            Attested nodes in the learning period ready for promotion to the live gate knowledge base.
          </p>
        </div>
        <Btn variant="secondary" onClick={fetch_}>Refresh</Btn>
      </div>

      {promotedCount > 0 && (
        <Card style={{ marginBottom: 16, borderColor: T.green }}>
          <p style={{ color: T.green, fontSize: 14, fontWeight: 600, margin: 0 }}>
            ✓ {promotedCount} node{promotedCount !== 1 ? "s" : ""} promoted to live gate this session
          </p>
        </Card>
      )}

      {loading ? (
        <p style={{ color: T.textMuted, fontSize: 13 }}>Loading...</p>
      ) : error ? (
        <p style={{ color: T.red, fontSize: 13 }}>{error}</p>
      ) : nodes.length === 0 && promotedCount === 0 ? (
        <Card style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: T.textMuted, fontSize: 13 }}>No nodes in learning period. Attested nodes will appear here once ready for promotion.</p>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {nodes.map(n => {
            const isPromoting = promoting[n.candidate_node_id];
            const result = results[n.candidate_node_id];
            return (
              <Card key={n.candidate_node_id}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <Badge label={n.node_type} color="blue" />
                      <Badge label="In Learning Period" color="blue" />
                      <span style={{ color: T.textMuted, fontSize: 12 }}>{n.domain}</span>
                    </div>
                    <p style={{ color: T.text, fontSize: 14, fontWeight: 500, margin: "0 0 4px" }}>{n.assertion_what || "—"}</p>
                    <p style={{ color: T.textSub, fontSize: 12, margin: "0 0 4px" }}>{n.assertion_scope || ""}</p>
                    <p style={{ color: T.textMuted, fontSize: 12, margin: 0 }}>{n.authority_name} · attested by {n.submitted_by}</p>
                    {result?.error && <p style={{ color: T.red, fontSize: 12, marginTop: 4 }}>{result.error}</p>}
                    {result?.node_id && (
                      <p style={{ color: T.green, fontSize: 12, marginTop: 4 }}>✓ Promoted to gate -- node_id: {result.node_id}</p>
                    )}
                  </div>
                  {user?.role === "governance_admin" && !result && (
                    <Btn onClick={() => handlePromote(n)} disabled={isPromoting} variant="success">
                      {isPromoting ? "Promoting..." : "Promote to Gate"}
                    </Btn>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <p style={{ color: T.textMuted, fontSize: 12 }}>
          Promotion writes a gate-compatible KnowledgeNode to Neo4j and seals a CANDIDATE_NODE_PROMOTED event in the KGIF immutable ledger. The promoted node is immediately evaluated by the gate on the next sequence submission.
        </p>
      </div>
    </div>
  );
}

// ─── LAYOUT ──────────────────────────────────────────────────────────────────

const NAV_ADMIN = [
  { key: "queue",     label: "Node Queue",         icon: "◉" },
  { key: "submit",    label: "Submit Node",         icon: "⟶" },
  { key: "bulk",      label: "Bulk Upload",         icon: "⬆" },
  { key: "attest",    label: "Attestation Inbox",   icon: "◈" },
  { key: "promote",   label: "Promotion Queue",     icon: "▲" },
];

const NAV_ATTESTER = [
  { key: "attest",    label: "Attestation Inbox",   icon: "◈" },
  { key: "queue",     label: "Node Queue",          icon: "◉" },
];

function Sidebar({ user, screen, onNavigate, onSignOut }) {
  const nav = user?.role === "governance_admin" ? NAV_ADMIN : NAV_ATTESTER;
  return (
    <aside style={{
      width: 200, flexShrink: 0, background: T.bgSidebar,
      borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column",
      minHeight: "100vh",
    }}>
      <div style={{ padding: "20px 16px 16px", borderBottom: `1px solid ${T.border}` }}>
        <p style={{ color: T.text, fontWeight: 700, fontSize: 14, margin: 0 }}>KURIOM</p>
        <p style={{ color: T.textMuted, fontSize: 11, marginTop: 2 }}>Onboarding Portal</p>
      </div>
      <nav style={{ flex: 1, padding: "12px 8px" }}>
        {nav.map(item => (
          <button key={item.key} onClick={() => onNavigate(item.key)}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "8px 12px", borderRadius: 6, marginBottom: 2,
              background: screen === item.key ? "rgba(59,130,246,0.2)" : "transparent",
              color: screen === item.key ? T.brand : T.textMuted,
              border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
              textAlign: "left",
            }}>
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}` }}>
        <p style={{ color: T.textMuted, fontSize: 11, marginBottom: 4 }}>{user?.email}</p>
        <p style={{ color: T.textMuted, fontSize: 10, marginBottom: 8 }}>{user?.role}</p>
        <button onClick={onSignOut}
          style={{ background: "none", border: "none", color: T.textMuted, fontSize: 11, cursor: "pointer", padding: 0 }}>
          Sign out
        </button>
        <p style={{ color: T.border, fontSize: 10, marginTop: 12 }}>Patent Pending</p>
        <p style={{ color: T.border, fontSize: 10 }}>64/008,411 et al.</p>
      </div>
    </aside>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────

function OnboardApp() {
  const { user, token, signOut } = useAuth();
  const [screen, setScreen] = useState("queue");
  const [screenData, setScreenData] = useState(null);

  function handleNavigate(s, data = null) {
    setScreen(s);
    setScreenData(data);
  }

  const props = { token, user, onNavigate: handleNavigate };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <Sidebar user={user} screen={screen} onNavigate={handleNavigate} onSignOut={signOut} />
      <main style={{ flex: 1, padding: 32, overflow: "auto" }}>
        {screen === "queue"   && <NodeQueue {...props} />}
        {screen === "submit"  && <NodeSubmitForm {...props} />}
        {screen === "bulk"    && <BulkUpload {...props} />}
        {screen === "attest"  && <AttestationInbox {...props} />}
        {screen === "promote" && <PromotionQueue {...props} />}
      </main>
    </div>
  );
}

export default function App() {
  document.title = "Kuriom — Onboarding Portal";
  return (
    <AuthProvider>
      <RequireAuth>
        <OnboardApp />
      </RequireAuth>
    </AuthProvider>
  );
}
