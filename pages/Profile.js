import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaUser, FaEnvelope, FaIdCard, FaShieldAlt, FaPhone, FaLock, FaBuilding } from 'react-icons/fa';
import './Profile.css';

// Helper functions to generate user information based on login data
const getCompanyFromEmail = (email) => {
  if (!email) return 'Robridge Technologies';
  
  if (email.includes('@expo.com') || email.includes('@expo.dev') || email.includes('@expo.io')) {
    return 'Expo Technologies';
  } else if (email.includes('@admin.robridge.com')) {
    return 'Robridge Technologies (Admin)';
  } else if (email.includes('@robridge.com')) {
    return 'Robridge Technologies';
  }
  return 'Robridge Technologies';
};

const generateUserId = (email) => {
  if (!email) return 'USR001';
  
  // Generate ID based on email domain
  if (email.includes('@expo.com') || email.includes('@expo.dev') || email.includes('@expo.io')) {
    return 'EXPO001';
  } else if (email.includes('@admin.robridge.com')) {
    return 'ADM001';
  } else if (email.includes('@robridge.com')) {
    return 'USR001';
  }
  return 'USR001';
};

const formatMemberSince = (loginTime) => {
  if (!loginTime) return 'Jan 2024';
  
  const date = new Date(loginTime);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const getSecurityLevel = (role) => {
  switch (role) {
    case 'admin':
      return 'High';
    case 'full_access':
      return 'Standard';
    case 'expo_user':
      return 'Basic';
    default:
      return 'Standard';
  }
};

const getDepartmentFromRole = (role) => {
  switch (role) {
    case 'admin':
      return 'Administration';
    case 'full_access':
      return 'Operations';
    case 'expo_user':
      return 'Expo Operations';
    default:
      return 'Operations';
  }
};

const Profile = () => {
  const { getUserInfo, getUserRole } = useAuth();
  const user = getUserInfo();
  const userRole = getUserRole();
  const [userDetails, setUserDetails] = useState({
    name: user?.name || 'User',
    email: user?.email || 'user@expo.com',
    phone: '+91 1234567898',
    password: '••••••••',
    company: getCompanyFromEmail(user?.email),
    id: generateUserId(user?.email),
    role: userRole || 'expo_user',
    memberSince: formatMemberSince(user?.loginTime),
    securityLevel: getSecurityLevel(userRole),
    department: getDepartmentFromRole(userRole)
  });
  const [loading, setLoading] = useState(true);

  // Update user details based on login information
  useEffect(() => {
    if (user && userRole) {
      setUserDetails({
        name: user.name || 'User',
        email: user.email || 'user@expo.com',
        phone: '+91 1234567898', // Default phone - could be fetched from backend
        password: '••••••••',
        company: getCompanyFromEmail(user.email),
        id: generateUserId(user.email),
        role: userRole,
        memberSince: formatMemberSince(user.loginTime),
        securityLevel: getSecurityLevel(userRole),
        department: getDepartmentFromRole(userRole)
      });
      setLoading(false);
    }
  }, [user, userRole]);

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return 'role-badge-admin';
      case 'expo_user':
        return 'role-badge-expo';
      case 'full_access':
        return 'role-badge-full';
      default:
        return 'role-badge-default';
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'expo_user':
        return 'Expo User';
      case 'full_access':
        return 'Full Access';
      default:
        return 'User';
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-header">
          <h1>Profile</h1>
          <p>Loading your account information...</p>
        </div>
        <div className="loading-container">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>Profile</h1>
        <p>Manage your account information</p>
      </div>

      <div className="profile-container">
        <div className="profile-grid">
          {/* Profile Avatar Card - Large */}
          <div className="profile-avatar-card">
            <FaUser className="avatar-icon" />
            <div className="avatar-name">{userDetails.name}</div>
            <div className="avatar-role">{getRoleDisplayName(userDetails.role)}</div>
          </div>

          {/* User ID Card - Small */}
          <div className="user-id-card">
            <div className="card-label">
              <FaIdCard className="card-icon" />
              <span>User ID</span>
            </div>
            <div className="card-value">{userDetails.id}</div>
          </div>

          {/* Phone Card - Small */}
          <div className="phone-card">
            <div className="card-label">
              <FaPhone className="card-icon" />
              <span>Phone</span>
            </div>
            <div className="card-value">{userDetails.phone}</div>
          </div>

          {/* Password Card - Small */}
          <div className="password-card">
            <div className="card-label">
              <FaLock className="card-icon" />
              <span>Password</span>
            </div>
            <div className="card-value password-field">{userDetails.password}</div>
          </div>

          {/* Email Card - Medium */}
          <div className="email-card">
            <div className="card-label">
              <FaEnvelope className="card-icon" />
              <span>Email Address</span>
            </div>
            <div className="card-value">{userDetails.email}</div>
          </div>

          {/* Role Card - Medium */}
          <div className="role-card">
            <div className="card-label">
              <FaShieldAlt className="card-icon" />
              <span>Role</span>
            </div>
            <div className="card-value">
              <span className={`role-badge ${getRoleBadgeClass(userDetails.role)}`}>
                {getRoleDisplayName(userDetails.role)}
              </span>
            </div>
          </div>

          {/* Company Card - Large */}
          <div className="company-card">
            <div className="card-label">
              <FaBuilding className="card-icon" />
              <span>Company Name</span>
            </div>
            <div className="card-value">{userDetails.company}</div>
          </div>

          {/* Stats Card - Full Width */}
          <div className="stats-card">
            <div className="stat-item">
              <div className="card-label">
                <FaUser className="card-icon" />
                <span>Member Since</span>
              </div>
              <div className="card-value">{userDetails.memberSince || 'Jan 2024'}</div>
            </div>
            <div className="stat-item">
              <div className="card-label">
                <FaShieldAlt className="card-icon" />
                <span>Security Level</span>
              </div>
              <div className="card-value">{userDetails.securityLevel || 'Standard'}</div>
            </div>
            <div className="stat-item">
              <div className="card-label">
                <FaBuilding className="card-icon" />
                <span>Department</span>
              </div>
              <div className="card-value">{userDetails.department || 'Operations'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
