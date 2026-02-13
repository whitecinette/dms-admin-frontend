import React from "react";

function DealerTable({ data }) {
  return (
    <div className="dealer-table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Dealer Code</th>
            <th>Dealer Name</th>
            <th>Category</th>
            <th>Beat</th>
            <th>TSE</th>
            <th>ASM</th>
            <th>ZM</th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="7" className="no-data">
                No Data Found
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr key={item._id}>
                <td>{item.dealer_code}</td>
                <td>{item.dealer_name}</td>
                <td>{item.dealer_category}</td>
                <td>{item.beat_code}</td>
                <td>{item.tse_code}</td>
                <td>{item.asm_code}</td>
                <td>{item.zm_code}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DealerTable;
