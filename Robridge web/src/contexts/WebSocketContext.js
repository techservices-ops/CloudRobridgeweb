import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [esp32Devices, setEsp32Devices] = useState([]);
  const [latestScan, setLatestScan] = useState(null);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [scanBuffer, setScanBuffer] = useState({});
  const socketRef = useRef(null);

  // Function to check if we have complete scan data
  const isCompleteScanData = (scanData) => {
    return scanData && 
           scanData.barcodeData && 
           scanData.barcodeData.trim().length > 0 &&
           scanData.deviceName &&
           scanData.scanType;
  };

  // Function to auto-save scan data to database
  const autoSaveScanToDatabase = async (scanData) => {
    try {
      const serverURL = 'https://robridgeexpress.onrender.com'; // Always use Render backend
      const response = await fetch(`${serverURL}/api/barcodes/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barcodeData: scanData.barcodeData,
          deviceName: scanData.deviceName || 'ESP32 Scanner',
          deviceId: scanData.deviceId || 'unknown',
          scanType: scanData.scanType || 'unknown',
          source: 'esp32_live_scanner',
          productName: scanData.productInfo?.productName || `Scanned Product ${scanData.barcodeData}`,
          productId: scanData.barcodeData,
          price: 0,
          locationX: 0,
          locationY: 0,
          locationZ: 0,
          category: scanData.productInfo?.productType || 'Scanned',
          metadata: {
            deviceName: scanData.deviceName || 'ESP32 Scanner',
            deviceId: scanData.deviceId || 'unknown',
            scanType: scanData.scanType || 'unknown',
            timestamp: scanData.timestamp || new Date().toISOString(),
            productDetails: scanData.productInfo?.productDetails || '',
            foundInLocalDB: scanData.productInfo?.foundInLocalDB || false,
            autoSaved: true,
            source: 'live_scanner'
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Live Scanner result auto-saved to database:', result);
        return result;
      } else {
        console.error('Failed to auto-save Live Scanner result:', response.statusText);
      }
    } catch (error) {
      console.error('Error auto-saving Live Scanner result:', error);
    }
  };

  // Function to buffer and process scan data
  const processScanData = (scanData, eventType) => {
    console.log(`🔄 Processing ${eventType}:`, scanData);
    console.log('📊 AI Analysis in scan data:', scanData.aiAnalysis);
    console.log('🔍 Scan completeness check:', {
      hasBarcodeData: !!(scanData.barcodeData && scanData.barcodeData.trim().length > 0),
      hasDeviceName: !!scanData.deviceName,
      hasScanType: !!scanData.scanType,
      source: scanData.source,
      scanType: scanData.scanType
    });
    
    // Only process ESP32 scans - check by deviceName and source
    const isEsp32Device = scanData.deviceName?.includes('Scanner') || 
                         scanData.deviceName?.includes('RobridgeAI') ||
                         scanData.deviceName?.includes('Robridge') ||  // Added support for "Robridge" devices
                         scanData.deviceName?.includes('ESP32-') ||  // Added support for auto-registered devices
                         scanData.source === 'esp32' || 
                         scanData.source === 'esp32_basic' ||  // Added support for basic scans
                         scanData.source === 'ESP32_LIVE_SCANNER';
    
    if (!isEsp32Device) {
      console.log('❌ Skipping non-ESP32 scan:', { source: scanData.source, deviceName: scanData.deviceName });
      return;
    }
    
    console.log('✅ Processing ESP32 scan:', { deviceName: scanData.deviceName, scanType: scanData.scanType });
    
    // Buffer the data - make sure to preserve aiAnalysis
    setScanBuffer(prev => ({
      ...prev,
      ...scanData,
      aiAnalysis: scanData.aiAnalysis || prev.aiAnalysis, // Preserve AI analysis
      lastUpdate: Date.now(),
      eventType: eventType
    }));

    // Check if we have complete data after a short delay
    setTimeout(() => {
      setScanBuffer(currentBuffer => {
        console.log('🔍 Checking scan completeness:', {
          isComplete: isCompleteScanData(currentBuffer),
          isProcessing: isProcessingScan,
          bufferData: currentBuffer
        });
        
        if (isCompleteScanData(currentBuffer) && !isProcessingScan) {
          console.log('✅ Complete scan data found, processing...');
          setIsProcessingScan(true);
          
          const completeScan = {
            ...currentBuffer,
            timestamp: currentBuffer.timestamp || Date.now(),
            source: 'ESP32', // Ensure source is set to ESP32 for saving
            aiAnalysis: currentBuffer.aiAnalysis, // Explicitly include AI analysis
            dbRecord: currentBuffer.productInfo ? {
              id: currentBuffer.barcodeData,
              name: currentBuffer.productInfo.productName,
              category: currentBuffer.productInfo.productType,
              price: '$0.00',
              location: 'ESP32 Scanner',
              lastUpdated: currentBuffer.timestamp || Date.now(),
              status: currentBuffer.productInfo.foundInLocalDB ? 'ACTIVE' : 'UNKNOWN'
            } : null
          };
          
          console.log('Setting latest scan with AI analysis:', completeScan.aiAnalysis);
          setLatestScan(completeScan);
          
          // Auto-save disabled - user must click "Save This Scan" button manually
          // autoSaveScanToDatabase(completeScan);
          
          // Reset processing state
          setTimeout(() => {
            setIsProcessingScan(false);
            setScanBuffer({});
          }, 2000);
        }
        return currentBuffer;
      });
    }, 500); // Wait 500ms for all data to arrive
  };

  useEffect(() => {

    // Create WebSocket connection
    const serverURL = process.env.NODE_ENV === 'production' 
      ? 'https://robridgeexpress.onrender.com' 
      : 'http://localhost:3001';
    
    socketRef.current = io(serverURL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    // Connection event handlers
    socketRef.current.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Device Connected specific event handlers
    socketRef.current.on('esp32_devices_update', (devices) => {
      console.log('ESP32 devices updated:', devices);
      setEsp32Devices(devices);
    });

    socketRef.current.on('esp32_barcode_scan', (scanData) => {
      console.log('📡 Received esp32_barcode_scan event:', scanData);
      processScanData(scanData, 'esp32_barcode_scan');
    });

    socketRef.current.on('esp32_scan_processed', (scanData) => {
      console.log('📡 Received esp32_scan_processed event:', scanData);
      processScanData(scanData, 'esp32_scan_processed');
    });

    socketRef.current.on('esp32_device_connected', (device) => {
      console.log('New ESP32 device connected:', device);
      setEsp32Devices(prev => [...prev.filter(d => d.deviceId !== device.deviceId), device]);
    });

    // Fetch initial Device Connected devices
    const fetchEsp32Devices = async () => {
      try {
        const serverURL = 'https://robridgeexpress.onrender.com'; // Always use Render backend
        const response = await fetch(`${serverURL}/api/esp32/devices`);
        const data = await response.json();
        if (data.success) {
          setEsp32Devices(data.devices);
        }
      } catch (error) {
        console.error('Error fetching ESP32 devices:', error);
      }
    };

    fetchEsp32Devices();

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const value = {
    isConnected,
    esp32Devices,
    latestScan,
    setLatestScan,
    isProcessingScan,
    socket: socketRef.current
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
