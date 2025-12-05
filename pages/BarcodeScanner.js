import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaDownload, FaMicrochip, FaSignal } from 'react-icons/fa';
import { useWebSocket } from '../contexts/WebSocketContext';
import './BarcodeScanner.css';

const BarcodeScanner = () => {
  const [autoSaving, setAutoSaving] = useState(false);
  const { isConnected, esp32Devices, latestScan, setLatestScan, isProcessingScan } = useWebSocket();


  // Auto-saving disabled - user must click "Save This Scan" button manually
  // useEffect(() => {
  //   if (latestScan && !isProcessingScan) {
  //     setAutoSaving(true);
  //     setTimeout(() => {
  //       setAutoSaving(false);
  //     }, 2000);
  //   }
  // }, [latestScan, isProcessingScan]);

  const resetScanner = () => {
    // Clear the latest scan data
    setLatestScan(null);
  };

  // Save current scan to Saved Scans
  const saveCurrentScan = async () => {
    if (!latestScan) {
      alert('No scan to save');
      return;
    }

    console.log('🔍 Latest scan data for saving:', {
      source: latestScan.source,
      deviceName: latestScan.deviceName,
      barcodeData: latestScan.barcodeData
    });

    // Only allow ESP32 source scans to be saved
    const source = (latestScan.source || '').toUpperCase();
    if (source !== 'ESP32') {
      alert(`❌ Only ESP32 source scans can be saved. Current source: "${latestScan.source}"`);
      return;
    }

    try {
      const response = await fetch('https://robridgeexpress.onrender.com/api/save-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barcode_data: latestScan.barcodeData,
          barcode_type: latestScan.scanType || 'unknown',
          source: latestScan.source || 'ESP32',
          product_name: latestScan.aiAnalysis?.title || 'Unknown Product',
          category: latestScan.aiAnalysis?.category || 'Unknown',
          price: 0,
          description: latestScan.aiAnalysis?.description || '',
          metadata: {
            deviceId: latestScan.deviceId,
            deviceName: latestScan.deviceName,
            aiAnalysis: latestScan.aiAnalysis,
            timestamp: latestScan.timestamp
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
      console.error('Error saving scan:', error);
      alert('❌ Error saving scan. Please ensure the server is running.');
    }
  };


  return (
    <div className="barcode-scanner">
      <div className="scanner-header">
        <h1>Barcode Scanner</h1>
        <p>Scan barcodes using Device Connected for real-time processing</p>
      </div>



      {/* Device Connected Status */}
      <div className="esp32-status">
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          <FaSignal />
          WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
        </div>
        <div className="device-count">
          <FaMicrochip />
          Device Connected: {esp32Devices.length}
        </div>
      </div>

      <div className="scanner-content">

      <div className="scanner-container">
        {/* Left Section - ESP32 Status */}
        <div className="scan-section card">
          <h2>Device Connected Scanner Status</h2>
          
          <div className="esp32-devices">
              {esp32Devices.length > 0 ? (
                <div className="devices-list">
                  <h3>Connected Device Connected Devices</h3>
                  {esp32Devices.map((device) => (
                    <div key={device.deviceId} className="device-card">
                      <div className="device-header">
                        <FaMicrochip />
                        <span className="device-name">{device.deviceName}</span>
                        <span className={`device-status ${device.status}`}>
                          {device.status}
                        </span>
                      </div>
                      <div className="device-details">
                        <p><strong>ID:</strong> {device.deviceId}</p>
                        <p><strong>IP:</strong> {device.ipAddress}</p>
                        <p><strong>Total Scans:</strong> {device.totalScans}</p>
                        <p><strong>Last Seen:</strong> {new Date(device.lastSeen).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-devices">
                  <FaMicrochip size={48} />
                  <h3>No Device Connected Devices Connected</h3>
                  <p>Waiting for Device Connected devices to connect...</p>
                  <p>Make sure your Device Connected is powered on and connected to WiFi.</p>
                </div>
              )}
              

            </div>
        </div>

        {/* Right Section - Results */}
        <div className="result-section">
          {isProcessingScan && !latestScan ? (
            <div className="result-panel card fade-in">
              <h2>Processing Scan...</h2>
              <div className="barcode-info">
                <div className="scan-details">
                  <div className="detail-row">
                    <strong>Status:</strong> Collecting data from ESP32...
                  </div>
                  <div className="detail-row">
                    <strong>Please wait:</strong> Ensuring complete data before display
                  </div>
                </div>
              </div>
            </div>
          ) : latestScan ? (
            <div className="result-panel card fade-in">
              <h2>Live Scan Result</h2>
              
              <div className="barcode-info">
                {/* Basic Information Section */}
                <div className="scan-info-section">
                  <h3>Basic Information</h3>
                  <div className="info-grid-two-columns">
                    <div className="info-column">
                      <div className="info-field">
                        <label>Device</label>
                        <span className="info-value">{latestScan.deviceName || 'Unknown Device'}</span>
                      </div>
                      <div className="info-field">
                        <label>Source</label>
                        <span className="info-value source-badge">{latestScan.source?.toUpperCase() || 'ESP32'}</span>
                      </div>
                      <div className="info-field">
                        <label>Category</label>
                        <span className="info-value">{latestScan.aiAnalysis?.category || 'Unknown'}</span>
                      </div>
                    </div>
                    <div className="info-column">
                      <div className="info-field">
                        <label>Product Name</label>
                        <span className="info-value">{latestScan.aiAnalysis?.title || 'Unknown Product'}</span>
                      </div>
                      <div className="info-field">
                        <label>Scan Time</label>
                        <span className="info-value">{(() => {
                          // Use the current time when the scan was received, not the ESP32 timestamp
                          // ESP32 timestamps are often unreliable or in different formats
                          return new Date().toLocaleString();
                        })()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Barcode Data Section */}
                <div className="barcode-data-section">
                  <h3>Barcode Data</h3>
                  <div className="barcode-data-container">
                    <span className="barcode-data-text">{latestScan.barcodeData}</span>
                  </div>
                </div>

                {/* Conditional Analysis Results Section - AI vs Basic based on device name */}
                {(() => {
                  const deviceName = latestScan.deviceName || '';
                  const hasAI = deviceName && typeof deviceName === 'string' && deviceName.toUpperCase().includes('AI');
                  
                  if (hasAI) {
                    return (
                      <div className="ai-analysis-section">
                        <h3>🤖 AI Analysis Results</h3>
                        <div className="ai-analysis-container">
                          <div className="ai-analysis-field">
                            <label>Product:</label>
                            <span className="ai-analysis-value">
                              {latestScan.aiAnalysis?.title || latestScan.aiAnalysis?.productName || 'Unknown Product'}
                            </span>
                          </div>
                          
                          <div className="ai-analysis-field">
                            <label>Category:</label>
                            <span className="ai-analysis-value">
                              {latestScan.aiAnalysis?.category || latestScan.aiAnalysis?.productType || 'Unknown'}
                            </span>
                          </div>
                          
                          <div className="ai-analysis-field">
                            <label>Success:</label>
                            <span className="ai-analysis-status">
                              <span className="status-icon">✓</span>
                              {latestScan.aiAnalysis?.title ? 'IDENTIFIED' : 'UNKNOWN'}
                            </span>
                          </div>
                          
                          <div className="ai-analysis-field">
                            <label>Description:</label>
                            <div className="ai-analysis-description-text">
                              {(() => {
                                if (latestScan.aiAnalysis?.description) {
                                  return latestScan.aiAnalysis.description;
                                }
                                if (latestScan.aiAnalysis?.description_short) {
                                  return latestScan.aiAnalysis.description_short;
                                }
                                if (latestScan.aiAnalysis?.title) {
                                  return `Product identified: ${latestScan.aiAnalysis.title}`;
                                }
                                return 'No AI analysis available for this scan.';
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return null; // Remove the Basic Scan Results section entirely
                  }
                })()}
              </div>



              {/* Action Buttons */}
              <div className="result-actions">
                <button className="btn btn-success" onClick={saveCurrentScan}>
                  <FaCheck />
                  Validate Record
                </button>
                
                <button className="btn btn-secondary">
                  <FaDownload />
                  Export Result
                </button>
                
                <button className="btn btn-secondary" onClick={resetScanner}>
                  <FaTimes />
                  Reset Scanner
                </button>
              </div>
            </div>
          ) : (
            <div className="no-result card">
              <h3>No Device Connected Scan</h3>
              <p>Scan a barcode using your Device Connected scanner to see results here</p>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
