import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  RiAddLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiEdit2Line,
  RiFilter3Line,
  RiRefreshLine,
  RiSearchLine,
  RiShieldCheckLine,
} from "react-icons/ri";
import config from "../../config";
import "./style.scss";

const backendUrl = config.backend_url;
const FLOW_NAME = "default_sales_flow";
const FILTERS = [
  ["smd", "SMD", "subordinate"],
  ["zsm", "ZSM", "subordinate"],
  ["asm", "ASM", "subordinate"],
  ["so", "SO", "subordinate"],
  ["mdd", "MDD", "subordinate"],
  ["tse", "TSE", "subordinate"],
  ["code", "Dealer", "subordinate"],
  ["zone", "Zone", "dealer"],
  ["district", "District", "dealer"],
  ["taluka", "Taluka", "dealer"],
  ["town", "Town", "dealer"],
  ["category", "Category", "dealer"],
  ["labels", "Label", "dealer"],
];

const currentMonth = () => new Date().toISOString().slice(0, 7);
const authHeaders = () => ({ Authorization: localStorage.getItem("authToken") || "" });
const money = (value) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value) || 0);
const valueLabel = (value) => `₹${money(value)}`;
const dateTime = (value) => (value ? new Date(value).toLocaleString("en-IN") : "-");
const errorMessage = (error) => error?.response?.data?.message || error?.message || "Something went wrong";

function Modal({ open, title, subtitle, onClose, wide = false, children }) {
  if (!open) return null;
  return (
    <div className="ede-modal-backdrop" onMouseDown={onClose}>
      <section className={`ede-modal ${wide ? "ede-modal-wide" : ""}`} onMouseDown={(event) => event.stopPropagation()}>
        <header className="ede-modal-header">
          <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button className="ede-icon-button" onClick={onClose} title="Close"><RiCloseLine /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

function DealerPicker({ value, dealers, onChange, onSearch }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = dealers.find((dealer) => dealer.code === value);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => onSearch(query), 250);
    return () => window.clearTimeout(timer);
  }, [open, query, onSearch]);

  return (
    <div className="ede-picker">
      <button type="button" className={`ede-picker-trigger ${open ? "open" : ""}`} onClick={() => setOpen((old) => !old)}>
        <span>{selected ? `${selected.name} (${selected.code})` : value || "Select dealer"}</span>
        <span className="ede-picker-chevron">⌄</span>
      </button>
      {open && (
        <div className="ede-picker-popup">
          <div className="ede-picker-search"><RiSearchLine /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search dealer name or code" /></div>
          <div className="ede-picker-list">
            {dealers.length ? dealers.map((dealer) => (
              <button type="button" key={dealer.code} className={dealer.code === value ? "selected" : ""} onClick={() => { onChange(dealer.code); setOpen(false); setQuery(""); }}>
                <span>{dealer.name || "Unnamed dealer"}</span><small>{dealer.code}{dealer.town ? ` · ${dealer.town}` : ""}</small>
              </button>
            )) : <div className="ede-picker-empty">No dealers found</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function EntryForm({ mode, initial, dealers, products, loadingProducts, onDealerSearch, onProductSearch, onCancel, onSubmit, saving }) {
  const [form, setForm] = useState(() => ({
    dealer: initial?.dealer || "",
    brand: initial?.brand || "",
    product_code: initial?.product_code || "",
    price: initial?.price ?? "",
    quantity: initial?.quantity ?? 1,
    record_date: initial?.createdAt ? new Date(initial.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    reason: "",
    expected_updated_at: initial?.updatedAt,
  }));
  const amount = (Number(form.price) || 0) * (Number(form.quantity) || 0);

  const selectProduct = (code) => {
    const product = products.find((item) => (item.product_code || item.model_code) === code);
    setForm((old) => ({ ...old, product_code: code, brand: product?.brand || old.brand, price: product?.price ?? old.price }));
  };

  return (
    <form className="ede-form" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
      <div className="ede-field ede-span-2">
        <label>Dealer</label>
        <DealerPicker value={form.dealer} dealers={dealers} onSearch={onDealerSearch} onChange={(dealer) => setForm({ ...form, dealer })} />
      </div>
      <div className="ede-field ede-span-2">
        <label>Product</label>
        <input placeholder="Search product name or code" onChange={(event) => onProductSearch(event.target.value, form.brand)} />
        <select required value={form.product_code} onChange={(event) => selectProduct(event.target.value)}>
          <option value="">{loadingProducts ? "Loading products..." : "Select product"}</option>
          {products.map((product) => {
            const code = product.product_code || product.model_code;
            return <option key={product._id} value={code}>{product.product_name} · {code} · {product.brand}</option>;
          })}
        </select>
      </div>
      <div className="ede-field"><label>Brand</label><input value={form.brand} readOnly /></div>
      <div className="ede-field"><label>Record date</label><input type="date" required value={form.record_date} onChange={(event) => setForm({ ...form, record_date: event.target.value })} /></div>
      <div className="ede-field"><label>Price</label><input type="number" min="0" step="0.01" required value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></div>
      <div className="ede-field"><label>Quantity</label><input type="number" min="1" step="1" required value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></div>
      <div className="ede-field"><label>Calculated amount</label><input value={valueLabel(amount)} readOnly /></div>
      <div className="ede-field ede-span-2"><label>Reason for {mode === "edit" ? "change" : "adding this row"}</label><textarea required rows="3" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Required for the audit trail" /></div>
      <footer className="ede-form-actions ede-span-2"><button type="button" className="ede-button secondary" onClick={onCancel}>Cancel</button><button className="ede-button primary" disabled={saving || !form.dealer}>{saving ? "Saving..." : mode === "edit" ? "Save changes" : "Add entry"}</button></footer>
    </form>
  );
}

export default function ExtractionDataEditor() {
  const [month, setMonth] = useState(currentMonth());
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [brands, setBrands] = useState([]);
  const [totals, setTotals] = useState({ dealers: 0, value: 0, quantity: 0, records: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [filterOptions, setFilterOptions] = useState({});
  const [loadingFilter, setLoadingFilter] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailRows, setDetailRows] = useState([]);
  const [detailColumns, setDetailColumns] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [entry, setEntry] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [dealers, setDealers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const splitFilters = useMemo(() => {
    const subordinate_filters = {};
    const dealer_filters = {};
    FILTERS.forEach(([key, , type]) => {
      if (filters[key]?.length) (type === "subordinate" ? subordinate_filters : dealer_filters)[key] = filters[key];
    });
    return { subordinate_filters, dealer_filters };
  }, [filters]);

  const loadSummary = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const response = await axios.post(`${backendUrl}/admin/extraction-editor/summary`, { month, search: appliedSearch, page, limit: 50, ...splitFilters }, { headers: authHeaders() });
      setRows(response.data.rows || []);
      setBrands(response.data.brands || []);
      setTotals(response.data.totals || {});
      setPagination(response.data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) { setMessage({ type: "error", text: errorMessage(error) }); }
    finally { setLoading(false); }
  }, [month, appliedSearch, splitFilters]);

  useEffect(() => { loadSummary(1); }, [loadSummary]);

  const loadFilterOptions = async (key, type) => {
    setLoadingFilter(key);
    try {
      const response = await axios.post(`${backendUrl}/filters/dropdown-options`, {
        flow_name: FLOW_NAME,
        target_type: type,
        target_key: key === "code" ? "dealer" : key,
        subordinates: splitFilters.subordinate_filters,
        dealer: splitFilters.dealer_filters,
        product_tags: {},
      }, { headers: authHeaders() });
      setFilterOptions((old) => ({ ...old, [key]: response.data?.values || [] }));
    } catch (error) { setMessage({ type: "error", text: errorMessage(error) }); }
    finally { setLoadingFilter(""); }
  };

  const loadDetails = async (target = detail) => {
    if (!target) return;
    setDetailLoading(true);
    try {
      const response = await axios.post(`${backendUrl}/admin/extraction-editor/rows`, { month, dealer: target.dealerCode, brand: target.brand, page: 1, limit: 200 }, { headers: authHeaders() });
      setDetailRows(response.data.rows || []);
      setDetailColumns(response.data.columns || []);
    } catch (error) { setMessage({ type: "error", text: errorMessage(error) }); }
    finally { setDetailLoading(false); }
  };

  const openDetails = (row, brand) => { const target = { ...row, brand }; setDetail(target); setDetailRows([]); setTimeout(() => loadDetails(target), 0); };
  const searchDealers = useCallback(async (query = "") => {
    try {
      const response = await axios.get(`${backendUrl}/admin/extraction-editor/dealers`, { params: { search: query }, headers: authHeaders() });
      setDealers(response.data.dealers || []);
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
  }, []);
  const searchProducts = async (query = "", brand = "") => { setLoadingProducts(true); try { const response = await axios.get(`${backendUrl}/admin/extraction-editor/products`, { params: { search: query, brand }, headers: authHeaders() }); setProducts(response.data.products || []); } finally { setLoadingProducts(false); } };
  const openEntry = async (row = null) => { setEntry(row ? { mode: "edit", row } : { mode: "create", row: null }); await Promise.all([searchDealers(row?.dealer || ""), searchProducts(row?.product_code || "", row?.brand || "")]); };

  const submitEntry = async (form) => {
    setSaving(true);
    try {
      if (entry.mode === "edit") await axios.patch(`${backendUrl}/admin/extraction-editor/rows/${entry.row._id}`, form, { headers: authHeaders() });
      else await axios.post(`${backendUrl}/admin/extraction-editor/rows/create`, form, { headers: authHeaders() });
      setMessage({ type: "success", text: entry.mode === "edit" ? "Row updated and audited." : "Row added and audited." });
      setEntry(null);
      await loadSummary(pagination.page);
      if (detail) await loadDetails(detail);
    } catch (error) { setMessage({ type: "error", text: errorMessage(error) }); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteReason.trim()) return;
    setSaving(true);
    try {
      await axios.delete(`${backendUrl}/admin/extraction-editor/rows/${deleteRow._id}`, { headers: authHeaders(), data: { reason: deleteReason, expected_updated_at: deleteRow.updatedAt } });
      setDeleteRow(null); setDeleteReason("");
      setMessage({ type: "success", text: "Row deleted. A complete audit snapshot was retained." });
      await loadSummary(pagination.page);
      if (detail) await loadDetails(detail);
    } catch (error) { setMessage({ type: "error", text: errorMessage(error) }); }
    finally { setSaving(false); }
  };

  const openHistory = async (row) => {
    setHistory({ row, items: [] });
    setHistoryLoading(true);
    try {
      const response = await axios.get(`${backendUrl}/admin/extraction-editor/rows/${row._id}/history`, { headers: authHeaders() });
      setHistory({ row, items: response.data.history || [] });
    } catch (error) { setMessage({ type: "error", text: errorMessage(error) }); }
    finally { setHistoryLoading(false); }
  };

  const renderDetailCell = (row, column) => {
    if (column === "audit") {
      const audit = row.audit || {};
      return <button className="ede-history-button" onClick={() => openHistory(row)}>{audit.editCount || 0} edits{audit.lastEditedAt ? <small>Last {dateTime(audit.lastEditedAt)}</small> : <small>View history</small>}</button>;
    }
    if (column.toLowerCase().includes("date") || column.endsWith("At")) return dateTime(row[column]);
    if (["price", "amount"].includes(column)) return valueLabel(row[column]);
    return String(row[column] ?? "-");
  };

  return (
    <main className="ede-page">
      <header className="ede-page-header"><div><span className="ede-eyebrow">Data Tools</span><h1>Extraction Data Editor</h1><p>Review dealer totals, inspect source rows, and make audited corrections.</p></div><button className="ede-button primary" onClick={() => openEntry()}><RiAddLine /> Add entry</button></header>
      <div className="ede-warning"><RiShieldCheckLine /><div><strong>Raw reporting data</strong><span>Edits and deletions immediately affect extraction reports. Every change requires a reason and is preserved in the audit trail.</span></div></div>
      {message && <div className={`ede-message ${message.type}`}><span>{message.text}</span><button onClick={() => setMessage(null)}><RiCloseLine /></button></div>}
      <section className="ede-toolbar">
        <label className="ede-control"><span>Month</span><input type="month" value={month} onChange={(event) => { setMonth(event.target.value); setDetail(null); }} /></label>
        <form className="ede-search" onSubmit={(event) => { event.preventDefault(); setAppliedSearch(search.trim()); }}><RiSearchLine /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dealer name or code" /><button>Search</button></form>
        <button className="ede-button secondary" onClick={() => setFilterOpen(true)}><RiFilter3Line /> Filters {Object.values(filters).flat().length ? `(${Object.values(filters).flat().length})` : ""}</button>
        <button className="ede-icon-button bordered" title="Refresh" onClick={() => loadSummary(pagination.page)}><RiRefreshLine /></button>
      </section>
      <section className="ede-stats"><div><span>Dealers</span><strong>{totals.dealers || 0}</strong></div><div><span>Total value</span><strong>{valueLabel(totals.value)}</strong></div><div><span>Quantity</span><strong>{money(totals.quantity)}</strong></div><div><span>Raw rows</span><strong>{money(totals.records)}</strong></div></section>
      <section className="ede-table-section"><div className="ede-section-heading"><div><h2>Dealer brand summary</h2><p>Select a brand value to inspect its raw rows.</p></div><span>{pagination.total || 0} dealers</span></div><div className="ede-table-wrap"><table className="ede-table"><thead><tr><th className="sticky">Dealer</th><th>Total value</th><th>Qty</th><th>Rows</th>{brands.map((brand) => <th key={brand}>{brand}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={4 + brands.length} className="ede-empty">Loading dealer summaries...</td></tr> : rows.length ? rows.map((row) => <tr key={row.dealerCode}><td className="sticky"><strong>{row.dealerName}</strong><span>{row.dealerCode}</span></td><td><strong>{valueLabel(row.totalValue)}</strong></td><td>{money(row.totalQuantity)}</td><td>{money(row.recordCount)}</td>{brands.map((brand) => <td key={brand}>{row.brands[brand] ? <button className="ede-value-button" onClick={() => openDetails(row, brand)}>{valueLabel(row.brands[brand].value)}<small>Volume {money(row.brands[brand].quantity)} · {row.brands[brand].records} rows</small></button> : <span className="ede-muted">-</span>}</td>)}</tr>) : <tr><td colSpan={4 + brands.length} className="ede-empty">No extraction rows match this month and filter set.</td></tr>}</tbody></table></div><footer className="ede-pagination"><button disabled={pagination.page <= 1} onClick={() => loadSummary(pagination.page - 1)}>Previous</button><span>Page {pagination.page || 1} of {pagination.pages || 1}</span><button disabled={pagination.page >= pagination.pages} onClick={() => loadSummary(pagination.page + 1)}>Next</button></footer></section>

      <Modal open={filterOpen} title="Hierarchy filters" subtitle="Filters apply to the dealer summary and all brand values." onClose={() => setFilterOpen(false)} wide><div className="ede-filter-grid">{FILTERS.map(([key, label, type]) => <label className="ede-field" key={key}><span>{label}</span><select multiple value={filters[key] || []} onFocus={() => !filterOptions[key] && loadFilterOptions(key, type)} onChange={(event) => setFilters((old) => ({ ...old, [key]: [...event.target.selectedOptions].map((option) => option.value) }))}>{loadingFilter === key && <option>Loading...</option>}{(filterOptions[key] || []).map((option) => { const value = typeof option === "object" ? option.value ?? option.code : option; const text = typeof option === "object" ? option.label ?? option.name ?? value : option; return <option value={value} key={value}>{text}</option>; })}</select></label>)}</div><footer className="ede-modal-footer"><button className="ede-button secondary" onClick={() => setFilters({})}>Clear all</button><button className="ede-button primary" onClick={() => setFilterOpen(false)}>Apply filters</button></footer></Modal>

      <Modal open={!!detail} title={`${detail?.dealerName || ""} · ${detail?.brand || ""}`} subtitle={`${detail?.dealerCode || ""} · ${month} · raw extraction rows`} onClose={() => setDetail(null)} wide><div className="ede-detail-actions"><span>{detailRows.length} rows loaded</span><button className="ede-button secondary" onClick={() => loadDetails()}><RiRefreshLine /> Refresh</button></div><div className="ede-table-wrap ede-detail-table"><table className="ede-table"><thead><tr>{detailColumns.map((column) => <th key={column}>{column === "audit" ? "Edit history" : column.replaceAll("_", " ")}</th>)}<th>Actions</th></tr></thead><tbody>{detailLoading ? <tr><td colSpan={detailColumns.length + 1} className="ede-empty">Loading raw rows...</td></tr> : detailRows.map((row) => <tr key={row._id}>{detailColumns.map((column) => <td key={column}>{renderDetailCell(row, column)}</td>)}<td><div className="ede-row-actions"><button title="Edit row" onClick={() => openEntry(row)}><RiEdit2Line /></button><button className="danger" title="Delete row" onClick={() => setDeleteRow(row)}><RiDeleteBin6Line /></button></div></td></tr>)}</tbody></table></div></Modal>
      <Modal open={!!entry} title={entry?.mode === "edit" ? "Edit extraction row" : "Add extraction entry"} subtitle="Values and segment are recalculated from the selected product and quantity." onClose={() => setEntry(null)}><EntryForm key={`${entry?.mode}-${entry?.row?._id || "new"}`} mode={entry?.mode} initial={entry?.row} dealers={dealers} products={products} loadingProducts={loadingProducts} onDealerSearch={searchDealers} onProductSearch={searchProducts} onCancel={() => setEntry(null)} onSubmit={submitEntry} saving={saving} /></Modal>
      <Modal open={!!deleteRow} title="Delete raw extraction row" subtitle={`${deleteRow?.dealer || ""} · ${deleteRow?.product_name || deleteRow?.product_code || ""}`} onClose={() => setDeleteRow(null)}><div className="ede-delete"><p>This removes the row from reports immediately. Its complete snapshot will remain in the audit trail.</p><label className="ede-field"><span>Reason for deletion</span><textarea rows="4" required value={deleteReason} onChange={(event) => setDeleteReason(event.target.value)} /></label><footer className="ede-form-actions"><button className="ede-button secondary" onClick={() => setDeleteRow(null)}>Cancel</button><button className="ede-button danger-button" disabled={!deleteReason.trim() || saving} onClick={confirmDelete}>{saving ? "Deleting..." : "Delete row"}</button></footer></div></Modal>
      <Modal open={!!history} title="Extraction entry history" subtitle={`${history?.row?.dealer || ""} · ${history?.row?.product_name || history?.row?.product_code || ""}`} onClose={() => setHistory(null)}><div className="ede-history-list">{historyLoading ? <div className="ede-empty">Loading history...</div> : history?.items?.length ? history.items.map((item) => <article key={item._id}><div><strong>{item.action}</strong><time>{dateTime(item.createdAt)}</time></div><p>{item.reason}</p><span>Changed by {item.actor?.name || item.actor?.code || "Unknown"} ({item.actor?.code || "-"})</span>{item.action === "update" && <small>Value: {valueLabel(item.before?.amount)} → {valueLabel(item.after?.amount)} · Quantity: {item.before?.quantity ?? "-"} → {item.after?.quantity ?? "-"}</small>}</article>) : <div className="ede-empty">This entry has not been edited yet.</div>}</div></Modal>
    </main>
  );
}
