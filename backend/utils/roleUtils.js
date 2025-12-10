/**
 * Role utility functions to handle roles as arrays
 * Supports backward compatibility with plain string roles
 */

/**
 * Normalize role to array format
 * @param {string|string[]|null|undefined} role - Role value (can be string, array, null, or undefined)
 * @returns {string[]} Array of roles
 */
export const normalizeRole = (role) => {
  if (!role) return [];
  if (Array.isArray(role)) return role;
  if (typeof role === 'string') return [role];
  return [];
};

/**
 * Check if user has a specific role
 * @param {string|string[]|null|undefined} userRole - User's role(s)
 * @param {string} requiredRole - Required role to check
 * @returns {boolean} True if user has the required role
 */
export const hasRole = (userRole, requiredRole) => {
  const roles = normalizeRole(userRole);
  return roles.includes(requiredRole);
};

/**
 * Check if user has any of the required roles
 * @param {string|string[]|null|undefined} userRole - User's role(s)
 * @param {string[]} requiredRoles - Array of required roles (user needs at least one)
 * @returns {boolean} True if user has at least one of the required roles
 */
export const hasAnyRole = (userRole, requiredRoles) => {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  const roles = normalizeRole(userRole);
  return requiredRoles.some(role => roles.includes(role));
};

/**
 * Check if user has all of the required roles
 * @param {string|string[]|null|undefined} userRole - User's role(s)
 * @param {string[]} requiredRoles - Array of required roles (user needs all)
 * @returns {boolean} True if user has all of the required roles
 */
export const hasAllRoles = (userRole, requiredRoles) => {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  const roles = normalizeRole(userRole);
  return requiredRoles.every(role => roles.includes(role));
};

/**
 * Get the primary role (first role in array, or the role itself if string)
 * Useful for display purposes or backward compatibility
 * @param {string|string[]|null|undefined} role - Role value
 * @returns {string|null} Primary role or null
 */
export const getPrimaryRole = (role) => {
  const roles = normalizeRole(role);
  return roles.length > 0 ? roles[0] : null;
};

/**
 * Check if role array is empty
 * @param {string|string[]|null|undefined} role - Role value
 * @returns {boolean} True if role is empty or null
 */
export const isRoleEmpty = (role) => {
  const roles = normalizeRole(role);
  return roles.length === 0;
};

