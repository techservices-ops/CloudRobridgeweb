import React, { useState, useEffect } from 'react';
import { FaTrash, FaDownload, FaRedo, FaSearch, FaFilter, FaTimes } from 'react-icons/fa';
import './SavedScans.css';

const SavedScans = () => {
  const [savedScans, setSavedScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedScan, setSelectedScan] = useState(null);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);

  // Fetch saved scans from database
  const fetchSavedScans = async () => {
    setLoading(true);
    try {
      console.log('Fetching saved scans from API...');
      // Use the saved-scans endpoint to get only manually saved scans
      const response = await fetch('https://robridgeexpress.onrender.com/api/saved-scans');
      const data = await response.json();
      console.log('Saved scans API Response:', data);
      
      if (data.success) {
        const scans = data.savedScans || [];
        console.log('📊 Total saved scans loaded:', scans.length);
        
        // Debug: Show breakdown of scan types and sources
        const typeBreakdown = {};
        const sourceBreakdown = {};
        
        scans.forEach(scan => {
          const type = scan.barcode_type || 'unknown';
          const source = scan.source || 'unknown';
          
          typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
          sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
        });
        
        console.log('🔍 Scan Type Breakdown:', typeBreakdown);
        console.log('🔍 Source Breakdown:', sourceBreakdown);
        
        // Show first few scans for debugging
        console.log('📋 First 3 scans:');
        scans.slice(0, 3).forEach((scan, index) => {
          console.log(`  ${index + 1}. ID: ${scan.id}, Type: "${scan.barcode_type}", Source: "${scan.source}", Data: ${scan.barcode_data}`);
        });
        
        setSavedScans(scans);
      } else {
        console.error('API returned error:', data.error);
        setSavedScans([]);
      }
    } catch (error) {
      console.error('Error fetching saved scans:', error);
      setSavedScans([]);
    } finally {
      setLoading(false);
    }
  };

  // Load saved scans on component mount
  useEffect(() => {
    fetchSavedScans();
  }, []);

  // Handle scan row click to show details
  const handleScanClick = (scan) => {
    setSelectedScan(scan);
    setShowScanDialog(true);
  };

  // Close scan details dialog
  const closeScanDialog = () => {
    setSelectedScan(null);
    setShowScanDialog(false);
  };

  // Delete saved scan
  const deleteSavedScan = async (scanId) => {
    if (!window.confirm('Are you sure you want to delete this saved scan?')) {
      return;
    }

    try {
      const response = await fetch(`https://robridgeexpress.onrender.com/api/saved-scans/${scanId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        setSavedScans(prev => prev.filter(scan => scan.id !== scanId));
        alert('Saved scan deleted successfully!');
      } else {
        alert('Failed to delete saved scan: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting saved scan:', error);
      alert('Error deleting saved scan. Please try again.');
    }
  };

  // Filter saved scans based on search term and type
  const filteredSavedScans = savedScans.filter(scan => {
    // Show all ESP32 scans (source = "ESP32")
    const source = (scan.source || '').toUpperCase();
    if (source !== 'ESP32') {
      return false;
    }

    const matchesSearch = searchTerm === '' || 
      scan.barcode_data.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || scan.barcode_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredSavedScans.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSavedScans = filteredSavedScans.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  // Clear all saved scans
  const clearAllSavedScans = async () => {
    if (!window.confirm('⚠️ Are you sure you want to delete ALL saved scans? This cannot be undone!')) {
      return;
    }

    try {
      const response = await fetch('https://robridgeexpress.onrender.com/api/saved-scans/clear', {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setSavedScans([]);
        alert('✅ All saved scans cleared successfully!');
      } else {
        const errorData = await response.json();
        alert('❌ Error clearing saved scans: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error clearing saved scans:', error);
      alert('❌ Error clearing saved scans. Please try again.');
    }
  };

  // Export saved scans to CSV
  const exportToCSV = () => {
    const csvContent = [
      ['ID', 'Barcode Data', 'Type', 'Source', 'Category', 'Scanned At', 'Saved At'],
      ...filteredSavedScans.map(scan => [
        scan.id,
        scan.barcode_data,
        scan.barcode_type || 'N/A',
        scan.source === 'ESP32' ? 'RobridgeAI' : scan.source,
        (() => {
          // Try to get AI analysis category from metadata
          try {
            const metadata = typeof scan.metadata === 'string' ? JSON.parse(scan.metadata) : scan.metadata;
            if (metadata.aiAnalysis && metadata.aiAnalysis.category) {
              return metadata.aiAnalysis.category;
            }
          } catch (e) {
            // Fallback to database category
          }
          return scan.category || 'N/A';
        })(),
        new Date(scan.saved_at || scan.created_at).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        new Date(scan.saved_at || scan.created_at).toLocaleDateString('en-GB', {
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
    a.download = `saved_scans_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="saved-scans-page">
      <div className="saved-scans-header">
        <h1>Saved Scans</h1>
        <p>View and manage all your saved barcode scans.</p>
      </div>

      {/* Search and Filter Controls */}
      <div className="controls-section">
        <div className="search-filter-container">
          <div className="search-input">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search saved scans or products..."
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
            onClick={fetchSavedScans}
            disabled={loading}
          >
            <FaRedo />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          
          <button 
            className="btn btn-primary"
            onClick={exportToCSV}
            disabled={filteredSavedScans.length === 0}
          >
            <FaDownload />
            Export CSV
          </button>

          <button 
            className="btn btn-danger"
            onClick={clearAllSavedScans}
            disabled={savedScans.length === 0}
          >
            <FaTrash />
            Clear All
          </button>
        </div>
      </div>

      {/* Saved Scans Table */}
      <div className="saved-scans-content">
        <div className="scans-summary">
          <div className="summary-info">
            <h2>Saved Scans History</h2>
            <span className="total-count">
              {filteredSavedScans.length} of {savedScans.length} saved scans
              {totalPages > 1 && (
                <span className="page-info"> • Page {currentPage} of {totalPages}</span>
              )}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner">Loading saved scans...</div>
          </div>
        ) : filteredSavedScans.length > 0 ? (
          <div className="scans-table-container">
            <table className="scans-table">
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
                {currentSavedScans.map((scan, index) => (
                  <tr 
                    key={scan.id || index}
                    className="scan-row"
                    onClick={() => handleScanClick(scan)}
                  >
                    <td className="scan-id">#{scan.id}</td>
                    <td className="scan-data">
                      <span className="scan-text">
                        {scan.barcode_data}
                      </span>
                    </td>
                    <td className="scan-source">
                      <span className={`source-badge source-${scan.source}`}>
                        {scan.source === 'ESP32' ? 'RobridgeAI' : (scan.source?.toUpperCase() || 'UNKNOWN')}
                      </span>
                    </td>
                    <td className="scan-category">
                      {(() => {
                        // Try to get AI analysis category from metadata
                        try {
                          const metadata = typeof scan.metadata === 'string' ? JSON.parse(scan.metadata) : scan.metadata;
                          if (metadata.aiAnalysis && metadata.aiAnalysis.category) {
                            return metadata.aiAnalysis.category;
                          }
                        } catch (e) {
                          // Fallback to database category
                        }
                        return scan.category || 'N/A';
                      })()}
                    </td>
                    <td className="scan-date">
                      {new Date(scan.saved_at || scan.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="action-cell">
                      <button
                        className="delete-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSavedScan(scan.id);
                        }}
                        title="Delete saved scan"
                      >
                        <FaTrash />
                      </button>
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
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredSavedScans.length)} of {filteredSavedScans.length} saved scans
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
            <h3>No Saved Scans Found</h3>
            <p>
              {searchTerm || filterType !== 'all' 
                ? 'No saved scans match your current search or filter criteria.'
                : 'No scans have been saved yet. Scans are automatically saved when you use the scanner.'
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

      {/* Scan Details Dialog */}
      {showScanDialog && selectedScan && (
        <div className="scan-dialog-overlay" onClick={closeScanDialog}>
          <div className="scan-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="scan-dialog-header">
              <h2>Saved Scan Details</h2>
              <button className="close-btn" onClick={closeScanDialog}>
                <FaTimes />
              </button>
            </div>
            
            <div className="scan-dialog-body">
              {/* Basic Information Section */}
              <div className="scan-info-section">
                <h3>Basic Information</h3>
                <div className="info-grid-two-columns">
                  <div className="info-column">
                    <div className="info-field">
                      <label>ID</label>
                      <span className="info-value">#{selectedScan.id}</span>
                    </div>
                    <div className="info-field">
                      <label>Barcode ID</label>
                      <span className="info-value">{selectedScan.barcode_id || 'N/A'}</span>
                    </div>
                    <div className="info-field">
                      <label>Source</label>
                      <span className="info-value source-badge">{selectedScan.source?.toUpperCase()}</span>
                    </div>
                    <div className="info-field">
                      <label>Category</label>
                      <span className="info-value">{selectedScan.category || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="info-column">
                    <div className="info-field">
                      <label>Product Name</label>
                      <span className="info-value">{selectedScan.product_name || 'N/A'}</span>
                    </div>
                    <div className="info-field">
                      <label>Price</label>
                      <span className="info-value">{selectedScan.price ? `$${selectedScan.price}` : 'N/A'}</span>
                    </div>
                    <div className="info-field">
                      <label>Type</label>
                      <span className={`type-badge type-${selectedScan.barcode_type || 'unknown'}`}>
                        {selectedScan.barcode_type?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="info-field">
                      <label>Created At</label>
                      <span className="info-value">{new Date(selectedScan.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barcode Data Section */}
              <div className="barcode-data-section">
                <h3>Barcode Data</h3>
                <div className="barcode-data-container">
                  <span className="barcode-data-text">{selectedScan.barcode_data}</span>
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
                        if (selectedScan.metadata) {
                          const metadata = typeof selectedScan.metadata === 'string' 
                            ? JSON.parse(selectedScan.metadata) 
                            : selectedScan.metadata;
                          
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
                        if (selectedScan.description) {
                          return selectedScan.description;
                        }
                        
                        // Final fallback
                        return selectedScan.product_name || 'No description available';
                      } catch (error) {
                        console.error('Error parsing metadata:', error);
                        return selectedScan.description || selectedScan.product_name || 'No description available';
                      }
                    })()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="scan-dialog-footer">
              <button className="btn btn-danger" onClick={() => {
                deleteSavedScan(selectedScan.id);
                closeScanDialog();
              }}>
                <FaTrash /> Delete Saved Scan
              </button>
              <button className="btn btn-secondary" onClick={closeScanDialog}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedScans;

