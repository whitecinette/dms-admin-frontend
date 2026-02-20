import React from "react";

const formatNumber = (num) => {
  if (!num) return 0;
  return num.toLocaleString("en-IN");
};

const PriceSegmentTable = ({ data, title }) => {
  if (!data) return null;

  const { value, volume, flagSummary } = data;

  return (
    <div style={{ marginTop: 30 }}>

      <h3 style={{ marginBottom: 10 }}>
        {title}
      </h3>

      {/* VALUE TABLE */}
      <div style={{ marginBottom: 20 }}>
        <h4>Value (₹)</h4>
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Segment</th>
              <th>MTD</th>
            </tr>
          </thead>
          <tbody>
            {value.map((row, i) => (
              <tr key={i}>
                <td>{row.Seg}</td>
                <td>{formatNumber(row.MTD)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* VOLUME TABLE */}
      <div style={{ marginBottom: 20 }}>
        <h4>Volume</h4>
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Segment</th>
              <th>MTD</th>
            </tr>
          </thead>
          <tbody>
            {volume.map((row, i) => (
              <tr key={i}>
                <td>{row.Seg}</td>
                <td>{formatNumber(row.MTD)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FLAGS SECTION */}
      {(flagSummary?.hasHierarchyIssue ||
        flagSummary?.hasProductIssue) && (
        <div
          style={{
            padding: 12,
            background: "#fff3cd",
            border: "1px solid #ffeeba",
            borderRadius: 6
          }}
        >
          <strong>⚠ Data Flags:</strong>

          {flagSummary.hasHierarchyIssue && (
            <div>
              • {formatNumber(flagSummary.hierarchyExcludedRows)} rows excluded due to hierarchy
            </div>
          )}

          {flagSummary.hasProductIssue && (
            <div>
              • {formatNumber(flagSummary.unmappedProductRows)} rows have unmapped products
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default PriceSegmentTable;