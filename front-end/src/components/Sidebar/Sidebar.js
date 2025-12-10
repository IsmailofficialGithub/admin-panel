/*!

=========================================================
* Light Bootstrap Dashboard React - v2.0.1
=========================================================

* Product Page: https://www.creative-tim.com/product/light-bootstrap-dashboard-react
* Copyright 2022 Creative Tim (https://www.creative-tim.com)
* Licensed under MIT (https://github.com/creativetimofficial/light-bootstrap-dashboard-react/blob/master/LICENSE.md)

* Coded by Creative Tim

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/
import React, { useState, useEffect } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { useAuth } from "hooks/useAuth";
import { getMyPermissions } from "api/backend/permissions";
import toast from "react-hot-toast";
import { hasRole } from "utils/roleUtils";

import { Nav } from "react-bootstrap";

import logo from "assets/img/reactlogo.png";

function Sidebar({ color, image, routes }) {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});
  const [hoveredSubmenu, setHoveredSubmenu] = useState(null);
  const { user, profile, signOut } = useAuth();
  const [hasDashboardPermission, setHasDashboardPermission] = useState(null); // null = checking, true/false = result
  const [hasUsersViewPermission, setHasUsersViewPermission] = useState(null); // null = checking, true/false = result
  const [hasConsumersViewPermission, setHasConsumersViewPermission] = useState(null); // null = checking, true/false = result
  const [hasResellersViewPermission, setHasResellersViewPermission] = useState(null); // null = checking, true/false = result
  const [hasProductsViewPermission, setHasProductsViewPermission] = useState(null); // null = checking, true/false = result
  const [hasActivityLogsViewPermission, setHasActivityLogsViewPermission] = useState(null); // null = checking, true/false = result
  const [hasOffersViewPermission, setHasOffersViewPermission] = useState(null); // null = checking, true/false = result
  const [hasSettingsViewPermission, setHasSettingsViewPermission] = useState(null); // null = checking, true/false = result
  const [hasCustomerSupportViewPermission, setHasCustomerSupportViewPermission] = useState(null); // null = checking, true/false = result
  const [hasInvoicesViewPermission, setHasInvoicesViewPermission] = useState(null); // null = checking, true/false = result
  const [myPermissions, setMyPermissions] = useState([]); // Store all permissions for efficient checking

  // Handle navigation click - check account status
  const handleNavClick = (e) => {
    if (profile) {
      // Check if reseller account is deactivated
      if (hasRole(profile.role, 'reseller') && profile.account_status === 'deactive') {
        e.preventDefault();
        e.stopPropagation();
        toast.error('Your account has been deactivated. Please contact the administrator.');
        signOut();
        return false;
      }
      // Check if consumer account is deactivated
      if (hasRole(profile.role, 'consumer') && profile.account_status === 'deactive') {
        e.preventDefault();
        e.stopPropagation();
        toast.error('Your account has been deactivated. Please contact the administrator.');
        signOut();
        return false;
      }
    }
    return true;
  };

  const activeRoute = (routeName) => {
    return location.pathname.indexOf(routeName) > -1 ? "active" : "";
  };

  const isSubmenuActive = (submenuPath) => {
    // Extract status parameter from submenu path
    const pathParts = submenuPath.split('?');
    const submenuBasePath = pathParts[0];
    const submenuParams = new URLSearchParams(pathParts[1] || '');
    const submenuStatus = submenuParams.get('status');
    
    // Extract status parameter from current location
    const currentParams = new URLSearchParams(location.search);
    const currentStatus = currentParams.get('status');
    
    // Check if paths match
    const pathMatch = location.pathname === submenuBasePath || location.pathname.includes(submenuBasePath);
    
    // Check if status matches (both must have a status and they must be equal)
    const statusMatch = submenuStatus && currentStatus && submenuStatus === currentStatus;
    
    return pathMatch && statusMatch;
  };

  const toggleSubmenu = (key) => {
    setExpandedMenus(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Fetch all permissions at once for efficient checking
  useEffect(() => {
    const fetchAllPermissions = async () => {
      if (!user || !profile) {
        return;
      }

      try {
        // Systemadmins have all permissions - set all to true immediately
        if (profile.is_systemadmin === true) {
          setHasDashboardPermission(true);
          setHasUsersViewPermission(true);
          setHasConsumersViewPermission(true);
          setHasResellersViewPermission(true);
          setHasProductsViewPermission(true);
          setHasActivityLogsViewPermission(true);
          setHasOffersViewPermission(true);
          setHasSettingsViewPermission(true);
          setHasCustomerSupportViewPermission(true);
          setHasInvoicesViewPermission(true);
          return;
        }

        // For non-systemadmins, fetch all permissions at once
        const permissionsResult = await getMyPermissions();
        
        if (permissionsResult?.error) {
          console.error('Error fetching permissions in Sidebar:', permissionsResult.error);
          // On error, set all to false (hide all tabs)
          setHasDashboardPermission(false);
          setHasUsersViewPermission(false);
          setHasConsumersViewPermission(false);
          setHasResellersViewPermission(false);
          setHasProductsViewPermission(false);
          setHasActivityLogsViewPermission(false);
          setHasOffersViewPermission(false);
          setHasSettingsViewPermission(false);
          setHasCustomerSupportViewPermission(false);
          setHasInvoicesViewPermission(false);
          return;
        }

        // permissionsResult is an array of { permission_name, granted }
        const permissions = Array.isArray(permissionsResult) ? permissionsResult : (permissionsResult?.data || []);
        setMyPermissions(permissions);

        // Create a Set of granted permission names for fast lookup
        const grantedPermissions = new Set(
          permissions
            .filter(p => p.granted === true)
            .map(p => p.permission_name)
        );

        // Check each permission
        setHasDashboardPermission(grantedPermissions.has('dashboard.view'));
        setHasUsersViewPermission(grantedPermissions.has('users.view'));
        setHasConsumersViewPermission(grantedPermissions.has('consumers.view'));
        setHasResellersViewPermission(grantedPermissions.has('resellers.view'));
        setHasProductsViewPermission(grantedPermissions.has('products.view'));
        setHasActivityLogsViewPermission(grantedPermissions.has('activity_logs.view'));
        setHasOffersViewPermission(grantedPermissions.has('offers.view'));
        setHasSettingsViewPermission(grantedPermissions.has('settings.view'));
        setHasCustomerSupportViewPermission(grantedPermissions.has('customer_support.view'));
        setHasInvoicesViewPermission(grantedPermissions.has('invoices.view'));
      } catch (error) {
        console.error('Error fetching permissions in Sidebar:', error);
        // On error, set all to false (hide all tabs)
        setHasDashboardPermission(false);
        setHasUsersViewPermission(false);
        setHasConsumersViewPermission(false);
        setHasResellersViewPermission(false);
        setHasProductsViewPermission(false);
        setHasActivityLogsViewPermission(false);
        setHasOffersViewPermission(false);
        setHasSettingsViewPermission(false);
        setHasCustomerSupportViewPermission(false);
        setHasInvoicesViewPermission(false);
      }
    };

    fetchAllPermissions();
  }, [user, profile]);

  // All permission checks are now done in the single fetchAllPermissions useEffect above

  // Auto-expand menu if a submenu is active, close if no status
  React.useEffect(() => {
    const currentParams = new URLSearchParams(location.search);
    const currentStatus = currentParams.get('status');
    
    if (currentStatus) {
      // If there's a status, expand the menu with active submenu
      routes.forEach((route, key) => {
        if (route.submenus && route.submenus.length > 0) {
          const hasActiveSubmenu = route.submenus.some(submenu => isSubmenuActive(submenu.path));
          if (hasActiveSubmenu) {
            setExpandedMenus(prev => ({
              ...prev,
              [key]: true
            }));
          }
        }
      });
    } else {
      // If no status parameter, close all submenus
      setExpandedMenus({});
    }
  }, [location.search]);

  return (
    <div className="sidebar" data-image={image} data-color={color}>
      <div
        className="sidebar-background"
        style={{
          backgroundImage: "url(" + image + ")"
        }}
      />
      <div className="sidebar-wrapper" style={{ position: 'relative', paddingBottom: '80px' }}>
        <div className="logo d-flex align-items-center justify-content-start">
          {/* <a
            href="#"
            className="simple-text logo-mini mx-1"
          >
            <div className="logo-img">
            DuhaNashrah
            </div>
          </a> */}
          <a className="simple-text" href="#">
              <img src={require("assets/img/image.png")} alt="..." style={{ width: '100%', height: '100%' }}/>
          </a>
        </div>
        <Nav>
          {routes.map((prop, key) => {
            // Filter out systemAdminOnly routes if user is not systemadmin
            if (prop.systemAdminOnly && (!profile || profile.is_systemadmin !== true)) {
              return null;
            }
            
            // Filter out Dashboard route if user doesn't have dashboard.view permission
            // Hide while checking (null) or if explicitly denied (false), only show if confirmed (true)
            if (prop.path === '/dashboard') {
              // Hide if still checking (null) or if permission denied (false)
              if (hasDashboardPermission !== true) {
                return null;
              }
            }

            // Filter out Users route if user doesn't have users.view permission
            if (prop.path === '/users') {
              // Hide if still checking (null) or if permission denied (false)
              if (hasUsersViewPermission !== true) {
                return null;
              }
            }

            // Filter out Consumers route if user doesn't have consumers.view permission
            if (prop.path === '/consumers') {
              // Hide if still checking (null) or if permission denied (false)
              if (hasConsumersViewPermission !== true) {
                return null;
              }
            }

            // Filter out Resellers route if user doesn't have resellers.view permission
            if (prop.path === '/resellers') {
              // Hide if still checking (null) or if permission denied (false)
              if (hasResellersViewPermission !== true) {
                return null;
              }
            }

            // Filter out Products route if user doesn't have products.view permission
            if (prop.path === '/products') {
              // Hide if still checking (null) or if permission denied (false)
              if (hasProductsViewPermission !== true) {
                return null;
              }
            }

            // Filter out Activity Logs route if user doesn't have activity_logs.view permission
            if (prop.path === '/activity-logs') {
              // Hide if still checking (null) or if permission denied (false)
              if (hasActivityLogsViewPermission !== true) {
                return null;
              }
            }

            // Filter out Offers route if user doesn't have offers.view permission
            if (prop.path === '/offers') {
              // Hide if still checking (null) or if permission denied (false)
              if (hasOffersViewPermission !== true) {
                return null;
              }
            }

            // Filter out Settings route if user doesn't have settings.view permission
            if (prop.path === '/settings') {
              // Hide if still checking (null) or if permission denied (false)
              if (hasSettingsViewPermission !== true) {
                return null;
              }
            }

            // Filter out Customer Support route if user doesn't have customer_support.view permission
            if (prop.path === '/customers') {
              // Hide if still checking (null) or if permission denied (false)
              if (hasCustomerSupportViewPermission !== true) {
                return null;
              }
            }

            // Filter out Invoices route if user doesn't have invoices.view permission
            if (prop.path === '/invoices') {
              // Hide if still checking (null) or if permission denied (false)
              if (hasInvoicesViewPermission !== true) {
                return null;
              }
            }
            
            if (!prop.redirect && prop.name && !prop.upgrade && !prop.invisible) {
              const hasSubmenus = prop.submenus && prop.submenus.length > 0;
              const isExpanded = expandedMenus[key];

              return (
                <React.Fragment key={key}>
                  <li
                    className={activeRoute(prop.layout + prop.path)}
                    style={{ position: 'relative' }}
                  >
                    {hasSubmenus ? (
                      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <NavLink
                          to={prop.layout + prop.path}
                          className="nav-link"
                          activeClassName="active"
                          style={{ flex: 1, paddingRight: '35px', position: 'relative', zIndex: 1 }}
                          onClick={(e) => {
                            // Check account status before navigation
                            if (!handleNavClick(e)) {
                              return;
                            }
                            // Close submenu if it's open
                            if (isExpanded) {
                              setExpandedMenus(prev => ({
                                ...prev,
                                [key]: false
                              }));
                            }
                          }}
                        >
                          <i className={prop.icon} />
                          <p>{prop.name}</p>
                        </NavLink>
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSubmenu(key);
                          }}
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                          }}
                          onMouseLeave={(e) => {
                            e.stopPropagation();
                          }}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            cursor: 'pointer',
                            padding: '6px',
                            zIndex: 9999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            pointerEvents: 'auto'
                          }}
                        >
                          <span
                            style={{ 
                              fontSize: '20px',
                              transition: 'all 0.3s ease',
                              color: '#FFD700',
                              fontWeight: 'bold',
                              lineHeight: '1',
                              textShadow: '0 0 2px rgba(0,0,0,0.5)',
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              display: 'inline-block'
                            }}
                          >
                            ▼
                          </span>
                        </div>
                      </div>
                    ) : (
                      <NavLink
                        to={prop.layout + prop.path}
                        className="nav-link"
                        activeClassName="active"
                        onClick={handleNavClick}
                      >
                        <i className={prop.icon} />
                        <p>{prop.name}</p>
                      </NavLink>
                    )}
                  </li>
                  
                  {/* Render submenus */}
                  {hasSubmenus && isExpanded && (
                    <ul style={{ 
                      listStyle: 'none', 
                      paddingLeft: '15px',
                      paddingRight: '10px',
                      marginTop: '0',
                      marginBottom: '5px',
                      backgroundColor: 'rgba(0,0,0,0.05)',
                      borderRadius: '4px',
                      paddingTop: '5px',
                      paddingBottom: '5px'
                    }}>
                      {prop.submenus.map((submenu, subKey) => {
                        // Build full path with layout prefix for comparison
                        const fullSubmenuPath = submenu.layout + submenu.path;
                        const isActive = isSubmenuActive(fullSubmenuPath);
                        const submenuId = `${key}-${subKey}`;
                        const isHovered = hoveredSubmenu === submenuId;
                        
                        return (
                          <li key={subKey}>
                            <NavLink
                              to={fullSubmenuPath}
                              className="nav-link"
                              onMouseEnter={() => setHoveredSubmenu(submenuId)}
                              onMouseLeave={() => setHoveredSubmenu(null)}
                              onClick={handleNavClick}
                              style={{
                                padding: '10px 12px 10px 35px',
                                fontSize: '13px',
                                minHeight: 'auto',
                                lineHeight: '1.4',
                                backgroundColor: isActive 
                                  ? 'rgba(255,215,0,0.2)' 
                                  : isHovered 
                                    ? 'rgba(255,255,255,0.08)' 
                                    : 'transparent',
                                borderLeft: isActive ? '4px solid #FFD700' : '4px solid transparent',
                                fontWeight: isActive ? '600' : 'normal',
                                color: isActive ? '#FFD700' : 'inherit',
                                transition: 'all 0.2s ease',
                                transform: isHovered && !isActive ? 'translateX(3px)' : 'translateX(0)',
                                borderRadius: '6px',
                                marginBottom: '2px'
                              }}
                            >
                              <p style={{ 
                                margin: 0, 
                                display: 'inline',
                                color: isActive ? '#FFD700' : 'inherit',
                                transition: 'color 0.2s ease'
                              }}>
                                {submenu.name}
                              </p>
                            </NavLink>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </React.Fragment>
              );
            }
            return null;
          })}
        </Nav>
        
        {/* Upgrade to PRO button at the bottom */}
        {routes.map((prop, key) => {
          if (prop.upgrade && prop.name) {
            return (
              <div 
                key={key}
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  left: '0',
                  right: '0',
                  padding: '0 15px'
                }}
              >
                <NavLink
                  to={prop.layout + prop.path}
                  className="nav-link active-pro"
                  onClick={handleNavClick}
                  style={{
                    textAlign: 'center',
                    backgroundColor: '#51cbce',
                    borderRadius: '8px',
                    padding: '12px 10px',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 8px rgba(81, 203, 206, 0.4)',
                    transition: 'all 0.3s ease',
                    color: '#ffffff'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#40b5b8';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(81, 203, 206, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#51cbce';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(81, 203, 206, 0.4)';
                  }}
                >
                  <i className={prop.icon} style={{ color: '#ffffff' }} />
                  <p style={{ margin: 0, display: 'inline', marginLeft: '8px', color: '#ffffff' }}>{prop.name}</p>
                </NavLink>
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

export default Sidebar;
