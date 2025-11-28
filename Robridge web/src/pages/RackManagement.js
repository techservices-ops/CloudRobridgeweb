import React, { useState, useEffect } from 'react';
import { 
  FaWarehouse, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaSave, 
  FaTimes,
  FaSearch,
  FaFilter,
  FaBox,
  FaBarcode,
  FaTag
} from 'react-icons/fa';
import './RackManagement.css';

const RackManagement = () => {
  const [racks, setRacks] = useState([]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRack, setEditingRack] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRacks: 0,
    activeRacks: 0,
    inactiveRacks: 0,
    uniqueProducts: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [isInitializingDB, setIsInitializingDB] = useState(false);

  const [formData, setFormData] = useState({
    rackName: '',
    productName: '',
    productId: '',
    quantity: 0
  });

  // Load racks and stats on component mount
  useEffect(() => {
    checkConnection();
    loadRacks();
    loadStats();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch('https://robridgeexpress.onrender.com/api/health');
      if (response.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnectionStatus('error');
    }
  };

  // Load racks when search or filter changes
  useEffect(() => {
    loadRacks();
  }, [searchTerm, filterStatus]);

  const loadRacks = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      
      console.log('Loading racks with params:', params.toString());
      const serverURL = process.env.NODE_ENV === 'production' 
        ? 'https://robridgeexpress.onrender.com' 
        : 'http://localhost:3001';
      const response = await fetch(`${serverURL}/api/racks?${params.toString()}`);
      console.log('Racks response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      let data;
      try {
        data = await response.json();
        console.log('Racks response data:', data);
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError);
        const textResponse = await response.text();
        console.error('Response text:', textResponse);
        throw new Error(`Invalid JSON response. Server might not be running on port 3001. Response: ${textResponse.substring(0, 100)}...`);
      }
      
      if (data.success) {
        setRacks(data.racks);
      } else {
        console.error('Failed to load racks:', data.error);
        
        // Check if it's a database table error
        if (data.error && data.error.includes('no such table: racks')) {
          console.log('Database table not found, suggesting initialization...');
          // Don't show alert, just log the error
          // The user can click the Initialize Database button
        } else {
          alert('Failed to load racks: ' + data.error);
        }
      }
    } catch (error) {
      console.error('Error loading racks:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Don't show alert for connection errors, just log them
      if (!error.message.includes('Failed to fetch')) {
        alert('Error loading racks: ' + error.message + '\n\nPlease check if the backend server is running.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      console.log('Loading stats...');
      const response = await fetch('https://robridgeexpress.onrender.com/api/racks/stats');
      console.log('Stats response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      let data;
      try {
        data = await response.json();
        console.log('Stats response data:', data);
      } catch (jsonError) {
        console.error('JSON parsing error for stats:', jsonError);
        const textResponse = await response.text();
        console.error('Stats response text:', textResponse);
        throw new Error(`Invalid JSON response for stats. Server might not be running on port 3001. Response: ${textResponse.substring(0, 100)}...`);
      }
      
      if (data.success) {
        setStats(data.stats);
      } else {
        console.error('Failed to load stats:', data.error);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddRack = async () => {
    if (!formData.rackName || !formData.productName || !formData.productId) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (formData.quantity < 0) {
      alert('Quantity cannot be negative');
      return;
    }

    setIsSaving(true);
    
    try {
      const response = await fetch('https://robridgeexpress.onrender.com/api/racks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setFormData({ rackName: '', productName: '', productId: '', quantity: 0 });
        setShowAddForm(false);
        loadRacks(); // Reload racks
        loadStats(); // Reload stats
        alert('Rack added successfully!');
      } else {
        alert('Failed to add rack: ' + data.error);
      }
    } catch (error) {
      console.error('Error adding rack:', error);
      alert('Error adding rack: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditRack = (rack) => {
    setEditingRack(rack);
    setFormData({
      rackName: rack.rackName,
      productName: rack.productName,
      productId: rack.productId,
      quantity: rack.quantity || 0
    });
  };

  const handleUpdateRack = async () => {
    if (!formData.rackName || !formData.productName || !formData.productId) {
      alert('Please fill in all fields');
      return;
    }

    setIsSaving(true);
    
    try {
      const response = await fetch(`https://robridgeexpress.onrender.com/api/racks/${editingRack.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEditingRack(null);
        setFormData({ rackName: '', productName: '', productId: '' });
        loadRacks(); // Reload racks
        loadStats(); // Reload stats
        alert('Rack updated successfully!');
      } else {
        alert('Failed to update rack: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating rack:', error);
      alert('Error updating rack: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRack = async (rackId) => {
    if (window.confirm('Are you sure you want to delete this rack?')) {
      try {
        const response = await fetch(`https://robridgeexpress.onrender.com/api/racks/${rackId}`, {
          method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
          loadRacks(); // Reload racks
          loadStats(); // Reload stats
          alert('Rack deleted successfully!');
        } else {
          alert('Failed to delete rack: ' + data.error);
        }
      } catch (error) {
        console.error('Error deleting rack:', error);
        alert('Error deleting rack: ' + error.message);
      }
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingRack(null);
    setFormData({ rackName: '', productName: '', productId: '' });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      alert('Please enter a rack ID or rack name to search');
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`https://robridgeexpress.onrender.com/api/racks/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.racks);
        setShowSearchResults(true);
        if (data.count === 0) {
          alert('No racks found matching your search criteria');
        }
      } else {
        alert('Search failed: ' + data.error);
      }
    } catch (error) {
      console.error('Error searching racks:', error);
      alert('Error searching racks: ' + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const initializeDatabase = async () => {
    setIsInitializingDB(true);
    try {
      console.log('Initializing database...');
      const response = await fetch('https://robridgeexpress.onrender.com/api/init-db', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Database initialization response:', data);
      
      if (data.success) {
        alert('Database initialized successfully! The page will now load properly.');
        // Reload the page to ensure everything works
        window.location.reload();
      } else {
        alert('Failed to initialize database: ' + data.error);
      }
    } catch (error) {
      console.error('Error initializing database:', error);
      alert('Error initializing database: ' + error.message + '\n\nPlease make sure both servers are running.');
    } finally {
      setIsInitializingDB(false);
    }
  };

  const statsData = [
    { label: 'Total Racks', value: stats.totalRacks, icon: FaWarehouse, color: '#E3821E' },
    { label: 'Active Racks', value: stats.activeRacks, icon: FaBox, color: '#34A853' },
    { label: 'Inactive Racks', value: stats.inactiveRacks, icon: FaBox, color: '#EA4335' },
    { label: 'Products', value: stats.uniqueProducts, icon: FaTag, color: '#007ACC' }
  ];

  return (
    <div className="rack-management">
      <div className="rack-header">
        <h1>Rack Management</h1>
        <p>Manage warehouse racks, products, and inventory locations</p>
        <div className="connection-status">
          <div className={`status-indicator ${connectionStatus}`}>
            {connectionStatus === 'checking' && '🔄 Checking connection...'}
            {connectionStatus === 'connected' && '✅ Connected to backend'}
            {connectionStatus === 'error' && '❌ Backend connection failed'}
          </div>
          {connectionStatus === 'connected' && (
            <div className="db-init-section">
              <button 
                className="btn btn-secondary init-db-btn"
                onClick={initializeDatabase}
                disabled={isInitializingDB}
              >
                {isInitializingDB ? '🔄 Initializing...' : '🗄️ Initialize Database'}
              </button>
              <p className="db-init-help">
                If you see "no such table: racks" error, click this button to set up the database.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="stat-card" style={{ borderLeftColor: stat.color }}>
              <div className="stat-icon" style={{ color: stat.color }}>
                <Icon />
              </div>
              <div className="stat-content">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rack-content">
        {/* Quick Search Section */}
        <div className="quick-search-section">
          <div className="search-header">
            <h3>Quick Search</h3>
            <p>Search by Rack ID or Rack Name to find product information</p>
          </div>
          
          <form onSubmit={handleSearch} className="quick-search-form">
            <div className="search-input-group">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Enter Rack ID or Rack Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                disabled={isSearching}
              />
              <button 
                type="submit" 
                className="btn btn-primary search-btn"
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
              {showSearchResults && (
                <button 
                  type="button" 
                  className="btn btn-secondary clear-btn"
                  onClick={clearSearch}
                >
                  <FaTimes />
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Search Results */}
        {showSearchResults && (
          <div className="search-results-section">
            <div className="search-results-header">
              <h3>Search Results ({searchResults.length})</h3>
              <p>Found {searchResults.length} rack(s) matching "{searchQuery}"</p>
            </div>
            
            {searchResults.length > 0 ? (
              <div className="search-results-grid">
                {searchResults.map(rack => (
                  <div key={rack.id} className="search-result-card">
                    <div className="result-header">
                      <div className="rack-info">
                        <FaWarehouse className="rack-icon" />
                        <div>
                          <h4>{rack.rackName}</h4>
                          <span className="rack-id">ID: {rack.id}</span>
                        </div>
                      </div>
                      <span className={`status-badge ${rack.status}`}>
                        {rack.status}
                      </span>
                    </div>
                    
                    <div className="product-info">
                      <div className="product-detail">
                        <FaBox className="product-icon" />
                        <div>
                          <label>Product Name:</label>
                          <span>{rack.productName}</span>
                        </div>
                      </div>
                      <div className="product-detail">
                        <FaTag className="product-id-icon" />
                        <div>
                          <label>Product ID:</label>
                          <span className="product-id-text">{rack.productId}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="result-footer">
                      <div className="date-info">
                        <span>Created: {new Date(rack.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="result-actions">
                        <button 
                          className="btn-icon edit-btn"
                          onClick={() => handleEditRack(rack)}
                          title="Edit Rack"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          className="btn-icon delete-btn"
                          onClick={() => handleDeleteRack(rack.id)}
                          title="Delete Rack"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-results">
                <FaSearch className="no-results-icon" />
                <h4>No results found</h4>
                <p>No racks match your search criteria. Try a different search term.</p>
              </div>
            )}
          </div>
        )}

        {/* Controls Section */}
        <div className="controls-section">
          <div className="search-filter">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search racks, products, or IDs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="filter-box">
              <FaFilter className="filter-icon" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <button 
            className="btn btn-primary"
            onClick={() => setShowAddForm(true)}
          >
            <FaPlus />
            Add New Rack
          </button>
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingRack) && (
          <div className="form-section">
            <div className="form-header">
              <h3>{editingRack ? 'Edit Rack' : 'Add New Rack'}</h3>
              <button className="close-btn" onClick={handleCancel}>
                <FaTimes />
              </button>
            </div>
            
            <div className="form-content">
              <div className="form-row">
                <div className="form-group">
                  <label className="label">Rack Name *</label>
                  <input
                    type="text"
                    value={formData.rackName}
                    onChange={(e) => handleInputChange('rackName', e.target.value)}
                    className="input"
                    placeholder="e.g., Rack A-01"
                  />
                </div>
                
                <div className="form-group">
                  <label className="label">Product Name *</label>
                  <input
                    type="text"
                    value={formData.productName}
                    onChange={(e) => handleInputChange('productName', e.target.value)}
                    className="input"
                    placeholder="e.g., Widget A"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Product ID *</label>
                <input
                  type="text"
                  value={formData.productId}
                  onChange={(e) => handleInputChange('productId', e.target.value)}
                  className="input"
                  placeholder="e.g., WID-001"
                />
              </div>

              <div className="form-group">
                <label className="label">Initial Quantity</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
                  className="input"
                  min="0"
                  placeholder="0"
                />
              </div>

              <div className="form-actions">
                <button 
                  className="btn btn-primary"
                  onClick={editingRack ? handleUpdateRack : handleAddRack}
                  disabled={isSaving}
                >
                  <FaSave />
                  {isSaving ? 'Saving...' : (editingRack ? 'Update Rack' : 'Add Rack')}
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
        )}

        {/* Racks Table */}
        <div className="racks-section">
          <div className="section-header">
            <h2>Racks ({racks.length})</h2>
          </div>

          {isLoading ? (
            <div className="loading-state">
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Loading racks...</p>
              </div>
            </div>
          ) : racks.length === 0 ? (
            <div className="empty-state">
              <FaWarehouse className="empty-icon" />
              <h3>No racks found</h3>
              <p>No racks match your current search or filter criteria.</p>
            </div>
          ) : (
            <div className="racks-table">
              <div className="table-header">
                <div className="table-cell">Rack Name</div>
                <div className="table-cell">Product Name</div>
                <div className="table-cell">Product ID</div>
                <div className="table-cell">Quantity</div>
                <div className="table-cell">Created</div>
                <div className="table-cell">Actions</div>
              </div>
              
              {racks.map(rack => (
                <div key={rack.id} className="table-row">
                  <div className="table-cell">
                    <div className="rack-name">
                      <FaWarehouse className="rack-icon" />
                      {rack.rackName}
                    </div>
                  </div>
                  <div className="table-cell">
                    <div className="product-name">
                      <FaBox className="product-icon" />
                      {rack.productName}
                    </div>
                  </div>
                  <div className="table-cell">
                    <div className="product-id">
                      <FaTag className="product-id-icon" />
                      <span className="product-id-text">{rack.productId}</span>
                    </div>
                  </div>
                  <div className="table-cell">
                    <span className="quantity-badge">
                      {rack.quantity || 0} units
                    </span>
                  </div>
                  <div className="table-cell">
                    {new Date(rack.createdAt).toLocaleDateString()}
                  </div>
                  <div className="table-cell">
                    <div className="action-buttons">
                      <button 
                        className="btn-icon edit-btn"
                        onClick={() => handleEditRack(rack)}
                        title="Edit Rack"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        className="btn-icon delete-btn"
                        onClick={() => handleDeleteRack(rack.id)}
                        title="Delete Rack"
                      >
                        <FaTrash />
                      </button>
                    </div>
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

export default RackManagement;
