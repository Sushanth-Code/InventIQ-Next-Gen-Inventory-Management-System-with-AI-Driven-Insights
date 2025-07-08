import React, { useState, ReactNode, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Tooltip, Badge, Avatar, Menu, MenuItem, Divider, ListItemIcon, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import { Dashboard, Inventory, Calculate, Logout, AccountCircle, Notifications, Settings, AdminPanelSettings, Person, TrendingUp, Add, Edit, Delete, Refresh, Psychology, AutoGraph } from '@mui/icons-material';
import NotificationDropdown from './NotificationDropdown';

interface LayoutProps {
  children?: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, hasPermission, loginTime } = useAuth();
  const { unreadCount } = useNotifications();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();
  const location = useLocation();
  
  // Format login time for display
  const formattedLoginTime = loginTime ? new Date(loginTime).toLocaleString() : 'Unknown';
  
  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => {
      clearInterval(timer);
    };
  }, []);
  
  // Format current date and time for display in Indian format
  const formattedCurrentTime = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  
  const formattedCurrentDate = currentTime.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
  useEffect(() => {
    // Check if user has permission to access the current page
    const checkPermission = () => {
      const path = location.pathname;
      
      if (path.includes('/inventory/add') && !hasPermission('add_product')) {
        navigate('/dashboard');
      } else if (path.includes('/inventory/edit') && !hasPermission('edit_product')) {
        navigate('/dashboard');
      } else if (path === '/calculator' && !hasPermission('view_calculator')) {
        navigate('/dashboard');
      }
    };
    
    checkPermission();
  }, [location, hasPermission, navigate]);
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleNotificationOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
  };
  
  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };
  
  const handleLogoutClick = () => {
    handleMenuClose();
    setLogoutDialogOpen(true);
  };
  
  const handleLogoutConfirm = () => {
    setLogoutDialogOpen(false);
    logout();
    navigate('/login');
  };
  
  const handleLogoutCancel = () => {
    setLogoutDialogOpen(false);
  };
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`bg-[#4169e1] text-white ${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 flex flex-col shadow-lg`}>
        <div className="p-4 flex items-center justify-between border-b border-blue-700">
          <h1 className={`font-bold text-xl ${isSidebarOpen ? 'block' : 'hidden'}`}>INVENTIQ</h1>
          <button onClick={toggleSidebar} className="text-white focus:outline-none">
            <span className="material-icons">{isSidebarOpen ? 'menu_open' : 'menu'}</span>
          </button>
        </div>
        
        <nav className="flex-grow py-4">
          <ul>
            {/* Dashboard - Available to all users */}
            <li className="mb-2">
              <NavLink
                to="/dashboard"
                className={({ isActive }) => 
                  `flex items-center px-4 py-3 ${isActive ? 'bg-primary text-white' : 'text-gray-300 hover:bg-gray-700'}`
                }
              >
                <Dashboard className="mr-3" />
                {isSidebarOpen && <span>Dashboard</span>}
              </NavLink>
            </li>
            
            {/* Inventory - Available to all users */}
            <li className="mb-2">
              <NavLink
                to="/inventory"
                className={({ isActive }) => 
                  `flex items-center px-4 py-3 ${isActive ? 'bg-primary text-white' : 'text-gray-300 hover:bg-gray-700'}`
                }
              >
                <Inventory className="mr-3" />
                {isSidebarOpen && <span>Inventory</span>}
              </NavLink>
            </li>
            
            {/* Add Product - Admin only */}
            {hasPermission('add_product') && (
              <li className="mb-2">
                <NavLink
                  to="/inventory/add"
                  className={({ isActive }) => 
                    `flex items-center px-4 py-3 ${isActive ? 'bg-primary text-white' : 'text-gray-300 hover:bg-gray-700'}`
                  }
                >
                  <Add className="mr-3" />
                  {isSidebarOpen && <span>Add Product</span>}
                </NavLink>
              </li>
            )}
            
            {/* Inventory Calculator - Admin only */}
            {hasPermission('view_calculator') && (
              <li className="mb-2">
                <NavLink
                  to="/calculator"
                  className={({ isActive }) => 
                    `flex items-center px-4 py-3 ${isActive ? 'bg-primary text-white' : 'text-gray-300 hover:bg-gray-700'}`
                  }
                >
                  <Calculate className="mr-3" />
                  {isSidebarOpen && <span>Inventory Calculator</span>}
                </NavLink>
              </li>
            )}
            
            {/* Trends - Available to all users */}
            <li className="mb-2">
              <NavLink
                to="/trends"
                className={({ isActive }) => 
                  `flex items-center px-4 py-3 ${isActive ? 'bg-primary text-white' : 'text-gray-300 hover:bg-gray-700'}`
                }
              >
                <TrendingUp className="mr-3" />
                {isSidebarOpen && <span>Trends</span>}
              </NavLink>
            </li>
            
            {/* Smart Analysis - Available to all users */}
            <li className="mb-2">
              <NavLink
                to="/smart-analysis"
                className={({ isActive }) => 
                  `flex items-center px-4 py-3 ${isActive ? 'bg-primary text-white' : 'text-gray-300 hover:bg-gray-700'}`
                }
              >
                <Psychology className="mr-3" />
                {isSidebarOpen && <span>Smart Analysis</span>}
                {isSidebarOpen && <Chip size="small" label="AI" color="primary" sx={{ ml: 1, height: 16, fontSize: '0.6rem' }} />}
              </NavLink>
            </li>
          </ul>
        </nav>
        
        <div className="p-4 border-t border-gray-700">
          <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
            {isSidebarOpen && (
              <div>
                <p className="text-sm font-medium">{user?.username}</p>
                <div className="flex items-center">
                  <Chip 
                    size="small" 
                    label={user?.role} 
                    color={user?.role === 'admin' ? 'error' : 'primary'}
                    icon={user?.role === 'admin' ? <AdminPanelSettings fontSize="small" /> : <Person fontSize="small" />}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
            <Tooltip title="Logout">
              <button 
                onClick={handleLogoutClick}
                className="text-gray-400 hover:text-white"
              >
                <Logout />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-[#4169e1] text-white shadow-sm p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {location.pathname.includes('/dashboard') && 'Dashboard'}
              {location.pathname.includes('/inventory') && !location.pathname.includes('/add') && !location.pathname.includes('/edit') && 'Inventory'}
              {location.pathname.includes('/inventory/add') && 'Add New Product'}
              {location.pathname.includes('/inventory/edit') && 'Edit Product'}
              {location.pathname.includes('/calculator') && 'Inventory Calculator'}
              {location.pathname.includes('/trends') && 'Trend Analysis'}
              {location.pathname.includes('/smart-analysis') && 'Smart Analysis'}
            </h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <Tooltip title={`Last login: ${formattedLoginTime}`}>
              <div className="text-sm text-white cursor-pointer">
                <span className="hidden md:inline">Current Date: </span>
                <span className="font-medium text-white">{formattedCurrentDate}</span>
                <span className="ml-2 font-medium text-white">{formattedCurrentTime}</span>
              </div>
            </Tooltip>
            
            <Tooltip title="Notifications">
              <Badge badgeContent={unreadCount} color="primary" className="cursor-pointer" onClick={handleNotificationOpen}>
                <Notifications className="text-white" />
              </Badge>
            </Tooltip>
            
            {/* Notification Dropdown */}
            <NotificationDropdown anchorEl={notificationAnchorEl} onClose={handleNotificationClose} />
            
            <Tooltip title="Account settings">
              <Avatar 
                className="cursor-pointer bg-primary"
                onClick={handleMenuOpen}
                sx={{ width: 32, height: 32 }}
              >
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
            </Tooltip>
            
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              PaperProps={{
                elevation: 0,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
                  mt: 1.5,
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={handleMenuClose}>
                <ListItemIcon>
                  <AccountCircle fontSize="small" />
                </ListItemIcon>
                Profile
              </MenuItem>
              <MenuItem onClick={handleMenuClose}>
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                Settings
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogoutClick}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto bg-gray-100 p-6">
          {children || <Outlet />}
        </main>
      </div>
      
      {/* Logout confirmation dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={handleLogoutCancel}
      >
        <DialogTitle>Confirm Logout</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to log out?</Typography>
          <Box mt={2}>
            <Typography variant="body2" color="textSecondary">
              Logged in as: <strong>{user?.username}</strong> ({user?.role})
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLogoutCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleLogoutConfirm} color="error" variant="contained">
            Logout
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Layout;