import React, { useState, useEffect } from 'react';

const PermissionRequest = ({ onPermissionGranted }) => {
  const [permissions, setPermissions] = useState({
    network: false,
    notifications: false,
    storage: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestPermissions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Request network permission
      if (navigator.permissions) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'network-state' });
          setPermissions(prev => ({ ...prev, network: permissionStatus.state === 'granted' }));
        } catch (e) {
          console.warn('Network state permission not supported:', e);
          setPermissions(prev => ({ ...prev, network: true }));
        }
      } else {
        setPermissions(prev => ({ ...prev, network: true }));
      }

      // Request notification permission
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        setPermissions(prev => ({ ...prev, notifications: permission === 'granted' }));
      } else {
        setPermissions(prev => ({ ...prev, notifications: true }));
      }

      // Check storage access
      if (navigator.storage && navigator.storage.persist) {
        const persisted = await navigator.storage.persisted();
        setPermissions(prev => ({ ...prev, storage: persisted }));
      } else {
        setPermissions(prev => ({ ...prev, storage: true }));
      }

    } catch (err) {
      console.error('Error requesting permissions:', err);
      setError('Failed to request permissions. Some features may not work correctly.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Auto-request permissions when component mounts
    requestPermissions();
  }, []);

  const allPermissionsGranted = Object.values(permissions).every(Boolean);

  useEffect(() => {
    if (allPermissionsGranted) {
      onPermissionGranted();
    }
  }, [allPermissionsGranted, onPermissionGranted]);

  if (allPermissionsGranted) {
    return null; // Render nothing if all permissions are granted
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Permissions Required</h2>
        <p className="mb-4">
          To use the Network Monitor, we need the following permissions:
        </p>
        
        <ul className="mb-6 space-y-2">
          <li className="flex items-center">
            <span className={`inline-block w-4 h-4 mr-2 rounded-full ${permissions.network ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
            Network access
          </li>
          <li className="flex items-center">
            <span className={`inline-block w-4 h-4 mr-2 rounded-full ${permissions.notifications ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
            Browser notifications
          </li>
          <li className="flex items-center">
            <span className={`inline-block w-4 h-4 mr-2 rounded-full ${permissions.storage ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
            Local storage
          </li>
        </ul>

        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <button
          onClick={requestPermissions}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Requesting Permissions...' : 'Grant Permissions'}
        </button>
      </div>
    </div>
  );
};

export default PermissionRequest;
