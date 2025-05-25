import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import config from "../../../config";
import axios from 'axios';
import './style.scss';
// Optional: Uncomment if using react-icons
// import { FaTimesCircle } from 'react-icons/fa';

const backendUrl = config.backend_url;

const UpdateProducts = () => {
  const [csvData, setCsvData] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef();

  const handleFiles = (files) => {
    setError('');
    setMessage('');
    if (files.length === 0) return;

    const file = files[0];
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file');
      setCsvData(null);
      setFile(null);
      return;
    }

    setFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          setError('CSV is empty or invalid');
          setCsvData(null);
          return;
        }
        setCsvData(results.data);
      },
      error: () => {
        setError('Failed to parse CSV file');
        setCsvData(null);
      },
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileSelect = (e) => {
    handleFiles(e.target.files);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('No file selected for upload');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.put(`${backendUrl}/product/update-products`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage(res.data.message);
      setCsvData(null);
      setFile(null);
    } catch (err) {
      const msg = err.response?.data?.message || 'Upload failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const displayedColumns = csvData ? Object.keys(csvData[0]).slice(0, 6) : [];

  return (
    <div className="update-products-container">
      <div
        className="drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current.click()}
      >
        <p>Drag & Drop CSV file here or click to update</p>
        <small>Only CSV files allowed. Max preview 4 columns.</small>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileSelect}
          ref={fileInputRef}
          style={{ display: 'none' }}
        />
      </div>
      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      {csvData && (
        <>
          <div className="csv-preview">
            <table>
              <thead>
                <tr>
                  {displayedColumns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvData.slice(0, 10).map((row, idx) => (
                  <tr key={idx}>
                    {displayedColumns.map((col) => (
                      <td key={col}>{row[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="preview-note">Showing up to 5 rows.</p>
          </div>
          {file && (
        <div className="file-info">
          <span>{file.name}</span>
          <span
            className="remove-file-icon"
            onClick={() => {
              setFile(null);
              setCsvData(null);
            }}
          >
            {/* Use emoji or icon */}
            ❌
            {/* Or use react-icon: <FaTimesCircle /> */}
          </span>
        </div>
      )}
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Products'}
          </button>
        </>
      )}
    </div>
  );
};

export default UpdateProducts;
