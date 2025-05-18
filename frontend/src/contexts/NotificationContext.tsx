import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { inventoryService } from '../services/api';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  clearNotifications: () => void;
  clearSelectedNotifications: (ids: string[]) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

interface Product {
  id: string;
  name: string;
  current_stock: number;
  reorder_level: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Function to check inventory status and update notifications
  const checkInventoryStatus = async () => {
    try {
      const products = await inventoryService.getAllProducts() as Product[];

      const newNotifications: Notification[] = [];
      const existingIds = new Set(notifications.map(n => n.id));

      // Check for out of stock products
      const outOfStockProducts = products.filter(p => p.current_stock === 0);
      if (outOfStockProducts.length > 0) {
        const summaryId = `out-of-stock-${Date.now()}`;
        if (!existingIds.has(summaryId)) {
          newNotifications.push({
            id: summaryId,
            message: `${outOfStockProducts.length} products are out of stock!`,
            type: 'warning',
            timestamp: new Date(),
            read: false
          });
        }

        // Add individual notifications for each out of stock product
        outOfStockProducts.forEach((product: Product) => {
          const productId = `product-${product.id}-out-of-stock`;
          if (!existingIds.has(productId)) {
            newNotifications.push({
              id: productId,
              message: `${product.name} is out of stock.`,
              type: 'warning',
              timestamp: new Date(),
              read: false
            });
          }
        });
      }

      // Check for low stock products
      const lowStockProducts = products.filter(p => p.current_stock > 0 && p.current_stock <= p.reorder_level);
      if (lowStockProducts.length > 0) {
        const summaryId = `low-stock-${Date.now()}`;
        if (!existingIds.has(summaryId)) {
          newNotifications.push({
            id: summaryId,
            message: `${lowStockProducts.length} products are running low!`,
            type: 'warning',
            timestamp: new Date(),
            read: false
          });
        }

        // Add individual notifications for each low stock product
        lowStockProducts.forEach((product: Product) => {
          const productId = `product-${product.id}-low-stock`;
          if (!existingIds.has(productId)) {
            newNotifications.push({
              id: productId,
              message: `${product.name} is running low (${product.current_stock} left).`,
              type: 'warning',
              timestamp: new Date(),
              read: false
            });
          }
        });
      }

      // Add new notifications to the existing ones
      if (newNotifications.length > 0) {
        setNotifications(prev => [...newNotifications, ...prev]);
      }
    } catch (error) {
      console.error('Failed to check inventory status:', error);
    }
  };

  // Initial load and polling setup
  useEffect(() => {
    // Initial check
    checkInventoryStatus();

    // Set up polling every 30 seconds
    const pollInterval = setInterval(checkInventoryStatus, 30000);

    // Cleanup
    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  // Subscribe to inventory changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInventoryStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Function to generate initial welcome notification
  const generateWelcomeNotification = () => {
    const welcomeId = `welcome-${Date.now()}`;
    const welcomeNotification: Notification = {
      id: welcomeId,
      message: 'Welcome to InventIQ! Your smart inventory management system.',
      type: 'info',
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [welcomeNotification, ...prev]);
  };

  // Initial welcome notification
  useEffect(() => {
    generateWelcomeNotification();
  }, []);

  const markAsRead = (id: string) => {
    setNotifications((prevNotifications: Notification[]) =>
      prevNotifications.map((notification: Notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((prevNotifications: Notification[]) =>
      prevNotifications.map((notification: Notification) => ({ ...notification, read: true }))
    );
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}`,
      timestamp: new Date(),
      read: false
    };

    setNotifications((prevNotifications: Notification[]) => [newNotification, ...prevNotifications]);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const clearSelectedNotifications = (ids: string[]) => {
    setNotifications((prevNotifications: Notification[]) =>
      prevNotifications.filter((notification: Notification) => !ids.includes(notification.id))
    );
  };

  // Update unread count whenever notifications change
  useEffect(() => {
    const count = notifications.filter((n: Notification) => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification,
        clearNotifications,
        clearSelectedNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
