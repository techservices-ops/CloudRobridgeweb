import React, { useState } from 'react';
import { FaEye, FaEyeSlash, FaLock, FaEnvelope, FaSignInAlt, FaUser } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Basic validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    // Call the login function from auth context
    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        setSuccess(result.message || 'Login successful! Redirecting...');
        // Redirect after short delay
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else {
        setError(result.message || 'Login failed. Please try again.');
      }
      
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="background-pattern"></div>
      </div>
      
      <div className="login-center">
        <div className="login-header">
          <img 
            src="./static/media/robridge-logo.png" 
            alt="Robridge Logo" 
            className="logo-image"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <div className="logo-fallback" style={{display: 'none'}}>
            <div className="-text">ROBRIDGE</div>
          </div>
          <h1 className="login-title">Welcome</h1>
          <p className="login-subtitle">Robot Control and Barcode Management System</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <div className="input-container">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="form-input with-icon"
                placeholder="Gmail"
                required
                disabled={isLoading}
              />
              <div className="input-icon-inside">
                <FaEnvelope />
              </div>
            </div>
          </div>

          <div className="form-group">
            <div className="input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="form-input with-icon"
                placeholder="Password"
                required
                disabled={isLoading}
              />
              <div className="input-icon-inside">
                <FaLock />
              </div>
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                disabled={isLoading}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              {success}
            </div>
          )}

          <button
            type="submit"
            className={`login-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                Signing In...
              </>
            ) : (
              <>
                <FaSignInAlt />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="credential-buttons-section">
          <div className="section-divider"></div>
          <h3 className="credential-title">Quick Login:</h3>
          
          <div className="credential-buttons">
            <button 
              type="button" 
              className="credential-btn expo-btn"
              onClick={() => {
                setFormData({ email: 'user@expo.com', password: 'expo123' });
              }}
              disabled={isLoading}
            >
              <FaUser />
              <div className="btn-content">
                <span className="btn-title">Expo User</span>
                <span className="btn-subtitle">user@expo.com / expo123</span>
              </div>
            </button>
            
            <button 
              type="button" 
              className="credential-btn admin-btn"
              onClick={() => {
                setFormData({ email: 'admin@robridge.com', password: 'admin123' });
              }}
              disabled={isLoading}
            >
              <FaUser />
              <div className="btn-content">
                <span className="btn-title">Admin</span>
                <span className="btn-subtitle">admin@robridge.com / admin123</span>
              </div>
            </button>
            
            <button 
              type="button" 
              className="credential-btn full-btn"
              onClick={() => {
                setFormData({ email: 'user@robridge.com', password: 'full123' });
              }}
              disabled={isLoading}
            >
              <FaUser />
              <div className="btn-content">
                <span className="btn-title">Full Access</span>
                <span className="btn-subtitle">user@robridge.com / full123</span>
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
