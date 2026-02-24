import React, { useMemo } from "react";

const formatNumberFallback = (num) => {
  if (num === null || num === undefined) return "0";
  const n = Number(num);
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString("en-IN");
};

const formatPercent = (num) => {
  if (num === null || num === undefined) return "";
  const n = Number(num);
  if (Number.isNaN(n)) return "";
  return `${n.toFixed(2)}%`;
};

const getGrowthStyle = (gd) => {
  const n = Number(gd);
  if (Number.isNaN(n) || gd === null || gd === undefined) return {};
  return { color: n >= 0 ? "green" : "red", fontWeight: 600 };
};

const Price40kSplitTable = ({ data, title, formatValue }) => {
  // ✅ hooks must be unconditional
  const monthKeys = useMemo(() => {
    const value = data?.value || [];
    const volume = data?.volume || [];
    const sample = value?.[0] || volume?.[0] || {};

    const fixed = new Set(["Seg", "MTD", "LMTD", "FTD", "G/D%", "Exp.Ach", "WMF"]);
    return Object.keys(sample).filter((k) => !fixed.has(k)).slice(0, 3);
  }, [data]);

  if (!data) return null;

  const { value = [], volume = [], flagSummary } = data;

  const renderNum = (num, isCurrency) => {
    if (formatValue) return formatValue(num, isCurrency);
    return formatNumberFallback(num);
  };

  const renderTable = (rows, label, isCurrency) => (
    <div style={{ marginBottom: 20 }}>
      <h4>{label}</h4>

      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Segment</th>

            {monthKeys.map((k) => (
              <th key={k}>{k}</th>
            ))}

            <th>MTD</th>
            <th>LMTD</th>
            <th>FTD</th>
            <th>G/D%</th>
            <th>Exp.Ach</th>
            <th>WMF</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, i) => {
            const isTotal = row.Seg === "Total";
            const gd = row["G/D%"];

            return (
              <tr
                key={i}
                style={isTotal ? { fontWeight: 700, background: "#f2f2f2" } : undefined}
              >
                <td>{row.Seg}</td>

                {monthKeys.map((k) => (
                  <td key={k}>{renderNum(row[k], isCurrency)}</td>
                ))}

                <td>{renderNum(row.MTD, isCurrency)}</td>
                <td>{renderNum(row.LMTD, isCurrency)}</td>
                <td>{renderNum(row.FTD, isCurrency)}</td>

                <td style={getGrowthStyle(gd)}>
                  {gd === null || gd === undefined ? "" : formatPercent(gd)}
                </td>

                <td>{renderNum(row["Exp.Ach"], isCurrency)}</td>
                <td>{renderNum(row.WMF, isCurrency)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ marginTop: 30 }}>
      <h3 style={{ marginBottom: 10 }}>{title}</h3>

      {renderTable(value, "Value (₹)", true)}
      {renderTable(volume, "Volume", false)}

      {/* FLAGS SECTION (only hierarchy is relevant here; product issue will be false/0) */}
      {(flagSummary?.hasHierarchyIssue || flagSummary?.hasProductIssue) && (
        <div
          style={{
            padding: 12,
            background: "#fff3cd",
            border: "1px solid #ffeeba",
            borderRadius: 6,
          }}
        >
          <strong>⚠ Data Flags:</strong>

          {flagSummary?.hasHierarchyIssue && (
            <div>
              • {renderNum(flagSummary.hierarchyExcludedRows, false)} rows excluded due to hierarchy
            </div>
          )}

          {flagSummary?.hasProductIssue && (
            <div>
              • {renderNum(flagSummary.unmappedProductRows, false)} rows have unmapped products
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Price40kSplitTable;