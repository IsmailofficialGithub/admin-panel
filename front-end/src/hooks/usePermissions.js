import { useState, useEffect, useCallback } from 'react';
import { getMyPermissions } from 'api/backend/permissions';
import { useAuth } from './useAuth';

/**
 * Custom hook to fetch and check user permissions
 * Fetches all permissions once and provides helper functions to check them
 * @returns {Object} { permissions, hasPermission, isLoading, error }
 */
export const usePermissions = () => {
  const { user, profile } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user || !profile) {
        setPermissions([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Systemadmins have all permissions - we'll handle this in hasPermission function
        if (profile.is_systemadmin === true) {
          setPermissions([]); // Empty array, but hasPermission will return true for systemadmins
          setIsLoading(false);
          return;
        }

        // Fetch all permissions at once
        const permissionsResult = await getMyPermissions();
        
        if (permissionsResult?.error) {
          console.error('Error fetching permissions:', permissionsResult.error);
          setError(permissionsResult.error);
          setPermissions([]);
          setIsLoading(false);
          return;
        }

        // permissionsResult is an array of { permission_name, granted }
        const permissionsList = Array.isArray(permissionsResult) 
          ? permissionsResult 
          : (permissionsResult?.data || []);
        
        setPermissions(permissionsList);
      } catch (err) {
        console.error('Error fetching permissions:', err);
        setError(err.message);
        setPermissions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, [user, profile]);

  /**
   * Check if user has a specific permission
   * @param {string} permissionName - Permission name to check (e.g., 'consumers.view')
   * @returns {boolean} Whether user has the permission
   */
  const hasPermission = useCallback((permissionName) => {
    if (!user || !profile) {
      return false;
    }

    // Systemadmins have all permissions
    if (profile.is_systemadmin === true) {
      return true;
    }

    // Check if permission exists and is granted
    const permission = permissions.find(
      p => (p.permission_name || p.name) === permissionName
    );
    
    return permission?.granted === true;
  }, [user, profile, permissions]);

  /**
   * Check if user has any of the specified permissions
   * @param {string[]} permissionNames - Array of permission names to check
   * @returns {boolean} Whether user has at least one of the permissions
   */
  const hasAnyPermission = useCallback((permissionNames) => {
    if (!user || !profile) {
      return false;
    }

    // Systemadmins have all permissions
    if (profile.is_systemadmin === true) {
      return true;
    }

    return permissionNames.some(name => hasPermission(name));
  }, [user, profile, hasPermission]);

  /**
   * Check if user has all of the specified permissions
   * @param {string[]} permissionNames - Array of permission names to check
   * @returns {boolean} Whether user has all of the permissions
   */
  const hasAllPermissions = useCallback((permissionNames) => {
    if (!user || !profile) {
      return false;
    }

    // Systemadmins have all permissions
    if (profile.is_systemadmin === true) {
      return true;
    }

    return permissionNames.every(name => hasPermission(name));
  }, [user, profile, hasPermission]);

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
    error
  };
};

export default usePermissions;

