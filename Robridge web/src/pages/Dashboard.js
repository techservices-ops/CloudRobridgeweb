import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaBarcode,
  FaQrcode,
  FaImage,
  FaRobot,
  FaDatabase,
  FaChartLine,
  FaWarehouse,
  FaBox,
  FaWifi,
  FaServer
} from 'react-icons/fa';
import { useAuth, ROLES } from '../contexts/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { getUserRole } = useAuth();
  const userRole = getUserRole();
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  // Mock stats removed as requested

  const quickActions = [
    { 
      title: 'Scan Barcode', 
      description: 'Scan or upload barcode images',
      icon: FaBarcode, 
      path: '/scanner',
      color: '#E3821E'
    },
    { 
      title: 'Generate Barcode', 
      description: 'Create new barcodes with custom data',
      icon: FaQrcode, 
      path: '/generator',
      color: '#E3821E'
    },
    { 
      title: 'Process Image', 
      description: 'Enhance and filter images',
      icon: FaImage, 
      path: '/image-processing',
      color: '#E3821E'
    },
    { 
      title: 'Rack Management', 
      description: 'Manage warehouse racks and products',
      icon: FaWarehouse, 
      path: '/rack-management',
      color: '#E3821E'
    },
    { 
      title: 'Product Management', 
      description: 'Track product movements and inventory',
      icon: FaBox, 
      path: '/product-management',
      color: '#E3821E'
    },
    { 
      title: '2D Map', 
      description: 'Real-time LiDAR mapping and robot tracking',
      icon: FaRobot, 
      path: '/robot-control',
      color: '#E3821E'
    }
  ];

  // Fetch system status
  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        setLoading(true);
        const serverURL = process.env.NODE_ENV === 'production' 
          ? 'https://robridgeexpress.onrender.com' 
          : 'http://localhost:3001';
        const response = await fetch(`${serverURL}/api/system/status`);
        const data = await response.json();
        
        if (data.success) {
          setSystemStatus(data.status);
        } else {
          console.error('Failed to fetch system status:', data.error);
        }
      } catch (error) {
        console.error('Error fetching system status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSystemStatus();
    
    // Refresh status every 30 seconds
    const interval = setInterval(fetchSystemStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Helper function to get status class
  const getStatusClass = (status) => {
    switch (status) {
      case 'connected':
      case 'online':
      case 'optimal':
        return 'status-connected';
      case 'warning':
        return 'status-warning';
      case 'error':
        return 'status-error';
      default:
        return 'status-unknown';
    }
  };

  // Helper function to get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'online':
        return 'Online';
      case 'optimal':
        return 'Optimal';
      case 'warning':
        return 'Warning';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-brand">
          <div className="dashboard-title">
            <h1>Dashboard</h1>
            <p>Robot Control and Barcode Management System</p>
          </div>
        </div>
      </div>

      {/* Mock stats cards removed as requested */}

      <div className="dashboard-tiles">
        {/* Quick Actions Tiles - Hidden for Expo Users */}
        {userRole !== ROLES.EXPO_USER && (
          <div className="tiles-section">
            <h2>Quick Actions</h2>
            <div className="tiles-grid">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link key={index} to={action.path} className="dashboard-tile">
                    <div className="tile-header">
                      <div className="tile-icon" style={{ backgroundColor: action.color }}>
                        <Icon size={20} />
                      </div>
                      <div className="tile-title">{action.title}</div>
                    </div>
                    <div className="tile-content">
                      <p>{action.description}</p>
                    </div>
                    <div className="tile-footer">
                      <span className="tile-arrow">→</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}


        {/* System Status Tiles */}
        <div className="tiles-section">
          <h2>System Status</h2>
          {loading ? (
            <div className="status-loading">
              <p>Loading system status...</p>
            </div>
          ) : systemStatus ? (
            <div className="tiles-grid">
              <div className="dashboard-tile status-tile">
                <div className="tile-header">
                  <div className="tile-icon" style={{ backgroundColor: '#4CAF50' }}>
                    <FaDatabase size={20} />
                  </div>
                  <div className="tile-title">Database</div>
                </div>
                <div className="tile-content">
                  <div className={`status-indicator ${getStatusClass(systemStatus.database || 'connected')}`}>
                    {getStatusText(systemStatus.database || 'connected')}
                  </div>
                  <p>Database connection status</p>
                </div>
              </div>
              
              <div className="dashboard-tile status-tile">
                <div className="tile-header">
                  <div className="tile-icon" style={{ backgroundColor: '#2196F3' }}>
                    <FaServer size={20} />
                  </div>
                  <div className="tile-title">Server</div>
                </div>
                <div className="tile-content">
                  <div className={`status-indicator ${getStatusClass(systemStatus.server || 'online')}`}>
                    {getStatusText(systemStatus.server || 'online')}
                  </div>
                  <p>Web server status</p>
                </div>
              </div>
              
              <div className="dashboard-tile status-tile">
                <div className="tile-header">
                  <div className="tile-icon" style={{ backgroundColor: '#FF9800' }}>
                    <FaRobot size={20} />
                  </div>
                  <div className="tile-title">Scanner Device</div>
                </div>
                <div className="tile-content">
                  <div className={`status-indicator ${systemStatus.devices?.connected > 0 ? 'status-connected' : 'status-warning'}`}>
                    {systemStatus.devices?.connected || 0} Connected
                  </div>
                  <p>Total: {systemStatus.devices?.total || 0} devices</p>
                </div>
              </div>
              
              <div className="dashboard-tile status-tile">
                <div className="tile-header">
                  <div className="tile-icon" style={{ backgroundColor: '#9C27B0' }}>
                    <FaWifi size={20} />
                  </div>
                  <div className="tile-title">Scans</div>
                </div>
                <div className="tile-content">
                  <div className={`status-indicator ${systemStatus.scans?.total > 0 ? 'status-connected' : 'status-warning'}`}>
                    {systemStatus.scans?.total || 0} Total
                  </div>
                  <p>Today: {systemStatus.scans?.today || 0} scans</p>
                </div>
              </div>
              
              <div className="dashboard-tile status-tile">
                <div className="tile-header">
                  <div className="tile-icon" style={{ backgroundColor: '#607D8B' }}>
                    <FaChartLine size={20} />
                  </div>
                  <div className="tile-title">Uptime</div>
                </div>
                <div className="tile-content">
                  <div className="status-indicator status-connected">
                    {Math.floor((systemStatus.uptime || 0) / 3600)}h
                  </div>
                  <p>Server uptime</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="status-error">
              <p>Failed to load system status</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
