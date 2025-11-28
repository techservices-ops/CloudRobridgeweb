import React, { useState, useEffect } from 'react';
import { FaTrash, FaDownload, FaRedo, FaSearch, FaFilter, FaTimes, FaCheck } from 'react-icons/fa';
import './ScannedBarcodes.css';

const ScannedBarcodes = () => {
  const [scannedBarcodes, setScannedBarcodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState(null);
  const [showBarcodeDialog, setShowBarcodeDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);

  // Fetch scanned barcodes from database
  const fetchScannedBarcodes = async () => {
    setLoading(true);
    try {
      console.log('Fetching scanned barcodes from API...');
      const serverURL = 'https://robridgeexpress.onrender.com';
      const response = await fetch(`${serverURL}/api/barcodes/scanned?limit=1000&t=${Date.now()}`);
      const data = await response.json();
      console.log('Scanned barcodes API Response:', data);
      
      if (data.success) {
        const barcodes = data.barcodes || [];
        console.log('📊 Total scanned barcodes loaded:', barcodes.length);
        
        // Filter to only show ESP32 source scans
        const esp32Barcodes = barcodes.filter(barcode => {
          const source = (barcode.source || '').toUpperCase();
          return source === 'ESP32';
        });
        
        console.log('✅ ESP32 source barcodes after filtering:', esp32Barcodes.length);
        
        // Debug: Show breakdown of scan types and sources
        const typeBreakdown = {};
        const sourceBreakdown = {};
        
        esp32Barcodes.forEach(barcode => {
          const type = barcode.barcode_type || 'unknown';
          const source = barcode.source || 'unknown';
          
          typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
          sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
        });
        
        console.log('🔍 Scan Type Breakdown:', typeBreakdown);
        console.log('🔍 Source Breakdown:', sourceBreakdown);
        
        // Show first few barcodes for debugging
        console.log('📋 First 3 barcodes:');
        esp32Barcodes.slice(0, 3).forEach((barcode, index) => {
          console.log(`  ${index + 1}. ID: ${barcode.id}, Type: "${barcode.barcode_type}", Source: "${barcode.source}", Data: ${barcode.barcode_data}`);
        });
        
        setScannedBarcodes(esp32Barcodes);
      } else {
        console.error('API returned error:', data.error);
        setScannedBarcodes([]);
      }
    } catch (error) {
      console.error('Error fetching scanned barcodes:', error);
      setScannedBarcodes([]);
    } finally {
      setLoading(false);
    }
  };

  // Load scanned barcodes on component mount
  useEffect(() => {
    fetchScannedBarcodes();
  }, []);

  // Handle barcode row click to show details
  const handleBarcodeClick = (barcode) => {
    setSelectedBarcode(barcode);
    setShowBarcodeDialog(true);
  };

  // Close barcode details dialog
  const closeBarcodeDialog = () => {
    setShowBarcodeDialog(false);
    setSelectedBarcode(null);
  };

  // Save scanned barcode to Saved Scans
  const saveScannedBarcode = async (barcode) => {
    try {
      // Parse metadata if it's a string
      let metadata = {};
      try {
        metadata = typeof barcode.metadata === 'string' ? JSON.parse(barcode.metadata) : barcode.metadata;
      } catch (e) {
        metadata = {};
      }

      const response = await fetch('https://robridgeexpress.onrender.com/api/save-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barcode_data: barcode.barcode_data,
          barcode_type: barcode.barcode_type || 'ESP32_SCAN',
          source: 'ESP32',
          product_name: barcode.product_name || 'Unknown Product',
          category: barcode.category || 'Unknown',
          price: barcode.price || 0,
          description: metadata.description || metadata.productDetails || '',
          metadata: {
            originalId: barcode.id,
            originalTimestamp: barcode.created_at,
            deviceId: metadata.deviceId || 'ESP32_GM77_SCANNER_001',
            deviceName: metadata.deviceName || 'ESP32-GM77-Barcode-Scanner',
            aiAnalysis: metadata.aiAnalysis || null,
            savedFromScannedBarcodes: true
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ Scan saved successfully! View in "Saved Scans" page.');
      } else {
        if (result.duplicate) {
          alert('⚠️ ' + result.error + '\n\nLast saved: ' + new Date(result.lastSaved).toLocaleString());
        } else {
          alert('❌ Failed to save scan: ' + (result.error || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Error saving scanned barcode:', error);
      alert('❌ Error saving scan. Please ensure the server is running.');
    }
  };

  // Delete scanned barcode
  const deleteScannedBarcode = async (barcodeId) => {
    if (!window.confirm('Are you sure you want to delete this scanned barcode?')) {
      return;
    }

    try {
      const response = await fetch(`https://robridgeexpress.onrender.com/api/barcodes/${barcodeId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        setScannedBarcodes(prev => prev.filter(barcode => barcode.id !== barcodeId));
        alert('Scanned barcode deleted successfully!');
      } else {
        alert('Failed to delete scanned barcode: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting scanned barcode:', error);
      alert('Error deleting scanned barcode. Please try again.');
    }
  };

  // Filter scanned barcodes based on search term and type
  const filteredScannedBarcodes = scannedBarcodes.filter(barcode => {
    const matchesSearch = searchTerm === '' || 
      barcode.barcode_data.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || barcode.barcode_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredScannedBarcodes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentScannedBarcodes = filteredScannedBarcodes.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  // Clear all scanned barcodes
  const clearAllScannedBarcodes = async () => {
    if (!window.confirm('⚠️ Are you sure you want to delete ALL scanned barcodes? This cannot be undone!')) {
      return;
    }

    try {
      // Note: There's no bulk delete endpoint for barcodes table, so we'll skip this for now
      alert('⚠️ Bulk delete is not available for scanned barcodes. Please delete individual barcodes.');
    } catch (error) {
      console.error('Error clearing scanned barcodes:', error);
      alert('❌ Error clearing scanned barcodes. Please try again.');
    }
  };

  // Export scanned barcodes to CSV
  const exportToCSV = () => {
    const csvContent = [
      ['ID', 'Barcode Data', 'Type', 'Source', 'Category', 'Scanned At'],
      ...filteredScannedBarcodes.map(barcode => [
        barcode.id,
        barcode.barcode_data,
        barcode.barcode_type || 'N/A',
        barcode.source === 'ESP32' ? 'RobridgeAI' : barcode.source,
        (() => {
          // Try to get AI analysis category from metadata
          try {
            const metadata = typeof barcode.metadata === 'string' ? JSON.parse(barcode.metadata) : barcode.metadata;
            if (metadata.aiAnalysis && metadata.aiAnalysis.category) {
              return metadata.aiAnalysis.category;
            }
          } catch (e) {
            // Fallback to database category
          }
          return barcode.category || 'N/A';
        })(),
        new Date(barcode.created_at).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scanned_barcodes_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="scanned-barcodes-page">
      <div className="scanned-barcodes-header">
        <h1>Scanned Barcodes</h1>
        <p>View and manage all your scanned barcodes from ESP32 devices.</p>
      </div>

      {/* Search and Filter Controls */}
      <div className="controls-section">
        <div className="search-filter-container">
          <div className="search-input">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search scanned barcodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-dropdown">
            <FaFilter className="filter-icon" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="ean13">EAN13</option>
              <option value="qr">QR Code</option>
              <option value="code128">Code128</option>
              <option value="code39">Code39</option>
              <option value="upc">UPC</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>

        <div className="action-buttons">
          <button 
            className="btn btn-secondary"
            onClick={fetchScannedBarcodes}
            disabled={loading}
          >
            <FaRedo />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          
          <button 
            className="btn btn-primary"
            onClick={exportToCSV}
            disabled={filteredScannedBarcodes.length === 0}
          >
            <FaDownload />
            Export CSV
          </button>

          <button 
            className="btn btn-danger"
            onClick={clearAllScannedBarcodes}
            disabled={scannedBarcodes.length === 0}
          >
            <FaTrash />
            Clear All
          </button>
        </div>
      </div>

      {/* Scanned Barcodes Content */}
      <div className="scanned-barcodes-content">
        <div className="barcodes-summary">
          <div className="summary-info">
            <h2>Scanned Barcodes History</h2>
            <span className="total-count">
              {filteredScannedBarcodes.length} of {scannedBarcodes.length} scanned barcodes
              {totalPages > 1 && (
                <span className="page-info"> • Page {currentPage} of {totalPages}</span>
              )}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner">Loading scanned barcodes...</div>
          </div>
        ) : filteredScannedBarcodes.length > 0 ? (
          <div className="barcodes-table-container">
            <table className="barcodes-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Barcode Data</th>
                  <th>Source</th>
                  <th>Category</th>
                  <th>Scanned At</th>
                  <th className="action-column">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentScannedBarcodes.map((barcode, index) => (
                  <tr 
                    key={`${barcode.id}-${index}-${Date.now()}`}
                    className="barcode-row"
                    onClick={() => handleBarcodeClick(barcode)}
                  >
                    <td className="barcode-id">#{barcode.id}</td>
                    <td className="barcode-data">
                      <span className="barcode-text">
                        {barcode.barcode_data}
                      </span>
                    </td>
                    <td className="barcode-source">
                      <span className={`source-badge source-robridgeai`}>
                        {barcode.source === 'ESP32' ? 'RobridgeAI' : (barcode.source?.toUpperCase() || 'UNKNOWN')}
                      </span>
                    </td>
                    <td className="barcode-category">
                      {(() => {
                        // Try to get AI analysis category from metadata
                        try {
                          const metadata = typeof barcode.metadata === 'string' ? JSON.parse(barcode.metadata) : barcode.metadata;
                          if (metadata.aiAnalysis && metadata.aiAnalysis.category) {
                            return metadata.aiAnalysis.category;
                          }
                        } catch (e) {
                          // Fallback to database category
                        }
                        return barcode.category || 'N/A';
                      })()}
                    </td>
                    <td className="barcode-date">
                      {new Date(barcode.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="action-cell">
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          className="save-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            saveScannedBarcode(barcode);
                          }}
                          title="Save this scan to Saved Scans"
                        >
                          <FaCheck />
                          Save
                        </button>
                        <button
                          className="delete-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteScannedBarcode(barcode.id);
                          }}
                          title="Delete scanned barcode"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-container" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                borderTop: '1px solid #E8EAED'
              }}>
                <div className="pagination-info" style={{color: '#5F6368', fontSize: '14px'}}>
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredScannedBarcodes.length)} of {filteredScannedBarcodes.length} scanned barcodes
                </div>
                <div className="pagination-controls" style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    title="Previous page"
                  >
                    Previous
                  </button>
                  
                  <span style={{color: '#5F6368', fontSize: '14px'}}>
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <button
                    className="btn btn-secondary"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    title="Next page"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <FaSearch />
            </div>
            <h3>No Scanned Barcodes Found</h3>
            <p>
              {searchTerm || filterType !== 'all' 
                ? 'No scanned barcodes match your current search or filter criteria.'
                : 'No barcodes have been scanned yet. Start scanning with your ESP32 device to see barcode history here.'
              }
            </p>
            {(searchTerm || filterType !== 'all') && (
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Barcode Details Dialog */}
      {showBarcodeDialog && selectedBarcode && (
        <div className="barcode-dialog-overlay" onClick={closeBarcodeDialog}>
          <div className="barcode-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="barcode-dialog-header">
              <h2>Scanned Barcode Details</h2>
              <button className="close-btn" onClick={closeBarcodeDialog}>
                <FaTimes />
              </button>
            </div>
            
            <div className="barcode-dialog-body">
              {/* Basic Information Section */}
              <div className="scan-info-section">
                <h3>Basic Information</h3>
                <div className="info-grid-two-columns">
                  <div className="info-column">
                    <div className="info-field">
                      <label>ID</label>
                      <span className="info-value">#{selectedBarcode.id}</span>
                    </div>
                    <div className="info-field">
                      <label>Source</label>
                      <span className="info-value source-badge">{selectedBarcode.source?.toUpperCase()}</span>
                    </div>
                    <div className="info-field">
                      <label>Category</label>
                      <span className="info-value">
                        {(() => {
                          try {
                            const metadata = typeof selectedBarcode.metadata === 'string' 
                              ? JSON.parse(selectedBarcode.metadata) 
                              : selectedBarcode.metadata;
                            if (metadata?.aiAnalysis?.category) {
                              return metadata.aiAnalysis.category;
                            }
                          } catch (e) {}
                          return selectedBarcode.category || 'N/A';
                        })()}
                      </span>
                    </div>
                  </div>
                  <div className="info-column">
                    <div className="info-field">
                      <label>Product Name</label>
                      <span className="info-value">
                        {(() => {
                          try {
                            const metadata = typeof selectedBarcode.metadata === 'string' 
                              ? JSON.parse(selectedBarcode.metadata) 
                              : selectedBarcode.metadata;
                            if (metadata?.aiAnalysis?.title) {
                              return metadata.aiAnalysis.title;
                            }
                          } catch (e) {}
                          return selectedBarcode.product_name || 'N/A';
                        })()}
                      </span>
                    </div>
                    <div className="info-field">
                      <label>Type</label>
                      <span className={`type-badge type-${selectedBarcode.barcode_type || 'unknown'}`}>
                        {selectedBarcode.barcode_type?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="info-field">
                      <label>Scanned At</label>
                      <span className="info-value">{new Date(selectedBarcode.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barcode Data Section */}
              <div className="barcode-data-section">
                <h3>Barcode Data</h3>
                <div className="barcode-data-container">
                  <span className="barcode-data-text">{selectedBarcode.barcode_data}</span>
                </div>
              </div>

              {/* AI Analysis / Description Section */}
              <div className="description-section">
                <h3>🤖 AI Analysis</h3>
                <div className="description-container">
                  <p className="description-text">
                    {(() => {
                      try {
                        // Try to get description from metadata
                        if (selectedBarcode.metadata) {
                          const metadata = typeof selectedBarcode.metadata === 'string' 
                            ? JSON.parse(selectedBarcode.metadata) 
                            : selectedBarcode.metadata;
                          
                          // Check for AI analysis description
                          if (metadata.aiAnalysis?.description) {
                            return metadata.aiAnalysis.description;
                          }
                          if (metadata.aiAnalysis?.description_short) {
                            return metadata.aiAnalysis.description_short;
                          }
                          if (metadata.description) {
                            return metadata.description;
                          }
                        }
                        
                        // Fallback to description field
                        if (selectedBarcode.description) {
                          return selectedBarcode.description;
                        }
                        
                        // Final fallback
                        return selectedBarcode.product_name || 'No description available';
                      } catch (error) {
                        console.error('Error parsing metadata:', error);
                        return selectedBarcode.product_name || 'No description available';
                      }
                    })()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="barcode-dialog-footer">
              <button className="btn btn-success" onClick={() => {
                saveScannedBarcode(selectedBarcode);
                closeBarcodeDialog();
              }}>
                <FaCheck /> Save to Saved Scans
              </button>
              <button className="btn btn-danger" onClick={() => {
                deleteScannedBarcode(selectedBarcode.id);
                closeBarcodeDialog();
              }}>
                <FaTrash /> Delete Scanned Barcode
              </button>
              <button className="btn btn-secondary" onClick={closeBarcodeDialog}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScannedBarcodes;
