import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, Button, Card, CardContent, Container, FormControl, IconButton, InputAdornment, InputLabel, MenuItem, Paper, Select, SelectChangeEvent, TextField, Typography, Snackbar, Alert, CircularProgress } from '@mui/material';
import { AccountCircle, Lock, Visibility, VisibilityOff, AdminPanelSettings, Badge } from '@mui/icons-material';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userRole, setUserRole] = useState('staff');
  const [loginStatus, setLoginStatus] = useState<string | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { login, isLoading, error, user, logout } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if user is already logged in
    if (user) {
      setLoginStatus(`Logged in as ${user.username} (${user.role})`);
    } else {
      setLoginStatus(null);
    }
  }, [user]);

  const handleRoleChange = (event: SelectChangeEvent) => {
    setUserRole(event.target.value as string);
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Check if fields are empty
      if (!username.trim()) {
        throw new Error('Username is required');
      }
      if (!password.trim()) {
        throw new Error('Password is required');
      }
      
      // Attempt login through backend
      const result = await login(username, password, userRole);
      
      // Store the token and user info
      if (result && result.token) {
        localStorage.setItem('token', `Bearer ${result.token}`);
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('loginTime', new Date().toISOString());
        setOpenSnackbar(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
        return;
      }
      
      // Display the error message
      setErrorMessage('Login failed. Please try again.');
      setOpenSnackbar(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      // Display the error message
      setErrorMessage(err.message || 'Login failed. Please try again.');
      setOpenSnackbar(true);
    }
  };

  const handleLogout = () => {
    logout();
    setLoginStatus(null);
    setOpenSnackbar(true);
  };
  
  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 2
      }}
    >
      <Container maxWidth="sm">
        <Paper 
          elevation={10} 
          sx={{ 
            borderRadius: 3,
            overflow: 'hidden'
          }}
        >
          <Box 
            sx={{ 
              bgcolor: 'primary.main', 
              color: 'white', 
              p: 3, 
              textAlign: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            <Typography variant="h4" component="h1" fontWeight="bold">
              InventIQ
            </Typography>
            <Typography variant="subtitle1">
              Inventory Management System
            </Typography>
          </Box>

          <CardContent sx={{ p: 4 }}>
            {loginStatus ? (
              <Box sx={{ textAlign: 'center', my: 2 }}>
                <Alert 
                  severity="success" 
                  sx={{ mb: 3 }}
                  action={
                    <Button color="inherit" size="small" onClick={handleLogout}>
                      Logout
                    </Button>
                  }
                >
                  {loginStatus}
                </Alert>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={() => navigate('/dashboard')}
                  fullWidth
                  size="large"
                >
                  Go to Dashboard
                </Button>
              </Box>
            ) : (
              <form onSubmit={handleSubmit}>
                <Typography variant="h6" sx={{ mb: 3, textAlign: 'center' }}>
                  Sign in to your account
                </Typography>
                
                {(error || errorMessage) && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {errorMessage || error}
                  </Alert>
                )}
                
                <FormControl fullWidth margin="normal" variant="outlined">
                  <InputLabel id="role-select-label">User Role</InputLabel>
                  <Select
                    labelId="role-select-label"
                    id="role-select"
                    value={userRole}
                    onChange={handleRoleChange}
                    label="User Role"
                    startAdornment={
                      <InputAdornment position="start">
                        {userRole === 'admin' ? <AdminPanelSettings /> : <Badge />}
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="staff">Staff</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="username"
                  label="Username"
                  name="username"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccountCircle />
                      </InputAdornment>
                    ),
                  }}
                />
                
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          onMouseDown={handleMouseDownPassword}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
                
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{ mt: 3, mb: 2, py: 1.5, borderRadius: 2 }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Sign In'
                  )}
                </Button>
                
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Admin has full permissions | Staff has limited access
                  </Typography>
                </Box>
              </form>
            )}
          </CardContent>
        </Paper>
        
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2" color="white">
            © {new Date().getFullYear()} InventIQ. All rights reserved.
          </Typography>
        </Box>
      </Container>
      
      <Snackbar 
        open={openSnackbar} 
        autoHideDuration={3000} 
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setOpenSnackbar(false)} 
          severity={error ? 'error' : 'success'} 
          sx={{ width: '100%' }}
        >
          {error ? error : user ? 'Successfully logged in!' : 'Successfully logged out!'}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LoginPage;