import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { RiCloseLine, RiRefreshLine, RiSearchLine } from "react-icons/ri";
import config from "../../config";
import "./style.scss";

const backendUrl = config.backend_url;
const authHeaders = () => ({ Authorization: localStorage.getItem("authToken") || "" });
const currentMonth = () => new Date().toISOString().slice(0, 7);
const money = (value) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value) || 0);
const valueLabel = (value) => `₹${money(value)}`;
const dateTime = (value) => value ? new Date(value).toLocaleString("en-IN") : "-";

function Snapshot({ open, onClose }) {
  if (!open) return null;
  const fields = ["dealer", "brand", "priduct_name", "product_code", "price", "quantity", "amount", "segment", "product_category", "uploaded_by", "createdAt"];
  return <div className="xlog-backdrop" onMouseDown={onClose}><section className="xlog-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><h2>Change snapshot</h2><p>{open.action.toUpperCase()} · {dateTime(open.createdAt)}</p></div><button title="Close" onClick={onClose}><RiCloseLine /></button></header><div className="xlog-snapshot"><div className="xlog-snapshot-head"><strong>Field</strong><strong>Previous entry</strong><strong>Changed entry</strong></div>{fields.map((field) => <div className={String(open.before?.[field] ?? "") !== String(open.after?.[field] ?? "") ? "changed" : ""} key={field}><span>{field.replaceAll("_", " ")}</span><code>{String(open.before?.[field] ?? "-")}</code><code>{String(open.after?.[field] ?? "-")}</code></div>)}</div><footer><strong>Reason</strong><span>{open.reason}</span><strong>Changed by</strong><span>{open.actor?.name || "Unknown"} ({open.actor?.code || "-"})</span></footer></section></div>;
}

export default function ExtractionLogs() {
  const [filters, setFilters] = useState({ month: currentMonth(), action: "", dealer: "", actor: "", search: "" });
  const [applied, setApplied] = useState(filters);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState(null);

  const loadLogs = useCallback(async (page = 1) => {
    setLoading(true); setError("");
    try {
      const response = await axios.post(`${backendUrl}/admin/extraction-editor/logs`, { ...applied, page, limit: 50 }, { headers: authHeaders() });
      setLogs(response.data.logs || []); setPagination(response.data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (requestError) { setError(requestError?.response?.data?.message || requestError.message); }
    finally { setLoading(false); }
  }, [applied]);

  useEffect(() => { loadLogs(1); }, [loadLogs]);
  const record = (item) => item.after || item.before || {};

  return <main className="xlog-page"><header className="xlog-title"><div><span>Data Tools</span><h1>Extraction Logs</h1><p>Audited history of every extraction row added, updated, or deleted through the Data Editor.</p></div><button title="Refresh" onClick={() => loadLogs(pagination.page)}><RiRefreshLine /></button></header><form className="xlog-filters" onSubmit={(event) => { event.preventDefault(); setApplied({ ...filters }); }}><label><span>Month</span><input type="month" value={filters.month} onChange={(event) => setFilters({ ...filters, month: event.target.value })} /></label><label><span>Action</span><select value={filters.action} onChange={(event) => setFilters({ ...filters, action: event.target.value })}><option value="">All actions</option><option value="create">Created</option><option value="update">Updated</option><option value="delete">Deleted</option></select></label><label><span>Dealer code</span><input value={filters.dealer} onChange={(event) => setFilters({ ...filters, dealer: event.target.value })} placeholder="Exact dealer code" /></label><label><span>Changed by</span><input value={filters.actor} onChange={(event) => setFilters({ ...filters, actor: event.target.value })} placeholder="User code" /></label><label className="xlog-search"><span>Search</span><div><RiSearchLine /><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Dealer, product, reason, user" /></div></label><button>Apply</button></form>{error && <div className="xlog-error">{error}</div>}<section className="xlog-table-card"><header><div><h2>Change history</h2><p>Deleted rows remain available here as immutable snapshots.</p></div><span>{pagination.total || 0} logs</span></header><div className="xlog-table-wrap"><table><thead><tr><th>Action</th><th>Dealer</th><th>Product</th><th>Before</th><th>After</th><th>Changed by</th><th>When</th><th>Reason</th><th>Details</th></tr></thead><tbody>{loading ? <tr><td colSpan="9" className="xlog-empty">Loading extraction logs...</td></tr> : logs.length ? logs.map((item) => { const row = record(item); return <tr key={item._id}><td><span className={`xlog-action ${item.action}`}>{item.action}</span></td><td><strong>{row.dealer || "-"}</strong></td><td><strong>{row.priduct_name || row.product_name || row.product_code || "-"}</strong><small>{row.brand || "-"} · {row.product_code || "-"}</small></td><td>{item.before ? <><strong>{valueLabel(item.before.amount)}</strong><small>Qty {item.before.quantity ?? "-"}</small></> : "-"}</td><td>{item.after ? <><strong>{valueLabel(item.after.amount)}</strong><small>Qty {item.after.quantity ?? "-"}</small></> : "-"}</td><td><strong>{item.actor?.name || "Unknown"}</strong><small>{item.actor?.code || "-"}</small></td><td>{dateTime(item.createdAt)}</td><td className="xlog-reason">{item.reason}</td><td><button className="xlog-details" onClick={() => setSnapshot(item)}>View</button></td></tr>; }) : <tr><td colSpan="9" className="xlog-empty">No logs match these filters.</td></tr>}</tbody></table></div><footer className="xlog-pagination"><button disabled={pagination.page <= 1} onClick={() => loadLogs(pagination.page - 1)}>Previous</button><span>Page {pagination.page || 1} of {pagination.pages || 1}</span><button disabled={pagination.page >= pagination.pages} onClick={() => loadLogs(pagination.page + 1)}>Next</button></footer></section><Snapshot open={snapshot} onClose={() => setSnapshot(null)} /></main>;
}
