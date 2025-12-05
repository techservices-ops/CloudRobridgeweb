import React, { useState, useEffect } from 'react';
import { 
  FaWarehouse,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaSync,
  FaSearch,
  FaFilter,
  FaDownload,
  FaPlus,
  FaEdit,
  FaTrash,
  FaInfoCircle
} from 'react-icons/fa';
import './RackStatus.css';

const RackStatus = () => {
  const [racks, setRacks] = useState([]);

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRack, setSelectedRack] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    occupied: 0,
    free: 0,
    maintenance: 0,
    utilization: 0
  });

  // Load rack status data from database
  const loadRackStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('https://robridgeexpress.onrender.com/api/rack-status');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setRacks(data.racks);
        setStats(data.stats);
      } else {
        console.error('Failed to load rack status:', data.error);
        alert('Failed to load rack status: ' + data.error);
      }
    } catch (error) {
      console.error('Error loading rack status:', error);
      alert('Error loading rack status: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadRackStatus();
  }, []);

  // Simulate real-time updates (update environmental data)
  useEffect(() => {
    const interval = setInterval(() => {
      setRacks(prevRacks => 
        prevRacks.map(rack => ({
          ...rack,
          lastUpdated: new Date().toLocaleString(),
          temperature: (parseFloat(rack.temperature || 20) + (Math.random() - 0.5) * 0.5).toFixed(1),
          humidity: Math.max(30, Math.min(60, parseFloat(rack.humidity || 45) + (Math.random() - 0.5) * 2))
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'occupied':
        return <FaCheckCircle className="status-icon occupied" />;
      case 'free':
        return <FaTimesCircle className="status-icon free" />;
      case 'maintenance':
        return <FaExclamationTriangle className="status-icon maintenance" />;
      default:
        return <FaInfoCircle className="status-icon" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'occupied':
        return '#EA4335';
      case 'free':
        return '#34A853';
      case 'maintenance':
        return '#FBBC05';
      default:
        return '#9AA0A6';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'occupied':
        return 'Occupied';
      case 'free':
        return 'Free';
      case 'maintenance':
        return 'Maintenance';
      default:
        return 'Unknown';
    }
  };

  const filteredRacks = racks.filter(rack => {
    const matchesStatus = filterStatus === 'all' || rack.status === filterStatus;
    const matchesSearch = rack.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rack.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (rack.occupiedBy && rack.occupiedBy.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const refreshData = () => {
    setIsRefreshing(true);
    loadRackStatus().finally(() => {
      setIsRefreshing(false);
    });
  };

  const exportData = () => {
    const csvContent = [
      ['Rack Name', 'Location', 'Status', 'Occupied By', 'Capacity', 'Current Load', 'Temperature', 'Humidity', 'Last Updated'],
      ...filteredRacks.map(rack => [
        rack.name,
        rack.location,
        getStatusText(rack.status),
        rack.occupiedBy || 'N/A',
        rack.capacity,
        rack.currentLoad,
        rack.temperature,
        rack.humidity,
        rack.lastUpdated
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rack-status-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Stats are now loaded from the database

  return (
    <div className="rack-status-container">
      <div className="rack-status-header">
        <div className="header-content">
          <h1>Rack Status</h1>
          <p>Monitor warehouse rack occupancy and status in real-time</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={refreshData} disabled={isRefreshing}>
            <FaSync className={isRefreshing ? 'spinning' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button className="btn btn-success" onClick={exportData}>
            <FaDownload />
            Export CSV
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <FaWarehouse />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Racks</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon occupied">
            <FaCheckCircle />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.occupied}</div>
            <div className="stat-label">Occupied</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon free">
            <FaTimesCircle />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.free}</div>
            <div className="stat-label">Free</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon maintenance">
            <FaExclamationTriangle />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.maintenance}</div>
            <div className="stat-label">Maintenance</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon utilization">
            <FaInfoCircle />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.utilization}%</div>
            <div className="stat-label">Utilization</div>
          </div>
        </div>
      </div>

      <div className="controls-section">
        <div className="search-controls">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search racks by name, location, or robot..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-controls">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="occupied">Occupied</option>
              <option value="free">Free</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      <div className="racks-grid">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading rack status...</p>
            </div>
          </div>
        ) : filteredRacks.length === 0 ? (
          <div className="empty-state">
            <FaWarehouse className="empty-icon" />
            <h3>No racks found</h3>
            <p>No racks match your current search or filter criteria.</p>
          </div>
        ) : (
          filteredRacks.map(rack => (
          <div 
            key={rack.id} 
            className={`rack-card ${rack.status} ${selectedRack?.id === rack.id ? 'selected' : ''}`}
            onClick={() => setSelectedRack(rack)}
          >
            <div className="rack-header">
              <div className="rack-name">{rack.name}</div>
              <div className="rack-status">
                {getStatusIcon(rack.status)}
                <span style={{ color: getStatusColor(rack.status) }}>
                  {getStatusText(rack.status)}
                </span>
              </div>
            </div>
            
            <div className="rack-details">
              <div className="detail-item">
                <FaMapMarkerAlt className="detail-icon" />
                <span className="detail-label">Location:</span>
                <span className="detail-value">{rack.location}</span>
              </div>
              
              {rack.occupiedBy && (
                <div className="detail-item">
                  <FaWarehouse className="detail-icon" />
                  <span className="detail-label">Occupied by:</span>
                  <span className="detail-value">{rack.occupiedBy}</span>
                </div>
              )}
              
              <div className="detail-item">
                <span className="detail-label">Capacity:</span>
                <span className="detail-value">{rack.currentLoad}% / {rack.capacity}%</span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Temperature:</span>
                <span className="detail-value">{parseFloat(rack.temperature || 20).toFixed(1)}°C</span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Humidity:</span>
                <span className="detail-value">{Math.round(parseFloat(rack.humidity || 45))}%</span>
              </div>
            </div>
            
            <div className="rack-footer">
              <div className="last-updated">
                Last updated: {rack.lastUpdated}
              </div>
            </div>
          </div>
          ))
        )}
      </div>

      {selectedRack && (
        <div className="rack-modal-overlay" onClick={() => setSelectedRack(null)}>
          <div className="rack-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedRack.name} - Details</h2>
              <button 
                className="close-btn"
                onClick={() => setSelectedRack(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="modal-section">
                <h3>Status Information</h3>
                <div className="modal-details">
                  <div className="modal-detail-item">
                    <span className="modal-label">Status:</span>
                    <span 
                      className="modal-value"
                      style={{ color: getStatusColor(selectedRack.status) }}
                    >
                      {getStatusText(selectedRack.status)}
                    </span>
                  </div>
                  <div className="modal-detail-item">
                    <span className="modal-label">Location:</span>
                    <span className="modal-value">{selectedRack.location}</span>
                  </div>
                  <div className="modal-detail-item">
                    <span className="modal-label">Coordinates:</span>
                    <span className="modal-value">X: {selectedRack.coordinates.x}, Y: {selectedRack.coordinates.y}</span>
                  </div>
                  {selectedRack.occupiedBy && (
                    <div className="modal-detail-item">
                      <span className="modal-label">Occupied by:</span>
                      <span className="modal-value">{selectedRack.occupiedBy}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="modal-section">
                <h3>Environmental Data</h3>
                <div className="modal-details">
                  <div className="modal-detail-item">
                    <span className="modal-label">Temperature:</span>
                    <span className="modal-value">{parseFloat(selectedRack.temperature || 20).toFixed(1)}°C</span>
                  </div>
                  <div className="modal-detail-item">
                    <span className="modal-label">Humidity:</span>
                    <span className="modal-value">{Math.round(parseFloat(selectedRack.humidity || 45))}%</span>
                  </div>
                  <div className="modal-detail-item">
                    <span className="modal-label">Capacity:</span>
                    <span className="modal-value">{selectedRack.currentLoad}% / {selectedRack.capacity}%</span>
                  </div>
                </div>
              </div>
              
              <div className="modal-section">
                <h3>Last Updated</h3>
                <div className="modal-details">
                  <div className="modal-detail-item">
                    <span className="modal-value">{selectedRack.lastUpdated}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RackStatus;
