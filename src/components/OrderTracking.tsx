
import React, { useEffect, useRef, useState } from 'react';
import { 
  Package, 
  MapPin, 
  Truck, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Warehouse,
  Box,
  ShoppingBag,
  Info
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatDate, getOrderStatusHistory } from '@/lib/apiUtils';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from './ui/skeleton';

interface OrderTrackingProps {
  order: {
    id: string;
    orderNumber?: string;
    status: string;
    estimatedDelivery?: string;
    trackingNumber?: string;
    shippingAddress?: string;
    items: Array<any>;
    date: string;
    estimated_delivery_date?: string;
  };
}

const OrderTracking: React.FC<OrderTrackingProps> = ({ order }) => {
  const [progress, setProgress] = useState(0);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const mapContainer = useRef<HTMLDivElement>(null);
  
  // Calculate order status progress
  useEffect(() => {
    const statuses = ['pending', 'processing', 'shipped', 'delivered'];
    const currentStatusIndex = statuses.indexOf(order.status);
    if (currentStatusIndex >= 0) {
      setProgress((currentStatusIndex / (statuses.length - 1)) * 100);
    }
  }, [order.status]);

  // Fetch order status history
  useEffect(() => {
    async function fetchStatusHistory() {
      try {
        setIsLoadingHistory(true);
        const history = await getOrderStatusHistory(order.id);
        setStatusHistory(history || []);
      } catch (error) {
        console.error('Error fetching status history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    }
    
    fetchStatusHistory();
    
    // Set up real-time subscription for status updates
    const channel = supabase
      .channel('order-updates')
      .on('postgres_changes', 
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_status_history',
          filter: `order_id=eq.${order.id}`
        }, 
        (payload) => {
          console.log('New status update:', payload);
          setStatusHistory(prev => [payload.new, ...prev]);
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`
        },
        (payload) => {
          console.log('Order updated:', payload);
          // Update the status progress if status changed
          const statuses = ['pending', 'processing', 'shipped', 'delivered'];
          const currentStatusIndex = statuses.indexOf(payload.new.status);
          if (currentStatusIndex >= 0) {
            setProgress((currentStatusIndex / (statuses.length - 1)) * 100);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [order.id]);

  // Simulate map loading with CSS
  useEffect(() => {
    if (!mapContainer.current) return;
    
    // Add map styling
    mapContainer.current.style.background = 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
    
    // Add map markers - this would be replaced with actual map implementation
    const marker = document.createElement('div');
    marker.innerHTML = `<div class="flex flex-col items-center">
      <div class="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 12-4 4-4-4M12 8v8"/></svg>
      </div>
      <div class="mt-1 bg-white text-xs p-1 rounded shadow">Package Location</div>
    </div>`;
    marker.style.position = 'absolute';
    marker.style.top = '50%';
    marker.style.left = '50%';
    marker.style.transform = 'translate(-50%, -50%)';
    
    mapContainer.current.appendChild(marker);
    
    // Add a simulated route path
    const path = document.createElement('div');
    path.style.position = 'absolute';
    path.style.height = '2px';
    path.style.width = '70%';
    path.style.backgroundColor = '#6366f1';
    path.style.opacity = '0.6';
    path.style.top = '50%';
    path.style.left = '15%';
    
    mapContainer.current.appendChild(path);
    
    return () => {
      if (mapContainer.current) {
        mapContainer.current.innerHTML = '';
      }
    };
  }, []);

  const getStatusDetails = () => {
    switch(order.status) {
      case 'pending':
        return {
          icon: <Clock className="h-5 w-5 text-amber-500" />,
          color: 'text-amber-500',
          bgColor: 'bg-amber-100',
          message: 'Your order has been received and is awaiting processing.'
        };
      case 'processing':
        return {
          icon: <Package className="h-5 w-5 text-blue-500" />,
          color: 'text-blue-500',
          bgColor: 'bg-blue-100',
          message: 'Your order is being prepared for shipment.'
        };
      case 'shipped':
        return {
          icon: <Truck className="h-5 w-5 text-indigo-500" />,
          color: 'text-indigo-500',
          bgColor: 'bg-indigo-100',
          message: 'Your order has been shipped and is on its way to you.'
        };
      case 'delivered':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          color: 'text-green-500',
          bgColor: 'bg-green-100',
          message: 'Your order has been delivered successfully.'
        };
      case 'cancelled':
        return {
          icon: <AlertCircle className="h-5 w-5 text-red-500" />,
          color: 'text-red-500',
          bgColor: 'bg-red-100',
          message: 'This order has been cancelled.'
        };
      default:
        return {
          icon: <Clock className="h-5 w-5 text-gray-500" />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          message: 'Status information unavailable.'
        };
    }
  };

  const status = getStatusDetails();
  const orderDate = new Date(order.date);
  const estimatedDelivery = order.estimated_delivery_date 
    ? new Date(order.estimated_delivery_date) 
    : order.estimatedDelivery 
      ? new Date(order.estimatedDelivery)
      : null;

  const getStepStatus = (step: number) => {
    const statuses = {
      1: 'warehouse',
      2: 'ordered',
      3: 'processing',
      4: 'shipped',
      5: 'out for delivery',
      6: 'delivered'
    };
    const statusIndex = {
      'pending': 2,
      'processing': 3,
      'shipped': 4,
      'out for delivery': 5,
      'delivered': 6,
    }[order.status] || 1;
    
    if (step < statusIndex) return 'completed';
    if (step === statusIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Order #{order.orderNumber || order.id.substring(0, 8)}</CardTitle>
            <Badge className={cn(status.bgColor, status.color, "border-0")}>
              {status.icon}
              <span className="ml-1 capitalize">{order.status}</span>
            </Badge>
          </div>
          <CardDescription>
            Placed on {orderDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status flowchart */}
          <div className="relative">
            {/* Status progress line */}
            <div className="absolute left-[15px] top-0 w-[2px] h-full bg-gray-200 z-0"></div>
            
            {/* Status steps */}
            <div className="space-y-8 relative z-10">
              {/* Step 1: Warehouse */}
              <div className="flex items-start">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center z-10",
                  getStepStatus(1) === 'completed' ? "bg-green-500 text-white" : 
                  getStepStatus(1) === 'current' ? "bg-blue-500 text-white" : 
                  "bg-gray-200 text-gray-500"
                )}>
                  {getStepStatus(1) === 'completed' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Warehouse className="h-5 w-5" />
                  )}
                </div>
                <div className="ml-4">
                  <h4 className="font-medium">Warehouse</h4>
                  <p className="text-sm text-muted-foreground">
                    {getStepStatus(1) === 'completed' ? 'Your order has been processed at our warehouse' : 
                    getStepStatus(1) === 'current' ? 'Your order is being processed at our warehouse' :
                    'Your order will be processed at our warehouse'}
                  </p>
                </div>
              </div>
              
              {/* Step 2: Ordered */}
              <div className="flex items-start">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center z-10",
                  getStepStatus(2) === 'completed' ? "bg-green-500 text-white" : 
                  getStepStatus(2) === 'current' ? "bg-blue-500 text-white" : 
                  "bg-gray-200 text-gray-500"
                )}>
                  {getStepStatus(2) === 'completed' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <ShoppingBag className="h-5 w-5" />
                  )}
                </div>
                <div className="ml-4">
                  <h4 className="font-medium">Ordered</h4>
                  <p className="text-sm text-muted-foreground">
                    {getStepStatus(2) === 'completed' ? 'Your order has been confirmed' : 
                    getStepStatus(2) === 'current' ? 'Your order is being confirmed' :
                    'Your order will be confirmed'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {orderDate.toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              
              {/* Step 3: Processing */}
              <div className="flex items-start">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center z-10",
                  getStepStatus(3) === 'completed' ? "bg-green-500 text-white" : 
                  getStepStatus(3) === 'current' ? "bg-blue-500 text-white" : 
                  "bg-gray-200 text-gray-500"
                )}>
                  {getStepStatus(3) === 'completed' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Box className="h-5 w-5" />
                  )}
                </div>
                <div className="ml-4">
                  <h4 className="font-medium">Processing</h4>
                  <p className="text-sm text-muted-foreground">
                    {getStepStatus(3) === 'completed' ? 'Your order has been packaged' : 
                    getStepStatus(3) === 'current' ? 'Your order is being packaged' :
                    'Your order will be packaged'}
                  </p>
                </div>
              </div>
              
              {/* Step 4: Shipped */}
              <div className="flex items-start">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center z-10",
                  getStepStatus(4) === 'completed' ? "bg-green-500 text-white" : 
                  getStepStatus(4) === 'current' ? "bg-blue-500 text-white" : 
                  "bg-gray-200 text-gray-500"
                )}>
                  {getStepStatus(4) === 'completed' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Truck className="h-5 w-5" />
                  )}
                </div>
                <div className="ml-4">
                  <h4 className="font-medium">Shipped</h4>
                  <p className="text-sm text-muted-foreground">
                    {getStepStatus(4) === 'completed' ? 'Your order has been shipped' : 
                    getStepStatus(4) === 'current' ? 'Your order is being shipped' :
                    'Your order will be shipped'}
                  </p>
                  {order.trackingNumber && (
                    <p className="text-xs font-medium mt-1">
                      Tracking #: {order.trackingNumber}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Step 5: Out for Delivery */}
              <div className="flex items-start">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center z-10",
                  getStepStatus(5) === 'completed' ? "bg-green-500 text-white" : 
                  getStepStatus(5) === 'current' ? "bg-blue-500 text-white" : 
                  "bg-gray-200 text-gray-500"
                )}>
                  {getStepStatus(5) === 'completed' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <MapPin className="h-5 w-5" />
                  )}
                </div>
                <div className="ml-4">
                  <h4 className="font-medium">Out for Delivery</h4>
                  <p className="text-sm text-muted-foreground">
                    {getStepStatus(5) === 'completed' ? 'Your order has been out for delivery' : 
                    getStepStatus(5) === 'current' ? 'Your order is out for delivery' :
                    'Your order will be out for delivery'}
                  </p>
                </div>
              </div>
              
              {/* Step 6: Delivered */}
              <div className="flex items-start">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center z-10",
                  getStepStatus(6) === 'completed' ? "bg-green-500 text-white" : 
                  getStepStatus(6) === 'current' ? "bg-blue-500 text-white" : 
                  "bg-gray-200 text-gray-500"
                )}>
                  {getStepStatus(6) === 'completed' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Package className="h-5 w-5" />
                  )}
                </div>
                <div className="ml-4">
                  <h4 className="font-medium">Delivered</h4>
                  <p className="text-sm text-muted-foreground">
                    {getStepStatus(6) === 'completed' ? 'Your order has been delivered' : 
                    getStepStatus(6) === 'current' ? 'Your order is being delivered' :
                    'Your order will be delivered'}
                  </p>
                  {estimatedDelivery && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Expected by {estimatedDelivery.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {order.shippingAddress && (
            <div className="flex items-start text-sm mt-4">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <div className="text-muted-foreground">Shipping Address:</div>
                <div className="font-medium">{order.shippingAddress}</div>
              </div>
            </div>
          )}
          
          {/* Status History Timeline */}
          <Card className="mt-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Status Updates</CardTitle>
              <CardDescription>
                Track the latest updates on your order
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : statusHistory.length > 0 ? (
                <div className="space-y-6">
                  {statusHistory.map((update, index) => (
                    <div key={update.id} className="relative flex gap-4">
                      {index !== statusHistory.length - 1 && (
                        <div className="absolute left-5 top-8 w-[2px] h-full -ml-px bg-gray-200" />
                      )}
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center",
                        update.status === 'delivered' && "bg-green-100 text-green-500",
                        update.status === 'shipped' && "bg-blue-100 text-blue-500",
                        update.status === 'processing' && "bg-amber-100 text-amber-500",
                        update.status === 'pending' && "bg-orange-100 text-orange-500",
                        update.status === 'cancelled' && "bg-red-100 text-red-500",
                      )}>
                        {update.status === 'delivered' && <CheckCircle className="h-5 w-5" />}
                        {update.status === 'shipped' && <Truck className="h-5 w-5" />}
                        {update.status === 'processing' && <Package className="h-5 w-5" />}
                        {update.status === 'pending' && <Clock className="h-5 w-5" />}
                        {update.status === 'cancelled' && <AlertCircle className="h-5 w-5" />}
                        {!['delivered', 'shipped', 'processing', 'pending', 'cancelled'].includes(update.status) && 
                          <Info className="h-5 w-5" />
                        }
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:justify-between">
                          <p className="font-medium capitalize">{update.status}</p>
                          <time className="text-xs text-muted-foreground">
                            {new Date(update.created_at).toLocaleString()}
                          </time>
                        </div>
                        {update.notes && (
                          <p className="text-sm mt-1">{update.notes}</p>
                        )}
                        {update.location && (
                          <div className="flex items-center mt-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3 mr-1" />
                            {update.location}
                          </div>
                        )}
                        {update.profiles?.name && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Updated by {update.profiles.name}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No status updates available yet.
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Order Items ({order.items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center mr-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">Qty: {item.quantity}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">₹{(item.unitPrice * item.quantity).toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">₹{item.unitPrice.toFixed(2)} each</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderTracking;
