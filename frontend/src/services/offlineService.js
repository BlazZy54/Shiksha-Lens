// Offline service for handling data when internet is not available
export const offlineService = {
  // Store data in localStorage for offline sync
  storeOfflineData: (key, data) => {
    try {
      const existingData = JSON.parse(localStorage.getItem('offline_data') || '{}');
      existingData[key] = existingData[key] || [];
      existingData[key].push({
        ...data,
        timestamp: new Date().toISOString(),
        synced: false
      });
      localStorage.setItem('offline_data', JSON.stringify(existingData));
      return true;
    } catch (error) {
      console.error('Error storing offline data:', error);
      return false;
    }
  },

  // Get offline data
  getOfflineData: (key) => {
    try {
      const offlineData = JSON.parse(localStorage.getItem('offline_data') || '{}');
      return offlineData[key] || [];
    } catch (error) {
      console.error('Error getting offline data:', error);
      return [];
    }
  },

  // Mark data as synced
  markAsSynced: (key, timestamp) => {
    try {
      const offlineData = JSON.parse(localStorage.getItem('offline_data') || '{}');
      if (offlineData[key]) {
        const item = offlineData[key].find(item => item.timestamp === timestamp);
        if (item) {
          item.synced = true;
          localStorage.setItem('offline_data', JSON.stringify(offlineData));
        }
      }
    } catch (error) {
      console.error('Error marking data as synced:', error);
    }
  },

  // Get unsynced data
  getUnsyncedData: (key) => {
    try {
      const offlineData = JSON.parse(localStorage.getItem('offline_data') || '{}');
      return (offlineData[key] || []).filter(item => !item.synced);
    } catch (error) {
      console.error('Error getting unsynced data:', error);
      return [];
    }
  },

  // Clear synced data
  clearSyncedData: (key) => {
    try {
      const offlineData = JSON.parse(localStorage.getItem('offline_data') || '{}');
      if (offlineData[key]) {
        offlineData[key] = offlineData[key].filter(item => !item.synced);
        localStorage.setItem('offline_data', JSON.stringify(offlineData));
      }
    } catch (error) {
      console.error('Error clearing synced data:', error);
    }
  },

  // Check if online
  isOnline: () => {
    return navigator.onLine;
  },

  // Listen for online/offline events
  onOnline: (callback) => {
    window.addEventListener('online', callback);
  },

  onOffline: (callback) => {
    window.addEventListener('offline', callback);
  }
};
