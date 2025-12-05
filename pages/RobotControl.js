import React, { useState, useEffect } from 'react';
import { 
  FaMapMarkerAlt,
  FaExpand,
  FaCompress,
  FaSearch,
  FaDownload,
  FaSync,
  FaInfoCircle,
  FaCrosshairs,
  FaBatteryFull,
  FaBatteryThreeQuarters,
  FaBatteryHalf,
  FaBatteryQuarter,
  FaBatteryEmpty,
  FaWifi,
  FaCog,
  FaPlay,
  FaStop,
  FaExclamationTriangle
} from 'react-icons/fa';
import './RobotControl.css';

const RobotControl = () => {
  const [mapData, setMapData] = useState({
    scale: 1,
    centerX: 0,
    centerY: 0,
    zoom: 1,
    isFullscreen: false
  });
  const [robotPosition, setRobotPosition] = useState({ x: 100, y: 100 });
  const [robotStatus, setRobotStatus] = useState('disconnected');
  const [isRunning, setIsRunning] = useState(false);
  const [telemetry, setTelemetry] = useState({
    battery: 85,
    position: { x: 100, y: 100, z: 0 },
    orientation: 0,
    speed: 0,
    temperature: 42,
    taskStatus: 'idle'
  });
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [emergencyStop, setEmergencyStop] = useState(false);

  // Simulate robot movement and telemetry updates
  useEffect(() => {
    if (isRunning && robotStatus === 'connected') {
      const interval = setInterval(() => {
        setTelemetry(prev => ({
          ...prev,
          battery: Math.max(0, prev.battery - Math.random() * 0.5),
          position: {
            x: prev.position.x + (Math.random() - 0.5) * 2,
            y: prev.position.y + (Math.random() - 0.5) * 2,
            z: prev.position.z
          },
          orientation: (prev.orientation + Math.random() * 2 - 1) % 360,
          speed: Math.min(100, prev.speed + (Math.random() - 0.5) * 10),
          temperature: Math.max(20, Math.min(80, prev.temperature + (Math.random() - 0.5) * 2)),
          taskStatus: prev.taskStatus === 'idle' ? 'running' : 'idle'
        }));
        
        setRobotPosition(prev => ({
          x: prev.x + (Math.random() - 0.5) * 2,
          y: prev.y + (Math.random() - 0.5) * 2
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isRunning, robotStatus]);

  // Simulate connection status
  useEffect(() => {
    const interval = setInterval(() => {
      if (robotStatus === 'connected') {
        setConnectionStatus(Math.random() > 0.95 ? 'warning' : 'connected');
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [robotStatus]);

  const connectRobot = () => {
    setRobotStatus('connecting');
    setTimeout(() => {
      setRobotStatus('connected');
      setConnectionStatus('connected');
    }, 2000);
  };

  const disconnectRobot = () => {
    setRobotStatus('disconnected');
    setConnectionStatus('disconnected');
    setIsRunning(false);
    setEmergencyStop(false);
  };

  const startRobot = () => {
    if (robotStatus === 'connected' && !emergencyStop) {
      setIsRunning(true);
    }
  };

  const stopRobot = () => {
    setIsRunning(false);
  };

  const emergencyStopRobot = () => {
    setEmergencyStop(true);
    setIsRunning(false);
    setTimeout(() => setEmergencyStop(false), 5000);
  };

  const toggleFullscreen = () => {
    setMapData(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  };

  const zoomIn = () => {
    setMapData(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 5) }));
  };

  const zoomOut = () => {
    setMapData(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.2, 0.5) }));
  };

  const resetView = () => {
    setMapData(prev => ({ 
      ...prev, 
      zoom: 1, 
      centerX: 0, 
      centerY: 0 
    }));
  };

  const downloadMap = () => {
    // Simulate map download
    console.log('Downloading map data...');
  };

  const getBatteryIcon = (level) => {
    if (level > 80) return <FaBatteryFull />;
    if (level > 60) return <FaBatteryThreeQuarters />;
    if (level > 40) return <FaBatteryHalf />;
    if (level > 20) return <FaBatteryQuarter />;
    return <FaBatteryEmpty />;
  };

  const getBatteryColor = (level) => {
    if (level > 60) return '#34A853';
    if (level > 30) return '#FBBC05';
    return '#EA4335';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return '#34A853';
      case 'connecting': return '#FBBC05';
      case 'disconnected': return '#EA4335';
      case 'warning': return '#FBBC05';
      default: return '#9AA0A6';
    }
  };

  return (
    <div className={`robot-data-monitor ${mapData.isFullscreen ? 'fullscreen' : ''}`}>
      {/* Header */}
      <div className="monitor-header">
        <h1>Robot Data Monitor</h1>
        <p>Monitor robot telemetry data and status information</p>
      </div>

      {/* Main Dashboard */}
      <div className="monitor-dashboard">
        {/* LIDAR Visualization Panel */}
        <div className="lidar-panel">
          <div className="panel-header">
            <h2>LIDAR Visualization</h2>
          </div>
          <div className="lidar-container">
            <div className="lidar-canvas">
              <div 
                className="lidar-content"
                style={{
                  transform: `scale(${mapData.zoom}) translate(${mapData.centerX}px, ${mapData.centerY}px)`
                }}
              >
                {/* LIDAR Background Image */}
                <div className="lidar-background">
                  <img 
                    src="/lidar.png" 
                    alt="LIDAR Map" 
                    className="lidar-image"
                  />
                </div>
                
                {/* Grid Overlay */}
                <div className="lidar-grid"></div>
                
                {/* Robot Position Marker */}
                <div 
                  className="robot-marker"
                  style={{
                    left: `${robotPosition.x}px`,
                    top: `${robotPosition.y}px`
                  }}
                >
                  <div className="marker-dot"></div>
                </div>
                
                {/* Trajectory Line */}
                <div className="trajectory-line"></div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="lidar-legend">
              <div className="legend-item">
                <div className="legend-dot initial"></div>
                <span>Initial Position</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot final"></div>
                <span>Final Position</span>
              </div>
              <div className="legend-item">
                <div className="legend-line"></div>
                <span>Trajectory</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Telemetry Data Panel */}
        <div className="telemetry-panel">
          <div className="panel-header">
            <h2>Live Telemetry Data</h2>
            <p>Live Telemetry</p>
          </div>
          
          <div className="telemetry-cards">
            {/* Battery Card */}
            <div className="telemetry-card">
              <div className="card-icon battery">
                {getBatteryIcon(telemetry.battery)}
              </div>
              <div className="card-content">
                <div className="card-label">BATTERY</div>
                <div className="card-value" style={{ color: getBatteryColor(telemetry.battery) }}>
                  {Math.floor(telemetry.battery)}%
                </div>
              </div>
            </div>

            {/* Position Card */}
            <div className="telemetry-card">
              <div className="card-icon position">
                <FaMapMarkerAlt />
              </div>
              <div className="card-content">
                <div className="card-label">POSITION</div>
                <div className="card-value">
                  X: {telemetry.position.x.toFixed(1)}, Y: {telemetry.position.y.toFixed(1)}
                </div>
              </div>
            </div>

            {/* Orientation Card */}
            <div className="telemetry-card">
              <div className="card-icon orientation">
                <FaSync />
              </div>
              <div className="card-content">
                <div className="card-label">ORIENTATION</div>
                <div className="card-value">
                  {telemetry.orientation.toFixed(1)}°
                </div>
              </div>
            </div>

            {/* Temperature Card */}
            <div className="telemetry-card">
              <div className="card-icon temperature">
                <FaCog />
              </div>
              <div className="card-content">
                <div className="card-label">TEMPERATURE</div>
                <div className="card-value">
                  {telemetry.temperature.toFixed(1)}°C
                </div>
              </div>
            </div>

            {/* Task Status Card */}
            <div className="telemetry-card">
              <div className="card-icon task">
                <FaPlay />
              </div>
              <div className="card-content">
                <div className="card-label">TASK STATUS</div>
                <div className="card-value">
                  {telemetry.taskStatus.charAt(0).toUpperCase() + telemetry.taskStatus.slice(1)}
                </div>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="control-section">
            <button 
              className={`control-btn ${robotStatus === 'connected' ? 'connected' : 'disconnected'}`}
              onClick={robotStatus === 'connected' ? disconnectRobot : connectRobot}
              disabled={robotStatus === 'connecting'}
            >
              {robotStatus === 'connecting' ? (
                <>
                  <FaCog className="spinning" />
                  Connecting...
                </>
              ) : robotStatus === 'connected' ? (
                <>
                  <FaWifi />
                  Disconnect
                </>
              ) : (
                <>
                  <FaWifi />
                  Connect Robot
                </>
              )}
            </button>

            <button 
              className={`control-btn ${isRunning ? 'running' : 'stopped'}`}
              onClick={isRunning ? stopRobot : startRobot}
              disabled={robotStatus !== 'connected' || emergencyStop}
            >
              {isRunning ? (
                <>
                  <FaStop />
                  Stop Robot
                </>
              ) : (
                <>
                  <FaPlay />
                  Start Robot
                </>
              )}
            </button>

            <button 
              className="control-btn emergency"
              onClick={emergencyStopRobot}
              disabled={robotStatus !== 'connected'}
            >
              <FaExclamationTriangle />
              EMERGENCY STOP
            </button>
          </div>
        </div>
      </div>

      {/* Emergency Alert */}
      {emergencyStop && (
        <div className="emergency-overlay">
          <div className="emergency-alert">
            <FaExclamationTriangle className="alert-icon" />
            <div className="alert-content">
              <div className="alert-title">EMERGENCY STOP ACTIVATED</div>
              <div className="alert-message">Robot operations have been suspended</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RobotControl;
