import React from 'react';
import './style.scss';

const TableBodyLoading = ({ rowCount = 5, columnCount = 6 }) => {
  return (
    <tbody>
      {[...Array(rowCount)].map((_, rowIndex) => (
        <tr key={rowIndex} className="loading-row">
          {[...Array(columnCount)].map((_, colIndex) => (
            <td key={colIndex} className="loading-cell">
              <div className="loading-placeholder"></div>
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
};

export default TableBodyLoading;