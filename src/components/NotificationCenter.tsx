
import React, { useState, useEffect } from 'react';
import { X, Bell, Check, AlertCircle, ShoppingCart, Package, Truck, UserCheck, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { mockOrders } from '@/data/mockData';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'warning' | 'success' | 'error';
  forAdmin?: boolean;
  forUser?: boolean;
  actionUrl?: string;
  orderId?: string;
}

interface NotificationCenterProps {
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose }) => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const isAdmin = authState.user?.role === 'admin';
  
  // Generate notifications based on actual order data
  const generateDynamicNotifications = (): Notification[] => {
    const notifications: Notification[] = [];
    
    // Process actual orders to create relevant notifications
    mockOrders.forEach(order => {
      // Admin notifications - show all orders
      if (isAdmin) {
        if (order.status === 'pending') {
          notifications.push({
            id: `new-order-${order.id}`,
            title: 'New Order Received',
            message: `Order #${order.orderNumber} has been received and is pending approval`,
            time: getTimeAgo(new Date(order.date)),
            read: false,
            type: 'info',
            forAdmin: true,
            orderId: order.id
          });
        }
      } 
      // User notifications - only show their own orders
      else if (order.vendorId === authState.user?.id) {
        if (order.status === 'processing') {
          notifications.push({
            id: `approved-order-${order.id}`,
            title: 'Order Approved',
            message: `Your order #${order.orderNumber} has been approved and is being processed`,
            time: getTimeAgo(new Date(order.date)),
            read: false,
            type: 'success',
            forUser: true,
            orderId: order.id
          });
        } else if (order.status === 'shipped') {
          notifications.push({
            id: `shipped-order-${order.id}`,
            title: 'Order Shipped',
            message: `Your order #${order.orderNumber} has been shipped and is on its way`,
            time: getTimeAgo(new Date(order.date)),
            read: false,
            type: 'info',
            forUser: true,
            orderId: order.id
          });
        }
      }
    });
    
    // Add some static notifications based on user role
    if (isAdmin) {
      notifications.push(
        {
          id: '2',
          title: 'Low Stock Alert',
          message: 'Paracetamol (500mg) is running low in inventory',
          time: '1 hour ago',
          read: false,
          type: 'warning',
          forAdmin: true
        },
        {
          id: '3',
          title: 'New User Registration',
          message: `${authState.user?.name || 'A user'} has registered on the platform`,
          time: '3 hours ago',
          read: true,
          type: 'info',
          forAdmin: true
        }
      );
    } else {
      notifications.push(
        {
          id: '6',
          title: 'Prescription Renewal',
          message: 'Your prescription for Lisinopril needs renewal in 5 days',
          time: 'Yesterday',
          read: true,
          type: 'warning',
          forUser: true
        }
      );
    }
    
    return notifications;
  };
  
  // Helper function to format time
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };
  
  // Generate notifications
  const allNotifications = generateDynamicNotifications();
  
  // Filter notifications based on user role
  const filteredNotifications = allNotifications.filter(notification => 
    (isAdmin && notification.forAdmin) || (!isAdmin && notification.forUser)
  );
  
  const [notifications, setNotifications] = useState<Notification[]>(filteredNotifications);
  
  useEffect(() => {
    // Update notifications when auth state changes
    setNotifications(filteredNotifications);
  }, [authState.user?.id, authState.user?.role]);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    // Handle notification actions
    if (notification.orderId) {
      if (isAdmin) {
        navigate(`/admin/orders`);
      } else {
        navigate(`/user/orders/${notification.orderId}`);
      }
      onClose();
    } else if (notification.actionUrl) {
      navigate(notification.actionUrl);
      onClose();
    }
  };

  const getIcon = (notification: Notification) => {
    switch(notification.type) {
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'info':
        if (notification.title.toLowerCase().includes('order')) {
          if (notification.title.toLowerCase().includes('shipped')) {
            return <Truck className="h-4 w-4 text-blue-500" />;
          }
          return <ShoppingCart className="h-4 w-4 text-blue-500" />;
        } else if (notification.title.toLowerCase().includes('user')) {
          return <UserCheck className="h-4 w-4 text-blue-500" />;
        }
        return <Bell className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Notification Panel */}
      <div className="relative w-full max-w-sm bg-background border-l shadow-xl p-4 overflow-y-auto max-h-screen">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <Badge variant="default" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={markAllAsRead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Mark all as read
            </button>
            <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="capitalize">
                  {isAdmin ? 'Admin' : 'User'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {isAdmin 
                    ? 'Notifications for system administration'
                    : 'Your order and account notifications'}
                </span>
              </div>
              
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={cn(
                    "p-3 rounded-md border transition-colors cursor-pointer hover:bg-accent/50",
                    notification.read ? "bg-background" : "bg-muted border-muted-foreground/20"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "rounded-full p-2 mt-1",
                      notification.type === 'success' && "bg-green-100",
                      notification.type === 'warning' && "bg-yellow-100",
                      notification.type === 'error' && "bg-red-100",
                      notification.type === 'info' && "bg-blue-100",
                    )}>
                      {getIcon(notification)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className={cn(
                          "font-medium",
                          !notification.read && "font-semibold"
                        )}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-primary"></div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <span className="text-xs text-muted-foreground mt-2 block">
                        {notification.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {notifications.length > 0 && (
                <div className="flex justify-center pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      if (isAdmin) {
                        navigate('/admin/notifications');
                      } else {
                        navigate('/user/notifications');
                      }
                      onClose();
                    }}
                  >
                    View All Notifications
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
