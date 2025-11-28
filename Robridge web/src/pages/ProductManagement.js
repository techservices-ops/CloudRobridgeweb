import React, { useState, useEffect } from 'react';
import { 
  FaBox, 
  FaArrowRight, 
  FaArrowLeft, 
  FaWarehouse, 
  FaBarcode, 
  FaTag,
  FaPlus,
  FaHistory,
  FaSearch,
  FaFilter,
  FaTimes,
  FaCheck,
  FaExclamationTriangle,
  FaDownload
} from 'react-icons/fa';
import './ProductManagement.css';

const ProductManagement = () => {
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movementType, setMovementType] = useState('outbound');
  const [movements, setMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [availableRacks, setAvailableRacks] = useState([]);

  const [formData, setFormData] = useState({
    productName: '',
    productId: '',
    rackId: '',
    quantity: 1,
    notes: ''
  });

  // Load movements and racks on component mount
  useEffect(() => {
    loadMovements();
    loadAvailableRacks();
  }, []);

  const loadAvailableRacks = async () => {
    try {
      const response = await fetch('https://robridgeexpress.onrender.com/api/racks');
      const data = await response.json();
      
      if (data.success) {
        setAvailableRacks(data.racks || []);
      } else {
        console.error('Failed to load racks:', data.error);
      }
    } catch (error) {
      console.error('Error loading racks:', error);
      setAvailableRacks([]);
    }
  };

  const loadMovements = async () => {
    try {
      setIsLoading(true);
      // In a real app, this would load from API
      const savedMovements = localStorage.getItem('productMovements');
      if (savedMovements) {
        setMovements(JSON.parse(savedMovements));
      } else {
        // Sample data for demonstration
        setMovements([
          {
            id: 1,
            type: 'inbound',
            productName: 'Widget A',
            productId: 'WID-001',
            rackId: 'Rack A-01',
            quantity: 50,
            notes: 'Initial stock',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            status: 'completed'
          },
          {
            id: 2,
            type: 'outbound',
            productName: 'Gadget B',
            productId: 'GAD-002',
            rackId: 'Rack B-02',
            quantity: 25,
            notes: 'Order fulfillment',
            timestamp: new Date(Date.now() - 172800000).toISOString(),
            status: 'completed'
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading movements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRecordMovement = async () => {
    // Validation
    if (!formData.productName.trim()) {
      alert('Product Name is required');
      return;
    }
    if (!formData.productId.trim()) {
      alert('Product ID is required');
      return;
    }
    if (formData.quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    setIsSaving(true);
    try {
      const newMovement = {
        id: Date.now(),
        type: movementType,
        productName: formData.productName.trim(),
        productId: formData.productId.trim(),
        rackId: formData.rackId.trim() || null,
        quantity: parseInt(formData.quantity),
        notes: formData.notes.trim() || null,
        timestamp: new Date().toISOString(),
        status: 'completed'
      };

      // Update rack quantity if rack ID is provided
      if (formData.rackId) {
        try {
          const rackUpdateResponse = await fetch(`https://robridgeexpress.onrender.com/api/racks/${formData.rackId}/update-quantity`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: movementType,
              quantity: parseInt(formData.quantity)
            })
          });

          const rackUpdateData = await rackUpdateResponse.json();
          
          if (rackUpdateData.success) {
            console.log(`Rack quantity updated: ${rackUpdateData.old_quantity} → ${rackUpdateData.new_quantity}`);
            // Reload available racks to show updated quantities
            loadAvailableRacks();
          } else {
            console.warn('Failed to update rack quantity:', rackUpdateData.error);
          }
        } catch (error) {
          console.error('Error updating rack quantity:', error);
          // Don't block the movement recording if rack update fails
        }
      }

      const updatedMovements = [newMovement, ...movements];
      setMovements(updatedMovements);
      localStorage.setItem('productMovements', JSON.stringify(updatedMovements));

      // Reset form
      setFormData({
        productName: '',
        productId: '',
        rackId: '',
        quantity: 1,
        notes: ''
      });
      setShowMovementForm(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

    } catch (error) {
      console.error('Error recording movement:', error);
      alert('Failed to record movement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setShowMovementForm(false);
    setFormData({
      productName: '',
      productId: '',
      rackId: '',
      quantity: 1,
      notes: ''
    });
  };

  // Export movements to CSV
  const exportToCSV = () => {
    if (movements.length === 0) {
      alert('No movements to export');
      return;
    }

    // Prepare CSV headers
    const headers = [
      'S.No',
      'Date',
      'Time',
      'Product Name',
      'Product ID',
      'Rack ID',
      'Movement Type',
      'Quantity',
      'Notes'
    ];

    // Prepare data for CSV
    const csvData = movements.map((movement, index) => [
      index + 1,
      new Date(movement.timestamp).toLocaleDateString(),
      new Date(movement.timestamp).toLocaleTimeString(),
      movement.productName,
      movement.productId,
      movement.rackId || 'N/A',
      movement.type.charAt(0).toUpperCase() + movement.type.slice(1),
      movement.quantity,
      movement.notes || 'N/A'
    ]);

    // Combine headers and data
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `product_movements_${timestamp}.csv`;
      
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const filteredMovements = movements.filter(movement => {
    const matchesSearch = 
      movement.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.productId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (movement.rackId && movement.rackId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterType === 'all' || movement.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const getMovementIcon = (type) => {
    return type === 'inbound' ? <FaArrowLeft /> : <FaArrowRight />;
  };

  const getMovementColor = (type) => {
    return type === 'inbound' ? '#34A853' : '#EA4335';
  };

  const stats = {
    total: movements.length,
    inbound: movements.filter(m => m.type === 'inbound').length,
    outbound: movements.filter(m => m.type === 'outbound').length,
    totalQuantity: movements.reduce((sum, m) => sum + m.quantity, 0)
  };

  return (
    <div className="product-management">
      <div className="product-header">
        <div className="header-content">
          <FaBox className="header-icon" />
          <h1>Product Management</h1>
          <p>Track product movements and inventory changes</p>
        </div>
        {showSuccess && (
          <div className="success-message">
            <FaCheck />
            Movement recorded successfully!
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <FaBox />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Movements</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon inbound">
            <FaArrowLeft />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.inbound}</div>
            <div className="stat-label">Inbound</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon outbound">
            <FaArrowRight />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.outbound}</div>
            <div className="stat-label">Outbound</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon quantity">
            <FaWarehouse />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalQuantity}</div>
            <div className="stat-label">Total Quantity</div>
          </div>
        </div>
      </div>

      <div className="product-content">
        {/* Controls Section */}
        <div className="controls-section">
          <div className="search-filter">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search products, IDs, or racks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="filter-box">
              <FaFilter className="filter-icon" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Types</option>
                <option value="inbound">Inbound</option>
                <option value="outbound">Outbound</option>
              </select>
            </div>
          </div>

          <div className="header-buttons">
            <button 
              className="btn btn-primary"
              onClick={() => setShowMovementForm(true)}
            >
              <FaPlus />
              Record Movement
            </button>
            
            <button 
              className="btn btn-success"
              onClick={exportToCSV}
              disabled={movements.length === 0}
              title="Export movements to CSV"
            >
              <FaDownload />
              Export CSV
            </button>
          </div>
        </div>

        {/* Movement Recording Form */}
        {showMovementForm && (
          <div className="movement-form-overlay">
            <div className="movement-form">
              <div className="form-header">
                <h2>Record Product Movement</h2>
                <button className="close-btn" onClick={handleCancel}>
                  <FaTimes />
                </button>
              </div>

              <div className="form-content">
                {/* Movement Type Selection */}
                <div className="movement-type-section">
                  <label className="form-label">Movement Type</label>
                  <div className="movement-type-buttons">
                    <button
                      className={`movement-type-btn ${movementType === 'outbound' ? 'active' : ''}`}
                      onClick={() => setMovementType('outbound')}
                    >
                      <FaArrowRight />
                      Outbound
                    </button>
                    <button
                      className={`movement-type-btn ${movementType === 'inbound' ? 'active' : ''}`}
                      onClick={() => setMovementType('inbound')}
                    >
                      <FaArrowLeft />
                      Inbound
                    </button>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="form-fields">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        Product Name <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.productName}
                        onChange={(e) => handleInputChange('productName', e.target.value)}
                        className="form-input"
                        placeholder="Enter product name"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">
                        Product ID <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.productId}
                        onChange={(e) => handleInputChange('productId', e.target.value)}
                        className="form-input"
                        placeholder="Enter product ID"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        <FaWarehouse style={{ marginRight: '5px' }} />
                        Rack (Optional)
                      </label>
                      <select
                        value={formData.rackId}
                        onChange={(e) => handleInputChange('rackId', e.target.value)}
                        className="form-input"
                      >
                        <option value="">Select a rack (optional)</option>
                        {availableRacks.map(rack => (
                          <option key={rack.id} value={rack.id}>
                            ID: {rack.id} - {rack.rackName} ({rack.productName})
                          </option>
                        ))}
                      </select>
                      {availableRacks.length === 0 && (
                        <small style={{ color: '#999', fontSize: '12px' }}>
                          No racks available. Create racks in Rack Management first.
                        </small>
                      )}
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Quantity</label>
                      <input
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                        className="form-input"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      className="form-textarea"
                      placeholder="Enter notes (optional)"
                      rows="3"
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="form-actions">
                  <button 
                    className="btn btn-primary"
                    onClick={handleRecordMovement}
                    disabled={isSaving}
                  >
                    <FaCheck />
                    {isSaving ? 'Recording...' : 'Record Movement'}
                  </button>
                  
                  <button 
                    className="btn btn-secondary"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    <FaTimes />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Movements List */}
        <div className="movements-section">
          <div className="section-header">
            <h2>Product Movements ({filteredMovements.length})</h2>
          </div>

          {isLoading ? (
            <div className="loading-state">
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Loading movements...</p>
              </div>
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="empty-state">
              <FaHistory className="empty-icon" />
              <h3>No movements found</h3>
              <p>No movements match your current search or filter criteria.</p>
            </div>
          ) : (
            <div className="movements-list">
              {filteredMovements.map(movement => (
                <div key={movement.id} className="movement-card">
                  <div className="movement-header">
                    <div className="movement-type">
                      <div 
                        className="movement-icon"
                        style={{ color: getMovementColor(movement.type) }}
                      >
                        {getMovementIcon(movement.type)}
                      </div>
                      <span className="movement-type-text">
                        {movement.type.charAt(0).toUpperCase() + movement.type.slice(1)}
                      </span>
                    </div>
                    <div className="movement-time">
                      {new Date(movement.timestamp).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="movement-details">
                    <div className="product-info">
                      <div className="product-name">
                        <FaBox className="product-icon" />
                        {movement.productName}
                      </div>
                      <div className="product-id">
                        <FaBarcode className="barcode-icon" />
                        {movement.productId}
                      </div>
                    </div>
                    
                    <div className="movement-info">
                      {movement.rackId && (
                        <div className="rack-info">
                          <FaWarehouse className="rack-icon" />
                          {movement.rackId}
                        </div>
                      )}
                      <div className="quantity-info">
                        <FaTag className="quantity-icon" />
                        {movement.quantity} units
                      </div>
                    </div>
                    
                    {movement.notes && (
                      <div className="notes-info">
                        <p>{movement.notes}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="movement-status">
                    <span className={`status-badge ${movement.status}`}>
                      {movement.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductManagement;
