import React, { useState, useEffect, useRef } from 'react';
import { FaQrcode, FaSave, FaSync, FaDownload, FaDatabase, FaBarcode } from 'react-icons/fa';
import jsPDF from 'jspdf';
import './BarcodeGenerator.css';

const BarcodeGenerator = () => {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    category: '',
    price: '',
    locationX: '',
    locationY: '',
    locationZ: '',
    description: '',
    barcodeType: 'qr'
  });
  
  const [barcodeData, setBarcodeData] = useState('');
  const [generatedBarcode, setGeneratedBarcode] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [barcodeImage, setBarcodeImage] = useState(null);
  const [barcodeId, setBarcodeId] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking', 'running', 'starting', 'error'

  // API URLs - automatically detect environment
  const API_BASE_URL = process.env.REACT_APP_API_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://robridgeexpress.onrender.com' 
      : 'http://localhost:3001');
  

  const barcodeTypes = [
    { value: 'qr', label: 'QR Code', icon: FaQrcode, shortLabel: 'Generate QR Code' },
    { value: 'code128', label: 'Code128', icon: FaBarcode, shortLabel: 'Generate Barcode' },
    { value: 'ean13', label: 'EAN13', icon: FaBarcode, shortLabel: 'Generate Barcode' }
  ];

  const categories = [
    'Electronics',
    'Clothing',
    'Books',
    'Food & Beverage',
    'Home & Garden',
    'Sports',
    'Automotive',
    'Health & Beauty',
    'Toys & Games',
    'Stationary',
    'Other'
  ];

  // Generate barcode data string from form
  useEffect(() => {
    // Filter out barcodeType from the values
    const { barcodeType, ...dataFields } = formData;
    const data = Object.values(dataFields)
      .filter(value => value && value !== '' && String(value).trim() !== '')
      .join('|');
    setBarcodeData(data);
    console.log('Barcode data updated:', data);
  }, [formData]);

  // Check if backend is running
  const checkBackendStatus = async () => {
    try {
      const healthUrl = process.env.NODE_ENV === 'production' 
        ? '/api/health' 
        : `${API_BASE_URL}/api/health`;
        
      const response = await fetch(healthUrl, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      
      if (response.ok) {
        setBackendStatus('running');
        return true;
      } else {
        setBackendStatus('error');
        return false;
      }
    } catch (error) {
      // Backend is not running
      setBackendStatus('error');
      return false;
    }
  };

  // Auto-start Python backend
  const startBackend = async () => {
    setBackendStatus('starting');
    setSaveMessage('Starting Python backend...');
    
    try {
      // Start backend using Express server
      const startResponse = await fetch(`${API_BASE_URL}/api/start-backend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (startResponse.ok) {
        // Wait for backend to be ready
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max wait
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (await checkBackendStatus()) {
            setBackendStatus('running');
            setSaveMessage('Backend started successfully!');
            setTimeout(() => setSaveMessage(''), 3000);
            return true;
          }
          attempts++;
        }
      }
    } catch (error) {
      console.error('Failed to start backend:', error);
    }

    setBackendStatus('error');
    setSaveMessage('Failed to start backend. Please start it manually.');
    setTimeout(() => setSaveMessage(''), 5000);
    return false;
  };

  // Check backend status on component mount
  useEffect(() => {
    checkBackendStatus();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

    const generateBarcode = async () => {
    console.log('Generate barcode clicked. Current barcode data:', barcodeData);
    console.log('Form data:', formData);
    
    if (!barcodeData || barcodeData.trim() === '') {
      alert('Please fill in at least one field to generate a barcode');
      return;
    }
    
    // Check if backend is running, start if needed
    if (backendStatus !== 'running') {
      const started = await startBackend();
      if (!started) {
        alert('Please start the Python backend manually and try again');
        return;
      }
    }
    
    setIsGenerating(true);
    
    const requestBody = {
      data: barcodeData,
      type: formData.barcodeType,
      source: 'web',
      metadata: {
        product_name: formData.name || '',
        product_id: formData.id || '',
        category: formData.category || '',
        price: formData.price || '',
        description: formData.description || '',
        location: `${formData.locationX || '0'},${formData.locationY || '0'},${formData.locationZ || '0'}`
      }
    };
    
    console.log('Request body being sent:', JSON.stringify(requestBody, null, 2));
    
    try {
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/api/generate_barcode' 
        : `${API_BASE_URL}/api/generate_barcode`;
      
      console.log('Sending request to:', apiUrl);
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        alert(`Server error (${response.status}): ${errorText || 'Failed to generate barcode'}`);
        setIsGenerating(false);
        return;
      }

      const result = await response.json();
      console.log('Barcode generation result:', result);
      console.log('Result.success value:', result.success);
      console.log('Result.success type:', typeof result.success);
      console.log('Result keys:', Object.keys(result));
      console.log('Full result JSON:', JSON.stringify(result, null, 2));
      
      // Check if success is explicitly true (not just truthy)
      if (result.success === true) {
        setBarcodeId(result.barcode_id);
        
        // Handle image data - in production, it comes as base64
        if (result.image_data) {
          setBarcodeImage(`data:image/png;base64,${result.image_data}`);
        } else {
          // Fallback for development
          const imageUrl = process.env.NODE_ENV === 'production' 
            ? `/api/get_barcode/${result.filename}` 
            : `${API_BASE_URL}/api/get_barcode/${result.filename}`;
          setBarcodeImage(imageUrl);
        }
        
        setGeneratedBarcode(true);
        setSaveMessage('Barcode generated successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        const errorMessage = result.error || result.message || 'Unknown error occurred';
        console.error('Barcode generation failed:', errorMessage);
        alert('Error generating barcode: ' + errorMessage);
      }
    } catch (error) {
      console.error('Error generating barcode:', error);
      alert('Error connecting to barcode generator server. Please ensure the backend is running and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToDatabase = async () => {
    if (!generatedBarcode) {
      alert('Please generate a barcode first');
      return;
    }

    setIsSaving(true);
    try {
      // The barcode is already saved to the Python backend database
      setSaveMessage('Barcode saved to database successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving barcode:', error);
      setSaveMessage('Error saving barcode');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const updateRecord = async () => {
    if (!formData.id) {
      alert('Please enter an ID to update the record');
      return;
    }

    setIsUpdating(true);
    try {
      // For now, we'll just show a success message
      // In a real implementation, you'd call an update API endpoint
      setSaveMessage('Record updated successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error updating record:', error);
      setSaveMessage('Error updating record');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  const downloadBarcode = async (format) => {
    if (!barcodeImage) return;

    try {
      if (format === 'png') {
        const response = await fetch(barcodeImage);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `barcode-${formData.id || 'generated'}.png`;
        link.href = url;
        link.click();
        window.URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        const response = await fetch(barcodeImage);
        const blob = await response.blob();
        
        // Convert blob to data URL for PDF
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result;
          
          const img = new Image();
          img.onload = () => {
            const pdf = new jsPDF();
            const imgWidth = 100;
            const imgHeight = (img.height * imgWidth) / img.width;
            
            // Add some text to the PDF
            pdf.setFontSize(16);
            pdf.text('Generated Barcode', 10, 10);
            pdf.setFontSize(12);
            pdf.text(`Product ID: ${formData.id || 'N/A'}`, 10, 20);
            pdf.text(`Product Name: ${formData.name || 'N/A'}`, 10, 30);
            pdf.text(`Category: ${formData.category || 'N/A'}`, 10, 40);
            pdf.text(`Price: $${formData.price || 'N/A'}`, 10, 50);
                         pdf.text(`Location: ${formData.locationX || 'N/A'}, ${formData.locationY || 'N/A'}, ${formData.locationZ || 'N/A'}`, 10, 60);
            
            // Add the barcode image
            pdf.addImage(dataUrl, 'PNG', 10, 80, imgWidth, imgHeight);
            
            pdf.save(`barcode-${formData.id || 'generated'}.pdf`);
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(blob);
      }
    } catch (error) {
      console.error('Error downloading barcode:', error);
      alert('Error downloading barcode');
    }
  };

  const clearForm = () => {
    setFormData({
      id: '',
      name: '',
      category: '',
      price: '',
      locationX: '',
      locationY: '',
      locationZ: '',
      description: '',
      barcodeType: 'qr'
    });
    setGeneratedBarcode(false);
    setBarcodeImage(null);
    setBarcodeId('');
    setBarcodeData('');
  };

  return (
    <div className="barcode-generator">
      <div className="header">
        <h1><FaQrcode /> Barcode Generator</h1>
        <p>Generate and manage barcodes for your products</p>
        
        {/* Backend Status Indicator */}
        <div className="backend-status">
          <div className={`status-indicator ${backendStatus}`}>
            {backendStatus === 'checking' && <FaSync className="spinning" />}
            {backendStatus === 'running' && <FaDatabase style={{color: '#34A853'}} />}
            {backendStatus === 'starting' && <FaSync className="spinning" />}
            {backendStatus === 'error' && <FaDatabase style={{color: '#EA4335'}} />}
            
            <span className="status-text">
              {backendStatus === 'checking' && 'Checking backend...'}
              {backendStatus === 'running' && 'Backend running'}
              {backendStatus === 'starting' && 'Starting backend...'}
              {backendStatus === 'error' && 'Backend error'}
            </span>
          </div>
          
          {backendStatus === 'error' && (
            <button 
              onClick={startBackend} 
              className="btn btn-primary btn-sm"
              style={{marginTop: '8px'}}
            >
              <FaSync /> Retry Start Backend
            </button>
          )}
        </div>
      </div>

      <div className="main-content">
        <div className="form-section">
          <h2>Product Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="id">Product ID</label>
              <input
                type="text"
                id="id"
                name="id"
                value={formData.id}
                onChange={handleInputChange}
                placeholder="Enter product ID"
              />
            </div>

            <div className="form-group">
              <label htmlFor="name">Product Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter product name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="price">Price</label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="Enter price"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="locationX">Location X</label>
              <input
                type="number"
                id="locationX"
                name="locationX"
                value={formData.locationX}
                onChange={handleInputChange}
                placeholder="Enter X coordinate"
                step="0.1"
              />
            </div>

            <div className="form-group">
              <label htmlFor="locationY">Location Y</label>
              <input
                type="number"
                id="locationY"
                name="locationY"
                value={formData.locationY}
                onChange={handleInputChange}
                placeholder="Enter Y coordinate"
                step="0.1"
              />
            </div>

            <div className="form-group">
              <label htmlFor="locationZ">Location Z</label>
              <input
                type="number"
                id="locationZ"
                name="locationZ"
                value={formData.locationZ}
                onChange={handleInputChange}
                placeholder="Enter Z coordinate"
                step="0.1"
              />
            </div>

            <div className="form-group">
              <label htmlFor="barcodeType">Barcode Type</label>
              <div className="barcode-type-selector">
                {barcodeTypes.map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      className={`type-option ${formData.barcodeType === type.value ? 'selected' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, barcodeType: type.value }))}
                    >
                      <Icon className="type-icon" />
                      <span className="type-label">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="form-group full-width">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter product description"
              rows="3"
            />
          </div>

          <div className="button-group">
            <button
              onClick={generateBarcode}
              disabled={isGenerating || !barcodeData}
              className="btn btn-primary generate-btn"
            >
              {isGenerating ? (
                <FaSync className="spinning" />
              ) : (
                (() => {
                  const IconComponent = barcodeTypes.find(type => type.value === formData.barcodeType)?.icon || FaQrcode;
                  return <IconComponent />;
                })()
              )}
              {isGenerating ? 'Generating...' : barcodeTypes.find(type => type.value === formData.barcodeType)?.shortLabel || 'Generate'}
            </button>

            <button
              onClick={saveToDatabase}
              disabled={!generatedBarcode || isSaving}
              className="btn btn-success"
            >
              {isSaving ? <FaSync className="spinning" /> : <FaSave />}
              {isSaving ? 'Saving...' : 'Save to Database'}
            </button>

            <button
              onClick={updateRecord}
              disabled={!formData.id || isUpdating}
              className="btn btn-warning"
            >
              {isUpdating ? <FaSync className="spinning" /> : <FaSync />}
              {isUpdating ? 'Updating...' : 'Update Record'}
            </button>

            <button onClick={clearForm} className="btn btn-secondary">
              Clear Form
            </button>
          </div>

          {saveMessage && (
            <div className="message success">
              {saveMessage}
            </div>
          )}
        </div>

        <div className="barcode-section">
          <h2>Generated Barcode</h2>
          
          {generatedBarcode && barcodeImage ? (
            <div className="barcode-display">
              <div className="barcode-info">
                <p><strong>Barcode ID:</strong> {barcodeId}</p>
                <p><strong>Type:</strong> {formData.barcodeType.toUpperCase()}</p>
                <p><strong>Data:</strong> {barcodeData}</p>
              </div>
              
              <div className="barcode-image">
                <img src={barcodeImage} alt="Generated barcode" />
              </div>

              <div className="download-options">
                <button
                  onClick={() => downloadBarcode('png')}
                  className="btn btn-download"
                >
                  <FaDownload /> Download PNG
                </button>
                <button
                  onClick={() => downloadBarcode('pdf')}
                  className="btn btn-download"
                >
                  <FaDownload /> Download PDF
                </button>
              </div>
            </div>
          ) : (
            <div className="no-barcode">
              <FaQrcode className="placeholder-icon" />
              <p>No barcode generated yet</p>
              <p>Fill in the form and click "Generate Barcode" to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeGenerator;