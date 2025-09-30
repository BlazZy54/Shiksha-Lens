import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mockCredentials } from '../data/mockData';
import Message from './Message';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'Teacher'
  });
  const [error, setError] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const { login } = useAuth();

  const roles = [
    { value: 'Teacher', label: 'Teacher', description: 'Capture and submit attendance' },
    { value: 'Administrator', label: 'Administrator', description: 'Manage users and view records' },
    { value: 'Officer', label: 'Officer', description: 'View reports and analytics' },
    { value: 'Student', label: 'Student', description: 'View personal attendance' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Map role to credential key
    const roleMap = {
      'Teacher': 'teacher',
      'Administrator': 'admin',
      'Officer': 'officer',
      'Student': 'student'
    };

    // Check credentials
    const credentialKey = roleMap[formData.role];
    const credentials = mockCredentials[credentialKey];
    
    console.log('Login attempt:', {
      role: formData.role,
      credentialKey,
      credentials,
      username: formData.username,
      password: formData.password
    });
    
    if (credentials && 
        formData.username === credentials.username && 
        formData.password === credentials.password) {
      
      const userData = {
        username: formData.username,
        role: formData.role,
        name: `${formData.role} User`,
        id: Date.now()
      };
      
      login(userData);
    } else {
      setError('Invalid username or password for the selected role');
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-600">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            ShikshaLens
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Role
              </label>
              <div className="grid grid-cols-1 gap-3">
                {roles.map((role) => (
                  <label key={role.value} className="relative">
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={formData.role === role.value}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.role === role.value 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                          formData.role === role.value 
                            ? 'border-primary-500 bg-primary-500' 
                            : 'border-gray-300'
                        }`}>
                          {formData.role === role.value && (
                            <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{role.label}</div>
                          <div className="text-sm text-gray-500">{role.description}</div>
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleInputChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Enter username"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Enter password"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              Sign In
            </button>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Demo Credentials:</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <div><strong>Teacher:</strong> teacher / teacher123</div>
              <div><strong>Admin:</strong> admin / admin123</div>
              <div><strong>Officer:</strong> officer / officer123</div>
              <div><strong>Student:</strong> student / student123</div>
            </div>
          </div>
        </form>
      </div>

      {showMessage && (
        <Message
          type="error"
          message={error}
          onClose={() => setShowMessage(false)}
        />
      )}
    </div>
  );
};

export default Login;
