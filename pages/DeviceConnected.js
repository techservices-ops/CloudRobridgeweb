import React, { useState } from 'react';
import { 
  FaBarcode,
  FaTimesCircle,
  FaSync,
  FaSearch,
  FaFilter,
  FaDownload,
  FaEdit,
  FaInfoCircle,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCog,
  FaSignal,
  FaBatteryFull,
  FaBatteryThreeQuarters,
  FaBatteryHalf,
  FaBatteryQuarter,
  FaBatteryEmpty,
  FaClock,
  FaMapMarkerAlt,
  FaMicrochip
} from 'react-icons/fa';
import { useWebSocket } from '../contexts/WebSocketContext';
import './DeviceConnected.css';

const DeviceConnected = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showConfigure, setShowConfigure] = useState(false);
  const { isConnected, esp32Devices, latestScan } = useWebSocket();


  const getBatteryIcon = (level) => {
    if (level >= 80) return <FaBatteryFull />;
    if (level >= 60) return <FaBatteryThreeQuarters />;
    if (level >= 40) return <FaBatteryHalf />;
    if (level >= 20) return <FaBatteryQuarter />;
    return <FaBatteryEmpty />;
  };

  const getBatteryColor = (level) => {
    if (level >= 60) return '#4CAF50';
    if (level >= 30) return '#FF9800';
    return '#F44336';
  };

  const getSignalIcon = (strength) => {
    if (strength >= 80) return <FaSignal />;
    if (strength >= 60) return <FaSignal />;
    if (strength >= 40) return <FaSignal />;
    return <FaSignal />;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return '#4CAF50';
      case 'disconnected': return '#F44336';
      default: return '#9AA0A6';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': return <FaCheckCircle />;
      case 'disconnected': return <FaTimesCircle />;
      default: return <FaExclamationTriangle />;
    }
  };

  const filteredDevices = esp32Devices.filter(device => {
    const matchesSearch = device.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.deviceId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || device.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const sortedDevices = [...filteredDevices].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.deviceName.localeCompare(b.deviceName);
      case 'status':
        return a.status.localeCompare(b.status);
      case 'lastSeen':
        return new Date(b.lastSeen) - new Date(a.lastSeen);
      case 'scanCount':
        return (b.totalScans || 0) - (a.totalScans || 0);
      default:
        return 0;
    }
  });

  const refreshDevices = async () => {
    try {
      const response = await fetch('https://robridgeexpress.onrender.com/api/esp32/devices');
      const data = await response.json();
      if (data.success) {
        // The WebSocket context will handle updating the devices
        console.log('Devices refreshed:', data.devices);
      }
    } catch (error) {
      console.error('Error refreshing devices:', error);
    }
  };

  const exportDeviceData = () => {
    const csvContent = [
      ['Device Name', 'Device ID', 'Status', 'IP Address', 'Last Seen', 'Total Scans'],
      ...esp32Devices.map(device => [
        device.deviceName,
        device.deviceId,
        device.status,
        device.ipAddress,
        device.lastSeen,
        device.totalScans || 0
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'esp32_devices.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDetails = (device) => {
    setSelectedDevice(device);
    setShowDetails(true);
  };

  const handleConfigure = (device) => {
    setSelectedDevice(device);
    setShowConfigure(true);
  };

  const closeModal = () => {
    setShowDetails(false);
    setShowConfigure(false);
    setSelectedDevice(null);
  };

  return (
    <div className="device-connected">
      <div className="device-header">
        <h1>Device Connected</h1>
        <p>Monitor and manage connected Device Connected barcode scanners</p>
      </div>

      {/* Connection Status */}
      <div className="connection-status">
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          <FaSignal />
          WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
        </div>
        <div className="device-count">
          <FaMicrochip />
          Device Connected: {esp32Devices.length}
        </div>
      </div>

      {/* Controls */}
      <div className="device-controls">
        <div className="search-section">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            className="filter-btn"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter />
            Filters
          </button>
        </div>

        <div className="action-buttons">
          <button className="btn btn-secondary" onClick={refreshDevices}>
            <FaSync />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={exportDeviceData}>
            <FaDownload />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All</option>
              <option value="connected">Connected</option>
              <option value="disconnected">Disconnected</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name">Name</option>
              <option value="status">Status</option>
              <option value="lastSeen">Last Seen</option>
              <option value="scanCount">Scan Count</option>
            </select>
          </div>
        </div>
      )}

      {/* Latest Scan Info */}
      {latestScan && (
        <div className="latest-scan-info">
          <h3>Latest Device Connected Scan</h3>
          <div className="scan-details">
            <p><strong>Device:</strong> {latestScan.deviceName}</p>
            <p><strong>Barcode:</strong> {latestScan.barcodeData}</p>
            <p><strong>Time:</strong> {new Date(latestScan.timestamp).toLocaleString()}</p>
            <p><strong>Type:</strong> {latestScan.scanType}</p>
          </div>
        </div>
      )}

      {/* Device Grid */}
      <div className="device-grid">
        {sortedDevices.length > 0 ? (
          sortedDevices.map((device) => (
            <div key={device.deviceId} className="device-card">
              <div className="device-header">
                <div className="device-info">
                  <h3>{device.deviceName}</h3>
                  <p className="device-id">{device.deviceId}</p>
                </div>
                <div className="device-status">
                  <span 
                    className="status-badge"
                    style={{ color: getStatusColor(device.status) }}
                  >
                    {getStatusIcon(device.status)}
                    {device.status}
                  </span>
                </div>
              </div>

              <div className="device-details">
                <div className="detail-row">
                  <FaMapMarkerAlt />
                  <span>IP: {device.ipAddress}</span>
                </div>
                <div className="detail-row">
                  <FaClock />
                  <span>Last Seen: {new Date(device.lastSeen).toLocaleString()}</span>
                </div>
                <div className="detail-row">
                  <FaBarcode />
                  <span>Total Scans: {device.totalScans || 0}</span>
                </div>
                <div className="detail-row">
                  <FaCog />
                  <span>Firmware: {device.firmwareVersion}</span>
                </div>
                <div className="detail-row">
                  <FaMicrochip />
                  <span>AI Capability: {device.deviceName && device.deviceName.toUpperCase().includes('AI') ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>

              <div className="device-metrics">
                <div className="metric">
                  <div className="metric-label">Signal</div>
                  <div className="metric-value">
                    <FaSignal />
                    <span>Strong</span>
                  </div>
                </div>
                <div className="metric">
                  <div className="metric-label">Battery</div>
                  <div className="metric-value">
                    {getBatteryIcon(85)}
                    <span>85%</span>
                  </div>
                </div>
              </div>

              <div className="device-actions">
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleDetails(device)}
                >
                  <FaInfoCircle />
                  Details
                </button>
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => handleConfigure(device)}
                >
                  <FaEdit />
                  Configure
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-devices">
            <FaMicrochip size={64} />
            <h3>No Device Connected Devices</h3>
            <p>Waiting for Device Connected devices to connect...</p>
            <p>Make sure your Device Connected is powered on and connected to WiFi.</p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && selectedDevice && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Device Details</h2>
              <button className="close-btn" onClick={closeModal}>
                <FaTimesCircle />
              </button>
            </div>
            <div className="modal-body">
              <div className="device-details-grid">
                <div className="detail-section">
                  <h3>Basic Information</h3>
                  <div className="detail-item">
                    <strong>Device Name:</strong> {selectedDevice.deviceName}
                  </div>
                  <div className="detail-item">
                    <strong>Device ID:</strong> {selectedDevice.deviceId}
                  </div>
                  <div className="detail-item">
                    <strong>Status:</strong> 
                    <span className="status-badge" style={{ color: getStatusColor(selectedDevice.status) }}>
                      {getStatusIcon(selectedDevice.status)} {selectedDevice.status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <strong>IP Address:</strong> {selectedDevice.ipAddress}
                  </div>
                  <div className="detail-item">
                    <strong>Firmware Version:</strong> {selectedDevice.firmwareVersion}
                  </div>
                </div>
                
                <div className="detail-section">
                  <h3>Activity</h3>
                  <div className="detail-item">
                    <strong>Total Scans:</strong> {selectedDevice.totalScans || 0}
                  </div>
                  <div className="detail-item">
                    <strong>Last Seen:</strong> {new Date(selectedDevice.lastSeen).toLocaleString()}
                  </div>
                  <div className="detail-item">
                    <strong>Connection Time:</strong> {new Date(selectedDevice.lastSeen).toLocaleString()}
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Performance</h3>
                  <div className="detail-item">
                    <strong>Signal Strength:</strong> Strong
                  </div>
                  <div className="detail-item">
                    <strong>Battery Level:</strong> 85%
                  </div>
                  <div className="detail-item">
                    <strong>Uptime:</strong> 2h 15m
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configure Modal */}
      {showConfigure && selectedDevice && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Configure Device</h2>
              <button className="close-btn" onClick={closeModal}>
                <FaTimesCircle />
              </button>
            </div>
            <div className="modal-body">
              <div className="config-form">
                <div className="form-group">
                  <label>Device Name</label>
                  <input 
                    type="text" 
                    defaultValue={selectedDevice.deviceName}
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label>Scan Interval (seconds)</label>
                  <input 
                    type="number" 
                    defaultValue="30"
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label>Heartbeat Interval (seconds)</label>
                  <input 
                    type="number" 
                    defaultValue="30"
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label>Auto Reconnect</label>
                  <select className="form-control">
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Debug Mode</label>
                  <select className="form-control">
                    <option value="false">Disabled</option>
                    <option value="true">Enabled</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button className="btn btn-primary">
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceConnected;