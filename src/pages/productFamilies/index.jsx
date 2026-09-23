import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Download,
  FileSpreadsheet,
  FolderPlus,
  PackageSearch,
  Plus,
  RefreshCw,
  Search,
  Tags,
  Unlink,
  Upload,
  X,
} from "lucide-react";
import config from "../../config";
import "./style.scss";

const backendUrl = config.backend_url;

const EMPTY_FORM = {
  brand: "samsung",
  code: "",
  name: "",
  aliases: "",
  status: "active",
};

const authHeaders = () => {
  const token = localStorage.getItem("authToken") || "";
  return { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` };
};

const familyNamePreview = (form) => {
  const code = form.code.trim().toUpperCase();
  const name = form.name.trim().replace(/([a-z0-9])family$/i, "$1 family");
  return name || (code ? `${code} family` : "Family name");
};

export default function ProductFamiliesPage() {
  const [families, setFamilies] = useState([]);
  const [familySearch, setFamilySearch] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState("");
  const [loadingFamilies, setLoadingFamilies] = useState(true);
  const [familyDialog, setFamilyDialog] = useState(null);
  const [familyForm, setFamilyForm] = useState(EMPTY_FORM);
  const [savingFamily, setSavingFamily] = useState(false);

  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [appliedProductSearch, setAppliedProductSearch] = useState("");
  const [scope, setScope] = useState("unassigned");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [savingProducts, setSavingProducts] = useState(false);
  const [notice, setNotice] = useState(null);
  const [workbookBusy, setWorkbookBusy] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const selectedFamily = useMemo(
    () => families.find((family) => family._id === selectedFamilyId) || null,
    [families, selectedFamilyId]
  );

  const visibleFamilies = useMemo(() => {
    const term = familySearch.trim().toLowerCase();
    if (!term) return families;
    return families.filter((family) =>
      [family.name, family.code, family.brand, ...(family.aliases || [])]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [families, familySearch]);

  const showNotice = (type, text) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 5000);
  };

  const loadFamilies = async (preferredFamilyId = "") => {
    try {
      setLoadingFamilies(true);
      const response = await axios.get(`${backendUrl}/admin/product-families`, {
        headers: authHeaders(),
      });
      const nextFamilies = response.data?.data || [];
      setFamilies(nextFamilies);
      setSelectedFamilyId((current) => {
        if (preferredFamilyId && nextFamilies.some((item) => item._id === preferredFamilyId)) {
          return preferredFamilyId;
        }
        if (current && nextFamilies.some((item) => item._id === current)) return current;
        return nextFamilies[0]?._id || "";
      });
    } catch (error) {
      showNotice("error", error.response?.data?.message || "Failed to load product families.");
    } finally {
      setLoadingFamilies(false);
    }
  };

  const loadProducts = async () => {
    if (!selectedFamilyId) {
      setProducts([]);
      setPagination({ page: 1, pages: 1, total: 0 });
      return;
    }

    try {
      setLoadingProducts(true);
      const response = await axios.get(
        `${backendUrl}/admin/product-families/${selectedFamilyId}/products`,
        {
          headers: authHeaders(),
          params: {
            page,
            limit: 50,
            scope,
            search: appliedProductSearch,
          },
        }
      );
      setProducts(response.data?.data || []);
      setPagination(response.data?.pagination || { page: 1, pages: 1, total: 0 });
      setSelectedProducts(new Set());
    } catch (error) {
      showNotice("error", error.response?.data?.message || "Failed to load products.");
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadFamilies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFamilyId, scope, appliedProductSearch, page]);

  const openCreateDialog = () => {
    setFamilyForm(EMPTY_FORM);
    setFamilyDialog("create");
  };

  const openEditDialog = () => {
    if (!selectedFamily) return;
    setFamilyForm({
      brand: selectedFamily.brand || "",
      code: selectedFamily.code || "",
      name: selectedFamily.name || "",
      aliases: (selectedFamily.aliases || []).join(", "),
      status: selectedFamily.status || "active",
    });
    setFamilyDialog("edit");
  };

  const saveFamily = async (event) => {
    event.preventDefault();
    if (!familyForm.brand.trim() || !familyForm.code.trim()) {
      showNotice("error", "Brand and family code are required.");
      return;
    }

    const payload = {
      ...familyForm,
      aliases: familyForm.aliases
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    };

    try {
      setSavingFamily(true);
      const response = familyDialog === "edit"
        ? await axios.put(
            `${backendUrl}/admin/product-families/${selectedFamilyId}`,
            payload,
            { headers: authHeaders() }
          )
        : await axios.post(`${backendUrl}/admin/product-families`, payload, {
            headers: authHeaders(),
          });
      const savedId = response.data?.data?._id || selectedFamilyId;
      setFamilyDialog(null);
      showNotice("success", response.data?.message || "Product family saved.");
      await loadFamilies(savedId);
    } catch (error) {
      showNotice("error", error.response?.data?.message || "Failed to save product family.");
    } finally {
      setSavingFamily(false);
    }
  };

  const toggleProduct = (productId) => {
    setSelectedProducts((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const allVisibleSelected =
    products.length > 0 && products.every((product) => selectedProducts.has(product._id));

  const toggleAllVisible = () => {
    setSelectedProducts((current) => {
      const next = new Set(current);
      if (allVisibleSelected) products.forEach((product) => next.delete(product._id));
      else products.forEach((product) => next.add(product._id));
      return next;
    });
  };

  const updateAssignments = async (action) => {
    if (!selectedFamily || !selectedProducts.size) return;
    const selectedRows = products.filter((product) => selectedProducts.has(product._id));
    const movingCount = selectedRows.filter(
      (product) =>
        action === "assign" &&
        product.family &&
        String(product.family._id) !== String(selectedFamily._id)
    ).length;

    if (
      movingCount > 0 &&
      !window.confirm(
        `${movingCount} selected product(s) already belong to another family. Move them to ${selectedFamily.name}?`
      )
    ) {
      return;
    }

    try {
      setSavingProducts(true);
      const response = await axios.patch(
        `${backendUrl}/admin/product-families/${selectedFamily._id}/products`,
        { action, productIds: [...selectedProducts] },
        { headers: authHeaders() }
      );
      showNotice("success", response.data?.message || "Product assignments updated.");
      await Promise.all([loadFamilies(selectedFamily._id), loadProducts()]);
    } catch (error) {
      showNotice("error", error.response?.data?.message || "Failed to update product assignments.");
    } finally {
      setSavingProducts(false);
    }
  };

  const changeScope = (nextScope) => {
    setScope(nextScope);
    setPage(1);
    setSelectedProducts(new Set());
  };

  const downloadWorkbook = async () => {
    try {
      setWorkbookBusy(true);
      const response = await axios.get(`${backendUrl}/admin/product-families/workbook`, {
        headers: authHeaders(),
        responseType: "blob",
      });
      const disposition = response.headers["content-disposition"] || "";
      const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || "product_families.xlsx";
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      showNotice("error", "Failed to download the product family workbook.");
    } finally {
      setWorkbookBusy(false);
    }
  };

  const uploadWorkbook = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      showNotice("error", "Choose the downloaded .xlsx workbook.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    try {
      setWorkbookBusy(true);
      setImportResult(null);
      const response = await axios.post(
        `${backendUrl}/admin/product-families/workbook`,
        formData,
        { headers: { ...authHeaders(), "Content-Type": "multipart/form-data" } }
      );
      setImportResult({ success: true, ...response.data });
      await loadFamilies(selectedFamilyId);
      await loadProducts();
    } catch (error) {
      const data = error.response?.data || {};
      setImportResult({
        success: false,
        message: data.message || "Workbook import failed.",
        errors: data.errors || [],
        totalErrors: data.totalErrors || data.errors?.length || 0,
      });
    } finally {
      setWorkbookBusy(false);
    }
  };

  return (
    <main className="product-families-page">
      <header className="pf-page-header">
        <div>
          <span>Inventory</span>
          <h1>Product Families</h1>
        </div>
        <div className="pf-header-actions">
          <input
            ref={fileInputRef}
            className="pf-file-input"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={uploadWorkbook}
          />
          <button
            className="pf-secondary-button"
            onClick={downloadWorkbook}
            disabled={workbookBusy}
          >
            <Download size={17} />
            Download workbook
          </button>
          <button
            className="pf-secondary-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={workbookBusy}
          >
            {workbookBusy ? <RefreshCw className="pf-spin" size={17} /> : <Upload size={17} />}
            Upload workbook
          </button>
          <button
            className="pf-icon-button"
            title="Refresh families"
            onClick={() => loadFamilies(selectedFamilyId)}
            disabled={loadingFamilies}
          >
            <RefreshCw size={17} />
          </button>
          <button className="pf-primary-button" onClick={openCreateDialog}>
            <Plus size={17} />
            New family
          </button>
        </div>
      </header>

      {notice && <div className={`pf-notice ${notice.type}`}>{notice.text}</div>}

      <div className="pf-workspace">
        <aside className="pf-family-panel">
          <div className="pf-panel-title">
            <div>
              <h2>Families</h2>
              <span>{families.length}</span>
            </div>
            <div className="pf-search-control">
              <Search size={16} />
              <input
                value={familySearch}
                onChange={(event) => setFamilySearch(event.target.value)}
                placeholder="Search families"
              />
            </div>
          </div>

          <div className="pf-family-list">
            {loadingFamilies ? (
              <div className="pf-empty">Loading families...</div>
            ) : visibleFamilies.length ? (
              visibleFamilies.map((family) => (
                <button
                  key={family._id}
                  className={`pf-family-row ${selectedFamilyId === family._id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedFamilyId(family._id);
                    setPage(1);
                    setSelectedProducts(new Set());
                  }}
                >
                  <span className="pf-family-icon"><Tags size={17} /></span>
                  <span className="pf-family-copy">
                    <strong>{family.name}</strong>
                    <small>{family.brand} · {family.code}</small>
                  </span>
                  <span className="pf-family-count">{family.productCount || 0}</span>
                  <span className={`pf-status-dot ${family.status}`} title={family.status} />
                </button>
              ))
            ) : (
              <div className="pf-empty">No families found.</div>
            )}
          </div>
        </aside>

        <section className="pf-products-panel">
          {selectedFamily ? (
            <>
              <div className="pf-selected-family">
                <div className="pf-selected-copy">
                  <span className="pf-selected-icon"><Tags size={19} /></span>
                  <div>
                    <div className="pf-family-heading">
                      <h2>{selectedFamily.name}</h2>
                      <span className={`pf-status-pill ${selectedFamily.status}`}>
                        {selectedFamily.status}
                      </span>
                    </div>
                    <p>{selectedFamily.brand} · {selectedFamily.code} · {selectedFamily.productCount || 0} products</p>
                  </div>
                </div>
                <button className="pf-secondary-button" onClick={openEditDialog}>
                  <Edit3 size={16} />
                  Edit
                </button>
              </div>

              <div className="pf-product-toolbar">
                <form
                  className="pf-product-search"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setAppliedProductSearch(productSearch.trim());
                    setPage(1);
                  }}
                >
                  <Search size={16} />
                  <input
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    placeholder="Search name, product code or model code"
                  />
                  <button type="submit">Search</button>
                </form>

                <div className="pf-scope-control" aria-label="Product assignment filter">
                  <button className={scope === "unassigned" ? "active" : ""} onClick={() => changeScope("unassigned")}>Unassigned</button>
                  <button className={scope === "assigned" ? "active" : ""} onClick={() => changeScope("assigned")}>In family</button>
                  <button className={scope === "all" ? "active" : ""} onClick={() => changeScope("all")}>All {selectedFamily.brand}</button>
                </div>
              </div>

              <div className="pf-selection-bar">
                <span>{selectedProducts.size} selected</span>
                <div>
                  {scope !== "assigned" && (
                    <button
                      className="pf-assign-button"
                      disabled={!selectedProducts.size || savingProducts || selectedFamily.status !== "active"}
                      onClick={() => updateAssignments("assign")}
                    >
                      <FolderPlus size={16} />
                      Assign to family
                    </button>
                  )}
                  {scope !== "unassigned" && (
                    <button
                      className="pf-remove-button"
                      disabled={!selectedProducts.size || savingProducts}
                      onClick={() => updateAssignments("remove")}
                    >
                      <Unlink size={16} />
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="pf-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="pf-check-column">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleAllVisible}
                          aria-label="Select all visible products"
                        />
                      </th>
                      <th>Product</th>
                      <th>Product code</th>
                      <th>Model code</th>
                      <th>Category</th>
                      <th>Current family</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingProducts ? (
                      <tr><td colSpan="7" className="pf-table-empty">Loading products...</td></tr>
                    ) : products.length ? (
                      products.map((product) => (
                        <tr key={product._id} className={selectedProducts.has(product._id) ? "selected" : ""}>
                          <td className="pf-check-column">
                            <input
                              type="checkbox"
                              checked={selectedProducts.has(product._id)}
                              onChange={() => toggleProduct(product._id)}
                              aria-label={`Select ${product.product_name}`}
                            />
                          </td>
                          <td><strong>{product.product_name || "-"}</strong><small>{product.brand}</small></td>
                          <td>{product.product_code || "-"}</td>
                          <td>{product.model_code || "-"}</td>
                          <td>{product.product_category || "-"}</td>
                          <td>
                            {product.family ? (
                              <span className="pf-family-badge">{product.family.name}</span>
                            ) : (
                              <span className="pf-unassigned">Unassigned</span>
                            )}
                          </td>
                          <td><span className={`pf-product-status ${product.status || "inactive"}`}>{product.status || "inactive"}</span></td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="pf-table-empty">
                          <PackageSearch size={28} />
                          <span>No matching products.</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <footer className="pf-pagination">
                <span>{pagination.total || 0} products</span>
                <div>
                  <button
                    className="pf-icon-button"
                    title="Previous page"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <span>Page {pagination.page || 1} of {pagination.pages || 1}</span>
                  <button
                    className="pf-icon-button"
                    title="Next page"
                    disabled={page >= (pagination.pages || 1)}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="pf-zero-state">
              <Tags size={34} />
              <h2>Create the first product family</h2>
              <button className="pf-primary-button" onClick={openCreateDialog}>
                <Plus size={17} />
                New family
              </button>
            </div>
          )}
        </section>
      </div>

      {familyDialog && (
        <div className="pf-modal-backdrop" onMouseDown={() => setFamilyDialog(null)}>
          <form className="pf-modal" onSubmit={saveFamily} onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>{familyDialog === "edit" ? "Edit family" : "New family"}</span>
                <h2>{familyNamePreview(familyForm)}</h2>
              </div>
              <button type="button" className="pf-icon-button" title="Close" onClick={() => setFamilyDialog(null)}>
                <X size={18} />
              </button>
            </header>

            <div className="pf-form-grid">
              <label>
                <span>Brand</span>
                <input
                  value={familyForm.brand}
                  onChange={(event) => setFamilyForm({ ...familyForm, brand: event.target.value })}
                  placeholder="samsung"
                  required
                />
              </label>
              <label>
                <span>Family code</span>
                <input
                  value={familyForm.code}
                  onChange={(event) => setFamilyForm({ ...familyForm, code: event.target.value.toUpperCase() })}
                  placeholder="A27"
                  required
                />
              </label>
              <label className="pf-form-wide">
                <span>Display name</span>
                <input
                  value={familyForm.name}
                  onChange={(event) => setFamilyForm({ ...familyForm, name: event.target.value })}
                  placeholder={`${familyForm.code.trim().toUpperCase() || "A27"} family`}
                />
                <small>Leave blank to use “{familyForm.code.trim().toUpperCase() || "CODE"} family”.</small>
              </label>
              <label className="pf-form-wide">
                <span>Aliases</span>
                <input
                  value={familyForm.aliases}
                  onChange={(event) => setFamilyForm({ ...familyForm, aliases: event.target.value })}
                  placeholder="A27, Galaxy A27"
                />
                <small>Separate alternate names with commas.</small>
              </label>
              {familyDialog === "edit" && (
                <label className="pf-form-wide">
                  <span>Status</span>
                  <select
                    value={familyForm.status}
                    onChange={(event) => setFamilyForm({ ...familyForm, status: event.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              )}
            </div>

            <footer>
              <button type="button" className="pf-secondary-button" onClick={() => setFamilyDialog(null)}>Cancel</button>
              <button type="submit" className="pf-primary-button" disabled={savingFamily}>
                {savingFamily ? <RefreshCw className="pf-spin" size={17} /> : <Check size={17} />}
                {savingFamily ? "Saving..." : "Save family"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {importResult && (
        <div className="pf-modal-backdrop" onMouseDown={() => setImportResult(null)}>
          <section className="pf-modal pf-import-result" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div className="pf-import-title">
                <span className={importResult.success ? "success" : "error"}>
                  <FileSpreadsheet size={20} />
                </span>
                <div>
                  <span>Bulk workbook</span>
                  <h2>{importResult.success ? "Import complete" : "Import needs correction"}</h2>
                </div>
              </div>
              <button type="button" className="pf-icon-button" title="Close" onClick={() => setImportResult(null)}>
                <X size={18} />
              </button>
            </header>

            <p className="pf-import-message">{importResult.message}</p>
            {importResult.success ? (
              <div className="pf-import-summary">
                <div><strong>{importResult.summary?.familiesCreated || 0}</strong><span>Families created</span></div>
                <div><strong>{importResult.summary?.familiesUpdated || 0}</strong><span>Families updated</span></div>
                <div><strong>{importResult.summary?.productsAssigned || 0}</strong><span>Products assigned</span></div>
                <div><strong>{importResult.summary?.productsRemoved || 0}</strong><span>Products removed</span></div>
              </div>
            ) : (
              <>
                <div className="pf-error-count">{importResult.totalErrors || 0} validation errors</div>
                <div className="pf-import-errors">
                  {(importResult.errors || []).map((error, index) => (
                    <div key={`${error.sheet}-${error.row}-${index}`}>
                      <strong>{error.sheet} · row {error.row}</strong>
                      <span>{error.message}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <footer>
              <button type="button" className="pf-primary-button" onClick={() => setImportResult(null)}>Done</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
