import React, { useState } from 'react';
import { 
  FaDatabase, 
  FaBarcode, 
  FaUser, 
  FaCog, 
  FaSave, 
  FaCheck,
  FaEye,
  FaEyeSlash,
  FaServer
} from 'react-icons/fa';
import './Settings.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('database');
  const [databaseSettings, setDatabaseSettings] = useState({
    host: 'localhost',
    port: '5432',
    database: 'robridge_db',
    username: 'admin',
    password: 'password123',
    showPassword: false
  });
  const [scannerSettings, setScannerSettings] = useState({
    deviceType: 'camera',
    cameraDevice: 'default',
    resolution: '1280x720',
    frameRate: 30,
    enableAutoFocus: true,
    enableFlash: false
  });
  const [userSettings, setUserSettings] = useState({
    username: 'admin',
    email: 'admin@robridge.com',
    role: 'administrator',
    theme: 'light',
    language: 'en',
    notifications: true
  });
  const [systemSettings, setSystemSettings] = useState({
    autoSave: true,
    autoBackup: true,
    backupInterval: 24,
    logLevel: 'info',
    enableDebug: false,
    maxFileSize: 10
  });

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const tabs = [
    { id: 'database', label: 'Database', icon: FaDatabase },
    { id: 'scanner', label: 'Scanner', icon: FaBarcode },
    { id: 'user', label: 'User', icon: FaUser },
    { id: 'system', label: 'System', icon: FaCog }
  ];

  const handleDatabaseChange = (field, value) => {
    setDatabaseSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleScannerChange = (field, value) => {
    setScannerSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUserChange = (field, value) => {
    setUserSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSystemChange = (field, value) => {
    setSystemSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const testDatabaseConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    // Simulate database connection test
    setTimeout(() => {
      const success = Math.random() > 0.3; // 70% success rate for demo
      setTestResult({
        success,
        message: success ? 'Database connection successful!' : 'Database connection failed. Please check your settings.',
        details: success ? 'Connected to PostgreSQL database successfully.' : 'Error: Connection timeout or invalid credentials.'
      });
      setIsTesting(false);
    }, 2000);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    
    // Simulate saving settings
    setTimeout(() => {
      setIsSaving(false);
      alert('Settings saved successfully!');
    }, 1500);
  };

  const resetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default values?')) {
      setDatabaseSettings({
        host: 'localhost',
        port: '5432',
        database: 'robridge_db',
        username: 'admin',
        password: 'password123',
        showPassword: false
      });
      setScannerSettings({
        deviceType: 'camera',
        cameraDevice: 'default',
        resolution: '1280x720',
        frameRate: 30,
        enableAutoFocus: true,
        enableFlash: false
      });
      setUserSettings({
        username: 'admin',
        email: 'admin@robridge.com',
        role: 'administrator',
        theme: 'light',
        language: 'en',
        notifications: true
      });
      setSystemSettings({
        autoSave: true,
        autoBackup: true,
        backupInterval: 24,
        logLevel: 'info',
        enableDebug: false,
        maxFileSize: 10
      });
    }
  };

  const renderDatabaseTab = () => (
    <div className="settings-tab">
      <h3>Database Connection Settings</h3>
      <p className="tab-description">
        Configure your PostgreSQL database connection parameters
      </p>
      
      <div className="settings-form">
        <div className="form-row">
          <div className="form-group">
            <label className="label">Host</label>
            <input
              type="text"
              value={databaseSettings.host}
              onChange={(e) => handleDatabaseChange('host', e.target.value)}
              className="input"
              placeholder="localhost"
            />
          </div>
          
          <div className="form-group">
            <label className="label">Port</label>
            <input
              type="text"
              value={databaseSettings.port}
              onChange={(e) => handleDatabaseChange('port', e.target.value)}
              className="input"
              placeholder="5432"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="label">Database Name</label>
          <input
            type="text"
            value={databaseSettings.database}
            onChange={(e) => handleDatabaseChange('database', e.target.value)}
            className="input"
            placeholder="robridge_db"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label">Username</label>
            <input
              type="text"
              value={databaseSettings.username}
              onChange={(e) => handleDatabaseChange('username', e.target.value)}
              className="input"
              placeholder="admin"
            />
          </div>
          
          <div className="form-group">
            <label className="label">Password</label>
            <div className="password-input">
              <input
                type={databaseSettings.showPassword ? 'text' : 'password'}
                value={databaseSettings.password}
                onChange={(e) => handleDatabaseChange('password', e.target.value)}
                className="input"
                placeholder="Enter password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => handleDatabaseChange('showPassword', !databaseSettings.showPassword)}
              >
                {databaseSettings.showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button 
            className="btn btn-primary" 
            onClick={testDatabaseConnection}
            disabled={isTesting}
          >
            <FaCheck />
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        {testResult && (
          <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
            <div className="result-icon">
              {testResult.success ? <FaDatabase /> : <FaServer />}
            </div>
            <div className="result-content">
              <h4>{testResult.message}</h4>
              <p>{testResult.details}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderScannerTab = () => (
    <div className="settings-tab">
      <h3>Scanner Device Settings</h3>
      <p className="tab-description">
        Configure barcode scanner and camera settings
      </p>
      
      <div className="settings-form">
        <div className="form-group">
          <label className="label">Device Type</label>
          <select
            value={scannerSettings.deviceType}
            onChange={(e) => handleScannerChange('deviceType', e.target.value)}
            className="input"
          >
            <option value="camera">Camera Scanner</option>
            <option value="usb">USB Barcode Scanner</option>
            <option value="bluetooth">Bluetooth Scanner</option>
          </select>
        </div>

        {scannerSettings.deviceType === 'camera' && (
          <>
            <div className="form-group">
              <label className="label">Camera Device</label>
              <select
                value={scannerSettings.cameraDevice}
                onChange={(e) => handleScannerChange('cameraDevice', e.target.value)}
                className="input"
              >
                <option value="default">Default Camera</option>
                <option value="front">Front Camera</option>
                <option value="back">Back Camera</option>
                <option value="external">External Camera</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Resolution</label>
                <select
                  value={scannerSettings.resolution}
                  onChange={(e) => handleScannerChange('resolution', e.target.value)}
                  className="input"
                >
                  <option value="640x480">640x480</option>
                  <option value="1280x720">1280x720</option>
                  <option value="1920x1080">1920x1080</option>
                  <option value="3840x2160">4K (3840x2160)</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="label">Frame Rate</label>
                <select
                  value={scannerSettings.frameRate}
                  onChange={(e) => handleScannerChange('frameRate', parseInt(e.target.value))}
                  className="input"
                >
                  <option value={15}>15 FPS</option>
                  <option value={30}>30 FPS</option>
                  <option value={60}>60 FPS</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={scannerSettings.enableAutoFocus}
                    onChange={(e) => handleScannerChange('enableAutoFocus', e.target.checked)}
                  />
                  <span>Enable Auto Focus</span>
                </label>
              </div>
              
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={scannerSettings.enableFlash}
                    onChange={(e) => handleScannerChange('enableFlash', e.target.checked)}
                  />
                  <span>Enable Flash</span>
                </label>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderUserTab = () => (
    <div className="settings-tab">
      <h3>User Management Settings</h3>
      <p className="tab-description">
        Configure user account and preferences
      </p>
      
      <div className="settings-form">
        <div className="form-group">
          <label className="label">Username</label>
          <input
            type="text"
            value={userSettings.username}
            onChange={(e) => handleUserChange('username', e.target.value)}
            className="input"
            placeholder="Enter username"
          />
        </div>

        <div className="form-group">
          <label className="label">Email</label>
          <input
            type="email"
            value={userSettings.email}
            onChange={(e) => handleUserChange('email', e.target.value)}
            className="input"
            placeholder="Enter email"
          />
        </div>

        <div className="form-group">
          <label className="label">Role</label>
          <select
            value={userSettings.role}
            onChange={(e) => handleUserChange('role', e.target.value)}
            className="input"
          >
            <option value="administrator">Administrator</option>
            <option value="operator">Operator</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label">Theme</label>
            <select
              value={userSettings.theme}
              onChange={(e) => handleUserChange('theme', e.target.value)}
              className="input"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="label">Language</label>
            <select
              value={userSettings.language}
              onChange={(e) => handleUserChange('language', e.target.value)}
              className="input"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={userSettings.notifications}
              onChange={(e) => handleUserChange('notifications', e.target.checked)}
            />
            <span>Enable Notifications</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderSystemTab = () => (
    <div className="settings-tab">
      <h3>System Settings</h3>
      <p className="tab-description">
        Configure system behavior and performance options
      </p>
      
      <div className="settings-form">
        <div className="form-row">
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={systemSettings.autoSave}
                onChange={(e) => handleSystemChange('autoSave', e.target.checked)}
              />
              <span>Auto Save</span>
            </label>
          </div>
          
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={systemSettings.autoBackup}
                onChange={(e) => handleSystemChange('autoBackup', e.target.checked)}
              />
              <span>Auto Backup</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label className="label">Backup Interval (hours)</label>
          <input
            type="number"
            min="1"
            max="168"
            value={systemSettings.backupInterval}
            onChange={(e) => handleSystemChange('backupInterval', parseInt(e.target.value))}
            className="input"
            disabled={!systemSettings.autoBackup}
          />
        </div>

        <div className="form-group">
          <label className="label">Log Level</label>
          <select
            value={systemSettings.logLevel}
            onChange={(e) => handleSystemChange('logLevel', e.target.value)}
            className="input"
          >
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>

        <div className="form-group">
          <label className="label">Max File Size (MB)</label>
          <input
            type="number"
            min="1"
            max="100"
            value={systemSettings.maxFileSize}
            onChange={(e) => handleSystemChange('maxFileSize', parseInt(e.target.value))}
            className="input"
          />
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={systemSettings.enableDebug}
              onChange={(e) => handleSystemChange('enableDebug', e.target.checked)}
            />
            <span>Enable Debug Mode</span>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Configure system settings, database connections, and user preferences</p>
      </div>

      <div className="settings-container">
        {/* Settings Tabs */}
        <div className="settings-tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Settings Content */}
        <div className="settings-content">
          {activeTab === 'database' && renderDatabaseTab()}
          {activeTab === 'scanner' && renderScannerTab()}
          {activeTab === 'user' && renderUserTab()}
          {activeTab === 'system' && renderSystemTab()}
        </div>

        {/* Global Actions */}
        <div className="global-actions">
          <button 
            className="btn btn-primary" 
            onClick={saveSettings}
            disabled={isSaving}
          >
            <FaSave />
            {isSaving ? 'Saving...' : 'Save All Settings'}
          </button>
          
          <button className="btn btn-secondary" onClick={resetSettings}>
            <FaCog />
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
