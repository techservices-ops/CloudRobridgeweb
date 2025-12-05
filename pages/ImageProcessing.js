import React, { useState, useRef } from 'react';
import { FaUpload, FaImage, FaDownload, FaSave, FaCamera, FaFilter, FaAdjust } from 'react-icons/fa';
import './ImageProcessing.css';

const ImageProcessing = () => {
  const [originalImage, setOriginalImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingOptions, setProcessingOptions] = useState({
    grayscale: false,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    sharpen: 0
  });
  const canvasRef = useRef(null);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalImage(e.target.result);
        setProcessedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const captureFromCamera = () => {
    // Simulate camera capture
    const mockImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNhbWVyYSBDYXB0dXJlPC90ZXh0Pjwvc3ZnPg==';
    setOriginalImage(mockImage);
    setProcessedImage(null);
  };

  const processImage = () => {
    if (!originalImage) return;

    setIsProcessing(true);
    
    // Simulate processing delay
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Apply processing options
          ctx.filter = `
            ${processingOptions.grayscale ? 'grayscale(100%)' : ''}
            brightness(${processingOptions.brightness}%)
            contrast(${processingOptions.contrast}%)
            saturate(${processingOptions.saturation}%)
            blur(${processingOptions.blur}px)
          `.trim();
          
          ctx.drawImage(img, 0, 0);
          
          // Convert to data URL
          const processedDataUrl = canvas.toDataURL('image/png');
          setProcessedImage(processedDataUrl);
          setIsProcessing(false);
        };
        
        img.src = originalImage;
      }
    }, 1500);
  };

  const handleOptionChange = (option, value) => {
    setProcessingOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  const resetOptions = () => {
    setProcessingOptions({
      grayscale: false,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      sharpen: 0
    });
  };

  const downloadProcessedImage = () => {
    if (!processedImage) return;
    
    const link = document.createElement('a');
    link.download = 'processed-image.png';
    link.href = processedImage;
    link.click();
  };

  const saveProcessedImage = () => {
    if (!processedImage) return;
    
    // Simulate saving to database
    alert('Image saved successfully!');
  };

  const resetImages = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    resetOptions();
  };

  return (
    <div className="image-processing">
      <div className="processing-header">
        <h1>Image Processing</h1>
        <p>Upload images or capture from camera, then apply various filters and enhancements</p>
      </div>

      <div className="processing-container">
        {/* Upload Section */}
        <div className="upload-section card">
          <h2>Upload Section</h2>
          
          <div className="upload-options">
            <div className="upload-option">
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                onChange={handleImageUpload}
                className="file-input"
              />
              <label htmlFor="image-upload" className="upload-label">
                <FaUpload size={24} />
                <span>Upload Image</span>
                <span className="upload-hint">from local system</span>
              </label>
            </div>
            
            <div className="upload-option">
              <button className="camera-btn" onClick={captureFromCamera}>
                <FaCamera size={24} />
                <span>Capture from Camera</span>
                <span className="upload-hint">take a photo</span>
              </button>
            </div>
          </div>

          {originalImage && (
            <div className="uploaded-image">
              <img src={originalImage} alt="Original" />
              <div className="image-info">
                <span>Original Image</span>
              </div>
            </div>
          )}
        </div>

        {/* Processing Options */}
        <div className="processing-options card">
          <h2>Processing Options</h2>
          
          <div className="options-grid">
            <div className="option-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={processingOptions.grayscale}
                  onChange={(e) => handleOptionChange('grayscale', e.target.checked)}
                />
                <span>Convert to Grayscale</span>
              </label>
            </div>

            <div className="option-group">
              <label className="slider-label">
                Brightness: {processingOptions.brightness}%
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={processingOptions.brightness}
                onChange={(e) => handleOptionChange('brightness', parseInt(e.target.value))}
                className="slider"
              />
            </div>

            <div className="option-group">
              <label className="slider-label">
                Contrast: {processingOptions.contrast}%
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={processingOptions.contrast}
                onChange={(e) => handleOptionChange('contrast', parseInt(e.target.value))}
                className="slider"
              />
            </div>

            <div className="option-group">
              <label className="slider-label">
                Saturation: {processingOptions.saturation}%
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={processingOptions.saturation}
                onChange={(e) => handleOptionChange('saturation', parseInt(e.target.value))}
                className="slider"
              />
            </div>

            <div className="option-group">
              <label className="slider-label">
                Blur: {processingOptions.blur}px
              </label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={processingOptions.blur}
                onChange={(e) => handleOptionChange('blur', parseFloat(e.target.value))}
                className="slider"
              />
            </div>
          </div>

          <div className="processing-actions">
            <button 
              className="btn btn-primary" 
              onClick={processImage}
              disabled={!originalImage || isProcessing}
            >
              <FaFilter />
              {isProcessing ? 'Processing...' : 'Process Image'}
            </button>
            
            <button className="btn btn-secondary" onClick={resetOptions}>
              <FaAdjust />
              Reset Options
            </button>
          </div>
        </div>

        {/* Output Viewer */}
        {originalImage && (
          <div className="output-viewer card">
            <h2>Output Viewer</h2>
            
            <div className="image-comparison">
              <div className="image-container">
                <h3>Original</h3>
                <div className="image-wrapper">
                  <img src={originalImage} alt="Original" />
                </div>
              </div>
              
              <div className="image-container">
                <h3>Processed</h3>
                <div className="image-wrapper">
                  {processedImage ? (
                    <img src={processedImage} alt="Processed" />
                  ) : (
                    <div className="processing-placeholder">
                      <FaImage size={48} />
                      <p>Click "Process Image" to see the result</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {processedImage && (
              <div className="output-actions">
                <button className="btn btn-success" onClick={saveProcessedImage}>
                  <FaSave />
                  Save Processed Image
                </button>
                
                <button className="btn btn-secondary" onClick={downloadProcessedImage}>
                  <FaDownload />
                  Download
                </button>
                
                <button className="btn btn-secondary" onClick={resetImages}>
                  <FaAdjust />
                  Reset All
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default ImageProcessing;
