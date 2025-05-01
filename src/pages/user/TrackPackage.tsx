
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Truck, 
  Home, 
  CheckCircle, 
  Search,
  Warehouse,
  ClipboardList,
  Loader2
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import UserLayout from '@/components/Layout/UserLayout';
import { mockOrders } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/apiUtils';

// Delivery statuses
const DELIVERY_STATUSES = [
  { key: 'warehouse', label: 'Warehouse', icon: Warehouse },
  { key: 'ordered', label: 'Ordered', icon: ClipboardList },
  { key: 'shipped', label: 'Shipped', icon: Package },
  { key: 'transit', label: 'In Transit', icon: Truck },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

// Map the order status to a step in the progress
const mapStatusToStep = (status: string): number => {
  switch (status.toLowerCase()) {
    case 'pending': return 1;
    case 'processing': return 1;
    case 'approved': return 2;
    case 'shipped': return 3;
    case 'transit': return 3;
    case 'out for delivery': return 4;
    case 'delivered': return 5;
    default: return 0;
  }
};

const TrackingStep = ({ 
  step, 
  currentStep, 
  label, 
  icon: Icon,
  isLast = false
}: { 
  step: number; 
  currentStep: number; 
  label: string;
  icon: React.ElementType;
  isLast?: boolean;
}) => {
  const isActive = step <= currentStep;
  const isCurrent = step === currentStep;
  
  return (
    <div className="flex items-center">
      <div className="relative flex items-center justify-center">
        <div className={cn(
          "z-10 flex items-center justify-center w-10 h-10 rounded-full",
          isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          isCurrent && "ring-4 ring-primary/20"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        
        {!isLast && (
          <div className={cn(
            "absolute top-5 left-10 w-full h-0.5",
            isActive ? "bg-primary" : "bg-muted-foreground/30"
          )} />
        )}
      </div>
      
      <div className="ml-3">
        <p className={cn(
          "text-sm font-medium",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}>
          {label}
        </p>
      </div>
    </div>
  );
};

const TrackPackage: React.FC = () => {
  const { authState } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchClicked, setSearchClicked] = useState(false);
  
  useEffect(() => {
    const fetchUserOrders = async () => {
      try {
        if (!authState.user) return;
        
        setLoading(true);
        const { data: orders, error } = await supabase
          .from('orders')
          .select(`
            id,
            created_at,
            status,
            total,
            tracking_number,
            estimated_delivery_date,
            order_items (
              id,
              medication_id,
              quantity,
              price
            )
          `)
          .eq('user_id', authState.user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setUserOrders(orders || []);
      } catch (err) {
        console.error('Error fetching user orders:', err);
        
        // Fallback to mock data
        const mockUserOrders = mockOrders.filter(order => order.vendorId === authState.user?.id);
        setUserOrders(mockUserOrders);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserOrders();
    
    // Set up real-time subscription for order updates
    const channel = supabase
      .channel('user-orders-changes')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: authState.user?.id ? `user_id=eq.${authState.user.id}` : undefined
        }, 
        async () => {
          // Refresh orders when there's a change
          try {
            const { data, error } = await supabase
              .from('orders')
              .select(`
                id,
                created_at,
                status,
                total,
                tracking_number,
                estimated_delivery_date,
                order_items (
                  id,
                  medication_id,
                  quantity,
                  price
                )
              `)
              .eq('user_id', authState.user?.id)
              .order('created_at', { ascending: false });
              
            if (error) throw error;
            
            setUserOrders(data || []);
            
            // If an order is currently selected, refresh it
            if (selectedOrder) {
              const updatedOrder = data?.find(o => o.id === selectedOrder.id);
              if (updatedOrder) {
                setSelectedOrder(updatedOrder);
              }
            }
          } catch (err) {
            console.error('Error refreshing orders:', err);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [authState.user, selectedOrder]);
  
  const handleTrackOrder = () => {
    setSearchClicked(true);
    
    if (!trackingNumber.trim()) {
      toast({
        title: "Tracking number required",
        description: "Please enter a tracking number",
        variant: "destructive",
      });
      return;
    }
    
    // First check in DB orders
    const order = userOrders.find(o => 
      (o.tracking_number && o.tracking_number.includes(trackingNumber)) || 
      o.id.includes(trackingNumber)
    );
    
    // Then check in mock orders if needed
    const mockOrder = !order && mockOrders.find(o => 
      (o.orderNumber && o.orderNumber.includes(trackingNumber)) || 
      o.id.includes(trackingNumber)
    );
    
    if (order || mockOrder) {
      setSelectedOrder(order || mockOrder);
    } else {
      toast({
        title: "Order not found",
        description: "No order found with this tracking number",
        variant: "destructive",
      });
    }
  };
  
  const currentStep = selectedOrder ? mapStatusToStep(selectedOrder.status) : 0;
  const orderDate = selectedOrder ? new Date(selectedOrder.created_at || selectedOrder.date) : null;
  
  return (
    <UserLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Track Your Package</h1>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Enter Tracking Information</CardTitle>
          <CardDescription>
            Enter your order ID or tracking number to check the delivery status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Order ID or tracking number"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleTrackOrder} className="gap-2">
              <Search className="h-4 w-4" /> Track Package
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {searchClicked && !selectedOrder && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No package found</h3>
            <p className="text-muted-foreground mt-1 max-w-md">
              We couldn't find any package with the tracking number you provided. 
              Please check the tracking number and try again.
            </p>
          </CardContent>
        </Card>
      )}
      
      {selectedOrder && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Order {selectedOrder.tracking_number || selectedOrder.orderNumber || selectedOrder.id.substring(0, 8)}
                  </CardTitle>
                  <CardDescription>
                    Placed on {orderDate?.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </CardDescription>
                </div>
                <div className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                  selectedOrder.status === 'delivered' && "bg-green-100 text-green-800",
                  selectedOrder.status === 'shipped' && "bg-blue-100 text-blue-800",
                  selectedOrder.status === 'processing' && "bg-yellow-100 text-yellow-800",
                  selectedOrder.status === 'pending' && "bg-orange-100 text-orange-800",
                  selectedOrder.status === 'cancelled' && "bg-red-100 text-red-800",
                )}>
                  {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                </div>
              </div>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery Status</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Horizontal Timeline - Desktop */}
              <div className="hidden lg:flex justify-between mb-8">
                {DELIVERY_STATUSES.map((status, index) => (
                  <TrackingStep
                    key={status.key}
                    step={index}
                    currentStep={currentStep}
                    label={status.label}
                    icon={status.icon}
                    isLast={index === DELIVERY_STATUSES.length - 1}
                  />
                ))}
              </div>
              
              {/* Vertical Timeline - Mobile */}
              <div className="lg:hidden">
                <div className="space-y-8">
                  {DELIVERY_STATUSES.map((status, index) => (
                    <div key={status.key} className="relative pl-8 pb-8">
                      {/* Vertical line */}
                      {index < DELIVERY_STATUSES.length - 1 && (
                        <div className={cn(
                          "absolute left-4 top-10 bottom-0 w-0.5", 
                          index < currentStep ? "bg-primary" : "bg-muted-foreground/30"
                        )} />
                      )}
                      
                      {/* Icon */}
                      <div className={cn(
                        "absolute left-0 flex items-center justify-center w-8 h-8 rounded-full",
                        index <= currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        index === currentStep && "ring-4 ring-primary/20"
                      )}>
                        <status.icon className="w-4 h-4" />
                      </div>
                      
                      {/* Content */}
                      <div className={cn(
                        "font-medium",
                        index <= currentStep ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {status.label}
                      </div>
                      
                      {/* Status text based on current step */}
                      {index === currentStep && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Your package is currently at this stage
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Estimated delivery info */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <div className="flex items-start gap-3">
                  <Home className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Estimated Delivery</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.estimated_delivery_date ? (
                        formatDate(selectedOrder.estimated_delivery_date)
                      ) : (
                        'To be determined'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                onClick={() => navigate(`/user/orders/${selectedOrder.id}`)}
                className="w-full sm:w-auto"
              >
                View Detailed Tracking
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
      
      {!selectedOrder && !searchClicked && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mt-6 mb-4">Your Recent Orders</h2>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : userOrders.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {userOrders.slice(0, 6).map((order) => {
                const orderDate = new Date(order.created_at || order.date);
                
                return (
                  <Card key={order.id} className="flex flex-col">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        Order #{order.id.substring(0, 8)}
                      </CardTitle>
                      <CardDescription>
                        {orderDate.toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Status:</span>
                        <span className={cn(
                          "capitalize font-medium",
                          order.status === 'delivered' && "text-green-600",
                          order.status === 'shipped' && "text-blue-600",
                          order.status === 'processing' && "text-amber-600",
                          order.status === 'pending' && "text-orange-600"
                        )}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-medium">₹{Number(order.total).toFixed(2)}</span>
                      </div>
                      {order.estimated_delivery_date && (
                        <div className="flex justify-between text-sm mt-2">
                          <span className="text-muted-foreground">Delivery:</span>
                          <span className="font-medium">{formatDate(order.estimated_delivery_date)}</span>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={() => {
                          setTrackingNumber(order.id);
                          setSelectedOrder(order);
                          setSearchClicked(true);
                        }}
                      >
                        <Package className="mr-2 h-4 w-4" /> Track Package
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No orders found</h3>
              <p className="text-muted-foreground mt-1">
                You haven't placed any orders yet.
              </p>
              <Button 
                onClick={() => navigate('/user/orders')}
                className="mt-4"
              >
                Place Your First Order
              </Button>
            </div>
          )}
        </div>
      )}
    </UserLayout>
  );
};

export default TrackPackage;
