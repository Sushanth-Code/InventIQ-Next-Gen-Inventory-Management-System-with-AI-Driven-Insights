import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  Paper,
  IconButton,
  Chip,
  Checkbox,
  Tooltip
} from '@mui/material';
import { Check, Delete, MarkEmailRead, DeleteSweep } from '@mui/icons-material';
import { useNotifications } from '../../contexts/NotificationContext';

interface NotificationDropdownProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ anchorEl, onClose }) => {
  const { notifications, markAsRead, markAllAsRead, clearNotifications, clearSelectedNotifications } = useNotifications();
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  
  const handleSelectNotification = (id: string) => {
    setSelectedNotifications(prev => {
      if (prev.includes(id)) {
        return prev.filter(notificationId => notificationId !== id);
      } else {
        return [...prev, id];
      }
    });
  };
  
  const handleClearSelected = () => {
    if (selectedNotifications.length > 0) {
      clearSelectedNotifications(selectedNotifications);
      setSelectedNotifications([]);
    }
  };
  
  const handleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map(n => n.id));
    }
  };
  
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than a minute
    if (diff < 60000) {
      return 'Just now';
    }
    
    // Less than an hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    
    // Less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    // Format as date
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getIconForType = (type: string, message: string) => {
    // Check if it's an out-of-stock notification
    if (message.toLowerCase().includes('out of stock')) {
      return 'bg-orange-100 text-orange-800';
    }

    switch (type) {
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-orange-100 text-orange-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };
  
  const open = Boolean(anchorEl);
  
  return (
    <Paper
      sx={{
        display: open ? 'block' : 'none',
        position: 'absolute',
        top: 64,
        right: 16,
        width: 320,
        maxHeight: 480,
        overflow: 'auto',
        zIndex: 1300,
        boxShadow: 3,
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box display="flex" alignItems="center">
          <Checkbox
            size="small"
            checked={selectedNotifications.length === notifications.length && notifications.length > 0}
            indeterminate={selectedNotifications.length > 0 && selectedNotifications.length < notifications.length}
            onChange={handleSelectAll}
            disabled={notifications.length === 0}
          />
          <Typography variant="h6">Notifications</Typography>
        </Box>
        <Box>
          <Tooltip title="Mark all as read">
            <IconButton size="small" onClick={markAllAsRead} disabled={notifications.length === 0}>
              <MarkEmailRead fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear selected">
            <span>
              <IconButton
                size="small"
                onClick={handleClearSelected}
                disabled={selectedNotifications.length === 0}
              >
                <DeleteSweep fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Clear all">
            <IconButton size="small" onClick={clearNotifications} disabled={notifications.length === 0}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {notifications.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">No notifications</Typography>
        </Box>
      ) : (
        <List sx={{ p: 0 }}>
          {notifications.map((notification, index) => (
            <React.Fragment key={notification.id}>
              <ListItem
                alignItems="flex-start"
                sx={{
                  bgcolor: notification.read ? 'transparent' : 'rgba(25, 118, 210, 0.05)',
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' },
                }}
              >
                <Checkbox
                  size="small"
                  checked={selectedNotifications.includes(notification.id)}
                  onChange={() => handleSelectNotification(notification.id)}
                  sx={{ mr: 1, alignSelf: 'center' }}
                />
                <ListItemText
                  primary={
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" component="span">
                        {notification.message}
                      </Typography>
                      {!notification.read && (
                        <IconButton
                          size="small"
                          onClick={() => markAsRead(notification.id)}
                          sx={{ ml: 1 }}
                        >
                          <Check fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  }
                  secondary={
                    <React.Fragment>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                        <Chip
                          label={notification.message.toLowerCase().includes('out of stock') ? 'WARNING' : notification.type.toUpperCase()}
                          size="small"
                          className={getIconForType(notification.type, notification.message)}
                        />
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          component="span"
                        >
                          {formatTimestamp(notification.timestamp)}
                        </Typography>
                      </Box>
                    </React.Fragment>
                  }
                />
              </ListItem>
              {index < notifications.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      )}
      
      <Box sx={{ p: 2, borderTop: '1px solid #eee', textAlign: 'center' }}>
        <Button size="small" onClick={onClose}>
          Close
        </Button>
      </Box>
    </Paper>
  );
};

export default NotificationDropdown;
