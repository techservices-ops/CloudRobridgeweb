const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Render-compatible configuration
const PORT = process.env.PORT || 3001;
const AI_SERVER_URL = process.env.AI_SERVER_URL || 'https://robridgeaiserver.onrender.com';
const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET || 'robridge-secret-key-change-in-production-2024';

// PostgreSQL database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20
});

console.log('🚀 Server Configuration:');
console.log(`   PORT: ${PORT}`);
console.log(`   AI_SERVER_URL: ${AI_SERVER_URL}`);
console.log(`   NODE_ENV: ${NODE_ENV}`);

// Create a separate app for port 3002 redirect
const redirectApp = express();
const REDIRECT_PORT = 3003;

// Middleware
app.use(cors());
app.use(express.json());
// No static file serving - backend API only

// Store the Python process
let pythonProcess = null;

// Store ESP32 device data
let esp32Devices = new Map();
let lastBarcodeScan = null;

// Initialize database connection (PostgreSQL)
const initDatabase = async () => {
  try {
    console.log('🔍 Database connection details:');
    console.log('   DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('   NODE_ENV:', process.env.NODE_ENV);
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    client.release();
    return Promise.resolve();
  } catch (err) {
    console.error('Error connecting to database:', err);
    return Promise.reject(err);
  }
};

// Function to save barcode scan to database (PostgreSQL)
const saveBarcodeScan = async (scanData) => {
  try {
    const {
      barcodeData,
      deviceName,
      deviceId,
      scanType = 'qr',
      source = 'esp32',
      productName = 'Unknown Product',
      productId = 'UNKNOWN',
      price = 0,
      locationX = 0,
      locationY = 0,
      locationZ = 0,
      category = 'Unknown',
      metadata = '{}'
    } = scanData;

    const barcodeId = `SCAN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    const query = `
      INSERT INTO barcodes (
        barcode_id, barcode_data, barcode_type, source, product_name, 
        product_id, price, location_x, location_y, location_z, 
        category, file_path, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `;

    const values = [
      barcodeId, barcodeData, scanType, source, productName,
      productId, price, locationX, locationY, locationZ,
      category, '', JSON.stringify(metadata), timestamp
    ];

    const result = await pool.query(query, values);
    console.log(`Barcode scan saved with ID: ${result.rows[0].id}`);
    return { id: result.rows[0].id, barcodeId };
  } catch (error) {
    console.error('Error saving barcode scan:', error);
    throw error;
  }
};

// Function to get all scanned barcodes (PostgreSQL)
const getAllScannedBarcodes = async (limit = 100, offset = 0) => {
  try {
    const query = `
      SELECT 
        id, barcode_id, barcode_data, barcode_type, source, 
        product_name, product_id, price, location_x, location_y, location_z,
        category, file_path, metadata, created_at
      FROM barcodes 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching barcodes:', error);
    throw error;
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simple health endpoint for convenience
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    // Support both 'username' and 'email' fields for backward compatibility with mobile app
    const { username, email, password } = req.body;
    
    // Use email if provided, otherwise use username (convert username to email format if needed)
    let loginEmail = email || username;
    
    // If username is provided without @, try to find user by username or convert to email
    // For backward compatibility: 'admin' -> 'admin@robridge.com'
    if (username && !username.includes('@')) {
      // Try to find user with this username, or use default email format
      if (username === 'admin') {
        loginEmail = 'admin@robridge.com';
      } else {
        loginEmail = `${username}@robridge.com`;
      }
    }
    
    // Validate required fields
    if (!loginEmail || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    // Normalize email to lowercase
    loginEmail = loginEmail.toLowerCase().trim();
    
    // Check if PostgreSQL database is available
    if (!pool) {
      // Fallback to simple authentication if PostgreSQL not available (SQLite/local)
      const isAdmin = (username === 'admin' || email === 'admin' || loginEmail === 'admin@robridge.com') && password === 'admin123';
      if (isAdmin) {
        // Generate simple token if jwt available, otherwise use basic token
        let token;
        if (jwt) {
          token = jwt.sign(
            { id: 'admin', email: 'admin@robridge.com', role: 'admin' },
            JWT_SECRET,
            { expiresIn: '7d' }
          );
        } else {
          token = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        return res.json({
          success: true,
          message: 'Login successful',
          token: token,
          user: {
            id: 'admin',
            email: 'admin@robridge.com',
            name: 'Admin User',
            role: 'admin'
          }
        });
      } else {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }
    }
    
    // Find user in database
    const result = await pool.query(
      'SELECT id, email, password_hash, name, role, is_active FROM users WHERE email = $1',
      [loginEmail]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    const user = result.rows[0];
    
    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated'
      });
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Login error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Dashboard stats endpoint
app.get('/api/dashboard/stats', (req, res) => {
  try {
    const devices = Array.from(esp32Devices.values());
    const connectedDevices = devices.filter(d => d.status === 'connected').length;
    
    res.json({
      success: true,
      data: {
        users: 1, // Single admin user
        sessions: 1,
        barcodes: 0, // You can get this from database
        robot_status: connectedDevices > 0 ? 'connected' : 'offline',
        recent_activity: [
          {
            id: 1,
            log_level: 'INFO',
            message: 'System started',
            module: 'system',
            timestamp: new Date().toISOString()
          }
        ]
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard stats'
    });
  }
});

// Barcode endpoints
app.get('/api/barcode/list', (req, res) => {
  try {
    getAllScannedBarcodes(100, 0).then(barcodes => {
      res.json({
        success: true,
        data: barcodes
      });
    }).catch(error => {
      console.error('Error getting barcodes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get barcodes'
      });
    });
  } catch (error) {
    console.error('Barcode list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get barcode list'
    });
  }
});

app.post('/api/barcode/save_scanned', (req, res) => {
  try {
    const { data, type, source, product_name, product_id, price, location, category } = req.body;
    
    const scanData = {
      barcodeData: data,
      deviceName: 'mobile-app',
      deviceId: 'mobile-app',
      scanType: type || 'mobile_scan',
      source: source || 'mobile',
      productName: product_name || 'Unknown Product',
      productId: product_id || data,
      price: price || 0,
      locationX: 0,
      locationY: 0,
      locationZ: 0,
      category: category || 'Unknown',
      metadata: JSON.stringify({
        product_name: product_name,
        product_id: product_id,
        price: price,
        location: location,
        category: category
      })
    };
    
    saveBarcodeScan(scanData).then(result => {
      res.json({
        success: true,
        message: 'Barcode saved successfully',
        barcode_id: result.barcodeId
      });
    }).catch(error => {
      console.error('Error saving barcode:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save barcode'
      });
    });
  } catch (error) {
    console.error('Save barcode error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save barcode'
    });
  }
});

// ESP32 Device Registration
app.post('/api/esp32/register', (req, res) => {
  try {
    const { deviceId, deviceName, ipAddress, firmwareVersion } = req.body;
    
    const deviceInfo = {
      deviceId,
      deviceName: deviceName || `ESP32-${deviceId}`,
      ipAddress,
      firmwareVersion: firmwareVersion || '1.0.0',
      lastSeen: new Date().toISOString(),
      status: 'connected',
      totalScans: 0
    };
    
    esp32Devices.set(deviceId, deviceInfo);
    
    console.log(`ESP32 device registered: ${deviceName} (${deviceId})`);
    
    // Notify all connected clients about new device
    io.emit('esp32_device_connected', deviceInfo);
    
    res.json({ 
      success: true, 
      message: 'Device registered successfully',
      deviceId 
    });
  } catch (error) {
    console.error('Error registering ESP32 device:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to register device' 
    });
  }
});

// ESP32 Heartbeat/Ping
app.post('/api/esp32/ping/:deviceId', (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = esp32Devices.get(deviceId);
    
    if (device) {
      device.lastSeen = new Date().toISOString();
      device.status = 'connected';
      esp32Devices.set(deviceId, device);
      
      res.json({ success: true, timestamp: device.lastSeen });
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'Device not found' 
      });
    }
  } catch (error) {
    console.error('Error processing ESP32 ping:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process ping' 
    });
  }
});

// ESP32 Heartbeat/Ping (GET) - for easy testing
app.get('/api/esp32/ping/:deviceId', (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = esp32Devices.get(deviceId);
    
    if (device) {
      device.lastSeen = new Date().toISOString();
      device.status = 'connected';
      esp32Devices.set(deviceId, device);
      
      res.json({ success: true, timestamp: device.lastSeen, method: 'GET' });
    } else {
      // Device not registered, register it
      const newDevice = {
        deviceId,
        deviceName: `ESP32-${deviceId}`,
        lastSeen: new Date().toISOString(),
        status: 'connected',
        barcodeCount: 0
      };
      esp32Devices.set(deviceId, newDevice);
      console.log(`📡 New ESP32 device registered (GET): ${deviceId}`);
      res.json({ success: true, timestamp: newDevice.lastSeen, message: 'Device registered', method: 'GET' });
    }
  } catch (error) {
    console.error('Error processing ESP32 ping (GET):', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process ping' 
    });
  }
});

// ESP32 Scan Endpoint Info (GET) - for testing and documentation
app.get('/api/esp32/scan', (req, res) => {
  res.json({
    message: 'ESP32 Barcode Scan Endpoint',
    method: 'POST',
    url: '/api/esp32/scan/:deviceId',
    description: 'Send barcode scan data from ESP32 device',
    requiredParams: {
      deviceId: 'Device identifier (in URL path)'
    },
    requiredBody: {
      barcodeData: 'The scanned barcode or QR code data',
      scanType: 'Type of scan (optional)',
      imageData: 'Base64 image data (optional)',
      timestamp: 'Scan timestamp (optional)'
    },
    example: {
      url: '/api/esp32/scan/my-device-001',
      method: 'POST',
      body: {
        barcodeData: '1234567890123',
        scanType: 'barcode',
        timestamp: Date.now()
      }
    }
  });
});

// ESP32 Barcode Scan Data - Enhanced with AI Integration
app.post('/api/esp32/scan/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { barcodeData, scanType, imageData, timestamp } = req.body;
    
    console.log(`📱 ESP32 scan received from device: ${deviceId}`);
    console.log('📊 Full request body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 Scan data:', { barcodeData, scanType, timestamp });
    
    const device = esp32Devices.get(deviceId);
    if (!device) {
      return res.status(404).json({ 
        success: false, 
        error: 'Device not registered' 
      });
    }
    
    // Update device stats
    device.totalScans++;
    device.lastSeen = new Date().toISOString();
    esp32Devices.set(deviceId, device);
    
    console.log(`ESP32 barcode scan received from ${device.deviceName}: ${barcodeData}`);
    
    // Check if ESP32 already provided product data
    const { productName, productType, productDetails, productCategory, source } = req.body;
    let aiAnalysis = null;
    
    if (source === 'ai_analysis' && productName) {
      // ESP32 already did AI analysis, use that data
      console.log('✅ Using ESP32 AI analysis data');
      aiAnalysis = {
        success: true,
        title: productName,
        category: productCategory || productType || 'Scanned Product',
        description: productDetails || `Product: ${productName}`,
        description_short: `${productName} - ${productType || 'Product'}`,
        country: 'Unknown',
        barcode: barcodeData,
        deviceId: deviceId,
        source: 'esp32_ai'
      };
      console.log('📊 ESP32 AI Analysis:', JSON.stringify(aiAnalysis, null, 2));
    } else {
      // Try AI server for analysis
      try {
        console.log(`🤖 Forwarding to AI server at ${AI_SERVER_URL} for barcode: ${barcodeData}`);
        
        const aiResponse = await fetch(`${AI_SERVER_URL}/api/esp32/scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            barcodeData: barcodeData,
            deviceId: deviceId,
            deviceName: device.deviceName,
            scanType: scanType || 'ESP32_SCAN',
            timestamp: timestamp || Date.now()
          }),
          signal: AbortSignal.timeout(15000) // 15 second timeout for Render.com cold starts
        });
        
        if (aiResponse.ok) {
          aiAnalysis = await aiResponse.json();
          console.log('✅ AI Analysis completed successfully!');
          console.log('AI Analysis:', JSON.stringify(aiAnalysis, null, 2));
        } else {
          const errorText = await aiResponse.text();
          console.log(`⚠️ AI server returned status ${aiResponse.status}, no AI analysis available`);
          console.log(`⚠️ AI server error response: ${errorText}`);
        }
      } catch (aiError) {
        console.error('❌ AI server communication error:', aiError.message);
        console.error('❌ Full error details:', aiError);
        console.log(`ℹ️  Make sure AI server is running at: ${AI_SERVER_URL}`);
      }
      
      // Provide fallback if no AI analysis available
      if (!aiAnalysis) {
        console.log('📦 Using fallback analysis (AI server not available)');
        aiAnalysis = {
          success: true,
          title: `Product ${barcodeData.substring(0, 20)}`,
          category: 'Scanned Product',
          description: 'Product scanned successfully. Start AI server on port 8000 for detailed analysis.',
          description_short: `Scanned: ${barcodeData.substring(0, 30)}`,
          country: 'Unknown',
          barcode: barcodeData,
          deviceId: deviceId,
          fallback: true
        };
      }
    }
    
    // Create scan record with AI analysis
    const scanRecord = {
      id: `scan_${Date.now()}_${deviceId}`,
      deviceId,
      deviceName: device.deviceName,
      barcodeData,
      scanType: scanType || 'unknown',
      imageData: imageData || null,
      timestamp: timestamp || new Date().toISOString(),
      processed: true,
      aiAnalysis: aiAnalysis // This will now ALWAYS have data
    };
    
    // Save to database with AI analysis
    try {
      const dbScanData = {
        barcodeData,
        deviceName: device.deviceName,
        deviceId,
        scanType: scanType || 'unknown',
        source: 'esp32',
        productName: aiAnalysis?.title || 'Unknown Product',
        productId: barcodeData,
        price: 0,
        locationX: 0,
        locationY: 0,
        locationZ: 0,
        category: aiAnalysis?.category || 'Unknown',
        metadata: {
          deviceName: device.deviceName,
          deviceId: deviceId,
          scanType: scanType || 'unknown',
          timestamp: timestamp || new Date().toISOString(),
          aiAnalysis: aiAnalysis,
          description: aiAnalysis?.description || 'No AI analysis available',
          country: aiAnalysis?.country || null
        }
      };
      
      const dbResult = await saveBarcodeScan(dbScanData);
      console.log('Scan saved to database with AI analysis:', dbResult);
    } catch (dbError) {
      console.error('Error saving to database:', dbError);
    }
    
    // Store the latest scan
    lastBarcodeScan = scanRecord;
    
    console.log('📡 Broadcasting scan to WebSocket clients...');
    console.log('Scan record:', JSON.stringify(scanRecord, null, 2));
    console.log('🔍 WebSocket connected clients:', io.engine.clientsCount);
    
    // Notify all connected clients about new scan with AI analysis
    io.emit('esp32_barcode_scan', scanRecord);
    io.emit('esp32_scan_processed', scanRecord);
    
    console.log(`✅ Scan broadcast complete. Connected clients: ${io.engine.clientsCount}`);
    
    res.json({ 
      success: true, 
      message: 'Barcode scan received and processed with AI',
      scanId: scanRecord.id,
      aiAnalysis: aiAnalysis
    });
  } catch (error) {
    console.error('Error processing ESP32 scan:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process scan' 
    });
  }
});

// API endpoint to save barcode scan data
app.post('/api/barcodes/save', async (req, res) => {
  try {
    const scanData = req.body;
    
    // Validate required fields
    if (!scanData.barcodeData) {
      return res.status(400).json({
        success: false,
        error: 'barcodeData is required'
      });
    }
    
    // Save to database using existing function
    const result = await saveBarcodeScan(scanData);
    
    res.json({
      success: true,
      message: 'Barcode scan saved successfully',
      data: result
    });
    
  } catch (error) {
    console.error('Error saving barcode scan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save barcode scan'
    });
  }
});

// Get ESP32 devices list
app.get('/api/esp32/devices', (req, res) => {
  try {
    const devices = Array.from(esp32Devices.values());
    
    // Update device status based on last seen
    const now = new Date();
    devices.forEach(device => {
      const lastSeen = new Date(device.lastSeen);
      const timeDiff = (now - lastSeen) / 1000; // seconds
      
      if (timeDiff > 60) { // 1 minute timeout
        device.status = 'disconnected';
      }
    });
    
    res.json({ 
      success: true, 
      devices,
      totalDevices: devices.length 
    });
  } catch (error) {
    console.error('Error getting ESP32 devices:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get devices' 
    });
  }
});

// Get latest barcode scan
app.get('/api/esp32/latest-scan', (req, res) => {
  try {
    res.json({ 
      success: true, 
      scan: lastBarcodeScan 
    });
  } catch (error) {
    console.error('Error getting latest scan:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get latest scan' 
    });
  }
});

// Get all scanned barcodes from database
app.get('/api/barcodes/scanned', async (req, res) => {
  try {
    const { limit = 100, offset = 0, source } = req.query;
    
    let sql = `
      SELECT 
        id, barcode_id, barcode_data, barcode_type, source, 
        product_name, product_id, price, location_x, location_y, location_z,
        category, file_path, metadata, created_at
      FROM barcodes 
    `;
    
    const params = [];
    
    if (source) {
      sql += ' WHERE source = ?';
      params.push(source);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Error fetching scanned barcodes:', err);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to fetch scanned barcodes' 
        });
      } else {
        res.json({ 
          success: true, 
          barcodes: rows,
          total: rows.length,
          limit: parseInt(limit),
          offset: parseInt(offset)
        });
      }
    });
  } catch (error) {
    console.error('Error getting scanned barcodes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get scanned barcodes' 
    });
  }
});

// Delete a scanned barcode from history
app.delete('/api/barcodes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Deleting barcode with ID: ${id}`);
    
    db.run('DELETE FROM barcodes WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('❌ Error deleting barcode:', err);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to delete barcode' 
        });
      } else if (this.changes === 0) {
        console.log('⚠️ No barcode found with ID:', id);
        res.status(404).json({ 
          success: false, 
          error: 'Barcode not found' 
        });
      } else {
        console.log('✅ Barcode deleted successfully');
        res.json({ 
          success: true, 
          message: 'Barcode deleted successfully' 
        });
      }
    });
  } catch (error) {
    console.error('❌ Error deleting barcode:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete barcode' 
    });
  }
});

// ESP32 Database Lookup Endpoint
app.get('/api/barcodes/lookup/:barcode', (req, res) => {
  try {
    const { barcode } = req.params;
    
    const sql = `
      SELECT 
        barcode_data, product_name, category, price, location_x, location_y, location_z,
        metadata, created_at
      FROM barcodes 
      WHERE barcode_data = ?
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    db.get(sql, [barcode], (err, row) => {
      if (err) {
        console.error('Error looking up barcode:', err);
        res.status(500).json({ 
          success: false, 
          error: 'Database lookup failed' 
        });
      } else if (row) {
        // Parse metadata for additional product info
        let metadata = {};
        try {
          metadata = JSON.parse(row.metadata || '{}');
        } catch (e) {
          metadata = {};
        }
        
        res.json({ 
          success: true, 
          product: {
            barcode: row.barcode_data,
            name: row.product_name || 'Unknown Product',
            type: row.category || 'Unknown',
            details: metadata.productDetails || 'No details available',
            price: row.price ? `$${row.price}` : 'Price not available',
            category: row.category || 'Unknown',
            location: `X:${row.location_x}, Y:${row.location_y}, Z:${row.location_z}`,
            foundInDatabase: true,
            lastScanned: row.created_at
          }
        });
      } else {
        res.json({ 
          success: false, 
          message: 'Barcode not found in database',
          product: null
        });
      }
    });
  } catch (error) {
    console.error('Error in barcode lookup:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// ESP32 AI Analysis Endpoint
app.post('/api/ai/analyze-product', async (req, res) => {
  try {
    const { barcode, productName, analysisType, source } = req.body;
    
    console.log(`AI Analysis request: ${analysisType} for barcode ${barcode}`);
    
    if (analysisType === 'benefits') {
      // Call your AI model for benefits analysis
      const aiResponse = await callAIForBenefits(productName, barcode);
      
      res.json({
        success: true,
        benefits: aiResponse,
        productName: productName,
        barcode: barcode,
        analysisType: analysisType
      });
    } else {
      // General product analysis
      const aiResponse = await callAIForProductAnalysis(barcode);
      
      res.json({
        success: true,
        product: aiResponse,
        barcode: barcode,
        source: source
      });
    }
  } catch (error) {
    console.error('Error in AI analysis:', error);
    res.status(500).json({ 
      success: false, 
      error: 'AI analysis failed',
      message: error.message
    });
  }
});

// Helper function to call trained AI model for benefits analysis
async function callAIForBenefits(productName, barcode) {
  try {
    // Call your trained AI model directly
    const aiEndpoint = 'http://172.21.66.150:8000/generate';
    
    const response = await fetch(aiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        barcode: barcode,
        max_length: 150,
        temperature: 0.8,
        top_p: 0.9
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.product_description || 'Benefits analysis completed by trained AI';
    } else {
      return 'Trained AI benefits analysis temporarily unavailable';
    }
  } catch (error) {
    console.error('Trained AI benefits call failed:', error);
    return 'Trained AI analysis service unavailable';
  }
}

// Helper function to call trained AI model for general product analysis
async function callAIForProductAnalysis(barcode) {
  try {
    // Call your trained AI model directly
    const aiEndpoint = 'http://172.21.66.150:8000/generate';
    
    const response = await fetch(aiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        barcode: barcode,
        max_length: 200,
        temperature: 0.7,
        top_p: 0.9
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        name: 'AI-Generated Product',
        type: 'Analyzed',
        details: data.product_description || 'AI analysis completed',
        price: 'Price not available',
        category: 'AI Analyzed'
      };
    } else {
      return {
        name: 'Unknown Product',
        type: 'Unknown',
        details: 'Trained AI analysis temporarily unavailable',
        price: 'Price not available',
        category: 'Unknown'
      };
    }
  } catch (error) {
    console.error('Trained AI product analysis call failed:', error);
    return {
      name: 'Unknown Product',
      type: 'Unknown',
      details: 'Trained AI analysis service unavailable',
      price: 'Price not available',
      category: 'Unknown'
    };
  }
}

// Create barcodes table if it doesn't exist
// Create barcodes table if it doesn't exist (PostgreSQL)
const initBarcodesTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS barcodes (
        id SERIAL PRIMARY KEY,
        barcode_id TEXT,
        barcode_data TEXT,
        barcode_type TEXT,
        source TEXT,
        product_name TEXT,
        product_id TEXT,
        price REAL,
        location_x REAL,
        location_y REAL,
        location_z REAL,
        category TEXT,
        file_path TEXT,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await pool.query(query);
    console.log('✅ Barcodes table created/verified');
  } catch (error) {
    console.error('Error creating barcodes table:', error);
    throw error;
  }
};

// Create saved_scans table if it doesn't exist
const initSavedScansTable = () => {
  return new Promise((resolve, reject) => {
    const sql = `
      CREATE TABLE IF NOT EXISTS saved_scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barcode_data TEXT NOT NULL,
        barcode_type TEXT NOT NULL,
        source TEXT NOT NULL,
        product_name TEXT,
        category TEXT,
        price REAL,
        description TEXT,
        metadata TEXT,
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    db.run(sql, (err) => {
      if (err) {
        console.error('❌ Error creating saved_scans table:', err);
        reject(err);
      } else {
        console.log('✅ saved_scans table ready');
        
        // Verify the table was created
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='saved_scans'", (err, row) => {
          if (err) {
            console.error('❌ Error verifying saved_scans table:', err);
            reject(err);
          } else if (row) {
            console.log('✅ saved_scans table verified');
            resolve();
          } else {
            console.error('❌ saved_scans table was not created');
            reject(new Error('Table creation failed'));
          }
        });
      }
    });
  });
};

// Save a scan to saved_scans table
app.post('/api/save-scan', (req, res) => {
  try {
    const { barcode_data, barcode_type, source, product_name, category, price, description, metadata } = req.body;
    
    if (!barcode_data) {
      return res.status(400).json({
        success: false,
        error: 'Barcode data is required'
      });
    }

    // Only allow ESP32 source scans to be saved
    const sourceUpper = (source || '').toUpperCase();
    if (sourceUpper !== 'ESP32') {
      return res.status(400).json({
        success: false,
        error: 'Only ESP32 source scans can be saved.'
      });
    }

    // First, check if this barcode was already saved recently (within last 5 minutes)
    const checkDuplicateSQL = `
      SELECT id, saved_at FROM saved_scans 
      WHERE barcode_data = ? 
      ORDER BY saved_at DESC 
      LIMIT 1
    `;

    db.get(checkDuplicateSQL, [barcode_data], (err, existingScan) => {
      if (err) {
        console.error('❌ Error checking for duplicates:', err);
        console.error('   SQL:', checkDuplicateSQL);
        console.error('   Barcode data:', barcode_data);
        console.error('   Error message:', err.message);
        return res.status(500).json({
          success: false,
          error: 'Failed to check for duplicates: ' + err.message
        });
      }

      // If scan exists and was saved within last 5 minutes, prevent duplicate
      if (existingScan) {
        const now = new Date();
        const savedTime = new Date(existingScan.saved_at);
        const timeDiff = (now - savedTime) / 1000 / 60; // minutes

        if (timeDiff < 5) {
          console.log(`⚠️ Duplicate save prevented for barcode: ${barcode_data} (saved ${timeDiff.toFixed(1)} minutes ago)`);
          return res.json({
            success: false,
            error: `This barcode was already saved ${timeDiff.toFixed(1)} minutes ago. Please wait before saving again.`,
            duplicate: true,
            lastSaved: existingScan.saved_at
          });
        }
      }

      // Save the scan if no recent duplicate found
      const sql = `
        INSERT INTO saved_scans (barcode_data, barcode_type, source, product_name, category, price, description, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(sql, [
        barcode_data, 
        barcode_type, 
        source, 
        product_name, 
        category, 
        price, 
        description,
        JSON.stringify(metadata)
      ], function(err) {
        if (err) {
          console.error('Error saving scan:', err);
          res.status(500).json({
            success: false,
            error: 'Failed to save scan'
          });
        } else {
          console.log(`✅ Scan saved to saved_scans table. ID: ${this.lastID}`);
          res.json({
            success: true,
            message: 'Scan saved successfully',
            savedId: this.lastID
          });
        }
      });
    });
  } catch (error) {
    console.error('Error saving scan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save scan'
    });
  }
});

// Get saved scans endpoint
app.get('/api/saved-scans', (req, res) => {
  try {
    // Check if database is initialized
    if (!db) {
      console.error('Database not initialized');
      return res.status(503).json({ 
        success: false, 
        error: 'Database not available. Please try again later.' 
      });
    }

    const sql = `
      SELECT 
        id, barcode_data, barcode_type, source, 
        product_name, category, price, description, metadata, saved_at
      FROM saved_scans 
      ORDER BY saved_at DESC
    `;
    
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error('Error fetching saved scans:', err);
        console.error('SQL Error details:', err.message);
        
        // Check if table doesn't exist
        if (err.message && err.message.includes('no such table')) {
          console.log('saved_scans table does not exist, initializing...');
          // Try to initialize the table
          initSavedScansTable()
            .then(() => {
              // Retry the query
              db.all(sql, [], (retryErr, retryRows) => {
                if (retryErr) {
                  console.error('Error after table initialization:', retryErr);
                  res.status(500).json({ 
                    success: false, 
                    error: 'Failed to fetch saved scans after table initialization' 
                  });
                } else {
                  const formattedRows = (retryRows || []).map(row => ({
                    ...row,
                    created_at: row.saved_at,
                    scanned_at: row.saved_at
                  }));
                  res.json({ 
                    success: true, 
                    savedScans: formattedRows
                  });
                }
              });
            })
            .catch((initErr) => {
              console.error('Failed to initialize saved_scans table:', initErr);
              res.status(500).json({ 
                success: false, 
                error: 'Failed to initialize database table' 
              });
            });
        } else {
          res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch saved scans: ' + err.message
          });
        }
      } else {
        // Format rows to match expected structure
        const formattedRows = (rows || []).map(row => ({
          ...row,
          created_at: row.saved_at,
          scanned_at: row.saved_at
        }));
        
        res.json({ 
          success: true, 
          savedScans: formattedRows
        });
      }
    });
  } catch (error) {
    console.error('Error getting saved scans:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get saved scans: ' + error.message
    });
  }
});

// Delete saved scan endpoint
app.delete('/api/saved-scans/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const sql = `DELETE FROM saved_scans WHERE id = ?`;
    
    db.run(sql, [id], function(err) {
      if (err) {
        console.error('Error deleting saved scan:', err);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to delete saved scan' 
        });
      } else {
        console.log(`🗑️ Deleted saved scan ID: ${id}`);
        res.json({ 
          success: true, 
          message: 'Saved scan deleted successfully',
          deletedId: id
        });
      }
    });
  } catch (error) {
    console.error('Error deleting saved scan:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete saved scan' 
    });
  }
});

// Clear ALL saved scans endpoint
app.delete('/api/saved-scans', (req, res) => {
  try {
    const sql = `DELETE FROM saved_scans`;
    
    db.run(sql, [], function(err) {
      if (err) {
        console.error('Error clearing saved scans:', err);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to clear saved scans' 
        });
      } else {
        console.log(`🗑️ Cleared all saved scans. ${this.changes} rows deleted.`);
        res.json({ 
          success: true, 
          message: 'All saved scans cleared successfully',
          deletedCount: this.changes
        });
      }
    });
  } catch (error) {
    console.error('Error clearing saved scans:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clear saved scans' 
    });
  }
});

// Clear GM77_SCAN entries from saved scans
app.delete('/api/saved-scans/gm77', (req, res) => {
  try {
    const sql = `DELETE FROM saved_scans WHERE barcode_type = 'GM77_SCAN'`;
    
    db.run(sql, [], function(err) {
      if (err) {
        console.error('Error clearing GM77_SCAN entries:', err);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to clear GM77_SCAN entries' 
        });
      } else {
        console.log(`🗑️ Cleared ${this.changes} GM77_SCAN entries from saved scans.`);
        res.json({ 
          success: true, 
          message: 'GM77_SCAN entries cleared successfully',
          deletedCount: this.changes
        });
      }
    });
  } catch (error) {
    console.error('Error clearing GM77_SCAN entries:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clear GM77_SCAN entries' 
    });
  }
});

// Get barcode statistics
app.get('/api/barcodes/stats', (req, res) => {
  try {
    const sql = `
      SELECT 
        source,
        barcode_type,
        COUNT(*) as count
      FROM barcodes 
      GROUP BY source, barcode_type
    `;
    
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error('Error fetching barcode stats:', err);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to fetch statistics' 
        });
      } else {
        const stats = {
          bySource: {},
          byType: {},
          total: 0
        };
        
        rows.forEach(row => {
          stats.total += row.count;
          
          if (!stats.bySource[row.source]) {
            stats.bySource[row.source] = 0;
          }
          stats.bySource[row.source] += row.count;
          
          if (!stats.byType[row.barcode_type]) {
            stats.byType[row.barcode_type] = 0;
          }
          stats.byType[row.barcode_type] += row.count;
        });
        
        res.json({ 
          success: true, 
          stats 
        });
      }
    });
  } catch (error) {
    console.error('Error getting barcode statistics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get statistics' 
    });
  }
});

// Start Python backend endpoint
app.post('/api/start-backend', async (req, res) => {
  try {
    // Kill existing process if running
    if (pythonProcess) {
      pythonProcess.kill();
      pythonProcess = null;
    }

    // Path to your Python backend
    const pythonPath = path.join(__dirname, '..', 'Barcode generator&Scanner', 'start_server.py');
    const pythonDir = path.join(__dirname, '..', 'Barcode generator&Scanner');

    console.log('Starting Python backend...');
    console.log('Python file:', pythonPath);
    console.log('Working directory:', pythonDir);

    // Start Python process
    pythonProcess = spawn('py', [pythonPath], {
      cwd: pythonDir,
      stdio: 'pipe'
    });

    // Handle process events
    pythonProcess.stdout.on('data', (data) => {
      console.log('Python stdout:', data.toString());
    });

    pythonProcess.stderr.on('data', (data) => {
      console.log('Python stderr:', data.toString());
    });

    pythonProcess.on('close', (code) => {
      console.log('Python process closed with code:', code);
      pythonProcess = null;
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      pythonProcess = null;
    });

    // Wait a bit for the process to start
    setTimeout(() => {
      if (pythonProcess && !pythonProcess.killed) {
        res.json({ 
          success: true, 
          message: 'Python backend started successfully',
          pid: pythonProcess.pid
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Failed to start Python backend' 
        });
      }
    }, 2000);

  } catch (error) {
    console.error('Error starting backend:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error starting backend',
      error: error.message 
    });
  }
});

// Stop Python backend endpoint
app.post('/api/stop-backend', (req, res) => {
  try {
    if (pythonProcess) {
      pythonProcess.kill();
      pythonProcess = null;
      res.json({ success: true, message: 'Python backend stopped' });
    } else {
      res.json({ success: false, message: 'No Python backend running' });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error stopping backend',
      error: error.message 
    });
  }
});

// Get backend status
app.get('/api/backend-status', (req, res) => {
  const isRunning = pythonProcess && !pythonProcess.killed;
  res.json({ 
    running: isRunning,
    pid: isRunning ? pythonProcess.pid : null
  });
});

// Check if Python backend is running on port 5000
const checkPythonBackend = async () => {
  try {
        const response = await fetch(`http://localhost:5000/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Proxy endpoints to Python backend
app.post('/api/generate_barcode', async (req, res) => {
  try {
    const isBackendRunning = await checkPythonBackend();
    if (!isBackendRunning) {
      return res.status(503).json({ 
        success: false, 
        error: `Python backend is not running at http://localhost:5000` 
      });
    }

    // Forward request to Python backend
        const response = await fetch(`http://localhost:5000/generate_barcode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });

    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('Error proxying to Python backend:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to communicate with Python backend' 
    });
  }
});

app.get('/api/get_barcode/:filename', async (req, res) => {
  try {
    const isBackendRunning = await checkPythonBackend();
    if (!isBackendRunning) {
      return res.status(503).json({ 
        success: false, 
        error: `Python backend is not running at http://localhost:5000` 
      });
    }

    // Forward request to Python backend
    const response = await fetch(`http://localhost:5000/get_barcode/${req.params.filename}`);
    
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      res.set('Content-Type', response.headers.get('Content-Type'));
      res.send(Buffer.from(buffer));
    } else {
      res.status(response.status).json({ 
        success: false, 
        error: 'Failed to get barcode image' 
      });
    }
  } catch (error) {
    console.error('Error proxying to Python backend:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to communicate with Python backend' 
    });
  }
});

app.get('/api/list_barcodes', async (req, res) => {
  try {
    const isBackendRunning = await checkPythonBackend();
    if (!isBackendRunning) {
      return res.status(503).json({ 
        success: false, 
        error: `Python backend is not running at http://localhost:5000` 
      });
    }

    // Forward request to Python backend
    const response = await fetch(`http://localhost:5000/list_barcodes`);
    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('Error proxying to Python backend:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to communicate with Python backend' 
    });
  }
});

// Rack Management API endpoints
app.get('/api/racks', async (req, res) => {
  try {
    const isBackendRunning = await checkPythonBackend();
    if (!isBackendRunning) {
      return res.status(503).json({ 
        success: false, 
        error: 'Python backend is not running on port 5000' 
      });
    }

    // Forward request to Python backend
    const url = new URL(`http://localhost:5000/api/racks`);
    if (req.query.search) url.searchParams.append('search', req.query.search);
    if (req.query.status) url.searchParams.append('status', req.query.status);
    
    const response = await fetch(url.toString());
    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('Error proxying to Python backend:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to communicate with Python backend' 
    });
  }
});

app.post('/api/racks', async (req, res) => {
  try {
    const isBackendRunning = await checkPythonBackend();
    if (!isBackendRunning) {
      return res.status(503).json({ 
        success: false, 
        error: 'Python backend is not running on port 5000' 
      });
    }

    // Forward request to Python backend
    const response = await fetch(`http://localhost:5000/api/racks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });

    const result = await response.json();
    res.status(response.status).json(result);
  } catch (error) {
    console.error('Error proxying to Python backend:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to communicate with Python backend' 
    });
  }
});

app.put('/api/racks/:id', async (req, res) => {
  try {
    const isBackendRunning = await checkPythonBackend();
    if (!isBackendRunning) {
      return res.status(503).json({ 
        success: false, 
        error: `Python backend is not running at http://localhost:5000` 
      });
    }

    // Forward request to Python backend
    const response = await fetch(`http://localhost:5000/api/racks/${req.params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });

    const result = await response.json();
    res.status(response.status).json(result);
  } catch (error) {
    console.error('Error proxying to Python backend:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to communicate with Python backend' 
    });
  }
});

app.delete('/api/racks/:id', async (req, res) => {
  try {
    const isBackendRunning = await checkPythonBackend();
    if (!isBackendRunning) {
      return res.status(503).json({ 
        success: false, 
        error: 'Python backend is not running on port 5000' 
      });
    }

    // Forward request to Python backend
    const response = await fetch(`http://localhost:5000/api/racks/${req.params.id}`, {
      method: 'DELETE'
    });

    const result = await response.json();
    res.status(response.status).json(result);
  } catch (error) {
    console.error('Error proxying to Python backend:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to communicate with Python backend' 
    });
  }
});

app.get('/api/racks/stats', async (req, res) => {
  try {
    const isBackendRunning = await checkPythonBackend();
    if (!isBackendRunning) {
      return res.status(503).json({ 
        success: false, 
        error: 'Python backend is not running on port 5000' 
      });
    }

    // Forward request to Python backend
    const response = await fetch(`http://localhost:5000/api/racks/stats`);
    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('Error proxying to Python backend:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to communicate with Python backend' 
    });
  }
});

app.get('/api/racks/search', async (req, res) => {
  try {
    const isBackendRunning = await checkPythonBackend();
    if (!isBackendRunning) {
      return res.status(503).json({ 
        success: false, 
        error: 'Python backend is not running on port 5000' 
      });
    }

    // Forward request to Python backend
    const url = new URL(`http://localhost:5000/api/racks/search`);
    if (req.query.q) url.searchParams.append('q', req.query.q);
    
    const response = await fetch(url.toString());
    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('Error proxying to Python backend:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to communicate with Python backend' 
    });
  }
});

// Proxy for rack quantity updates
app.post('/api/racks/:rackId/update-quantity', async (req, res) => {
  try {
    const isBackendRunning = await checkPythonBackend();
    if (!isBackendRunning) {
      return res.status(503).json({ 
        success: false, 
        error: 'Python backend is not running on port 5000' 
      });
    }

    // Forward request to Python backend
    const response = await fetch(`http://localhost:5000/api/racks/${req.params.rackId}/update-quantity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('Error proxying rack quantity update to Python backend:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to communicate with Python backend' 
    });
  }
});

// Proxy for rack status (operational monitoring)
app.get('/api/rack-status', async (req, res) => {
  try {
    const isBackendRunning = await checkPythonBackend();
    if (!isBackendRunning) {
      return res.status(503).json({ 
        success: false, 
        error: 'Python backend is not running on port 5000' 
      });
    }

    // Forward request to Python backend
    const response = await fetch(`http://localhost:5000/api/rack-status`);
    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('Error proxying rack status to Python backend:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to communicate with Python backend' 
    });
  }
});

app.post('/api/init-db', async (req, res) => {
  try {
    const isBackendRunning = await checkPythonBackend();
    if (!isBackendRunning) {
      return res.status(503).json({ 
        success: false, 
        error: 'Python backend is not running on port 5000' 
      });
    }

    // Forward request to Python backend
    const response = await fetch(`http://localhost:5000/api/init-db`, {
      method: 'POST'
    });
    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('Error proxying to Python backend:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to communicate with Python backend' 
    });
  }
});

// Backend API only - serve API info for root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Robridge Backend API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      esp32Ping: '/api/esp32/ping/:deviceId',
      esp32Scan: '/api/esp32/scan',
      startBackend: '/api/start-backend',
      stopBackend: '/api/stop-backend',
      backendStatus: '/api/backend-status'
    }
  });
});

// Redirect app setup for port 3000
redirectApp.get('*', (req, res) => {
  const redirectUrl = `http://localhost:${PORT}${req.originalUrl}`;
  console.log(`Redirecting from port ${REDIRECT_PORT} to port ${PORT}: ${redirectUrl}`);
  res.redirect(301, redirectUrl);
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected to WebSocket:', socket.id);
  
  // Send current ESP32 devices to newly connected client
  const devices = Array.from(esp32Devices.values());
  socket.emit('esp32_devices_update', devices);
  
  // Send latest scan if available
  if (lastBarcodeScan) {
    socket.emit('esp32_barcode_scan', lastBarcodeScan);
  }
  
  socket.on('disconnect', () => {
    console.log('Client disconnected from WebSocket:', socket.id);
  });
});

// Initialize database and start servers
const startServer = async () => {
  try {
    // Initialize database connection
    await initDatabase();
    console.log('✅ Database connection initialized');
    
    // Initialize tables
    await initBarcodesTable();
    await initSavedScansTable();
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    console.log('⚠️  Server will continue without database functionality');
  }
  
  // Start server
  server.listen(PORT, '0.0.0.0', () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🚀 Robridge Backend Server Started');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📡 Main server running on port ${PORT}`);
    console.log(`🌍 Environment: ${NODE_ENV}`);
    console.log(`🤖 AI Server: ${AI_SERVER_URL}`);
    console.log(`🏷️  Flask Server: http://localhost:5000`);
    console.log(`🔌 WebSocket server active on port ${PORT}`);
    console.log(`🗄️  Database: ${db ? 'Connected' : 'Not connected'}`);
    if (NODE_ENV === 'production') {
      console.log(`🌐 Production URL: https://robridge-express.onrender.com`);
    } else {
      console.log(`🌐 Local URL: http://localhost:${PORT}`);
    }
    console.log('═══════════════════════════════════════════════════════');
  });
};

startServer();

// Only start redirect server in development
if (NODE_ENV !== 'production') {
  redirectApp.listen(REDIRECT_PORT, () => {
    console.log(`Redirect server running on port ${REDIRECT_PORT}`);
    console.log(`Redirecting all traffic to port ${PORT}`);
  });
}
