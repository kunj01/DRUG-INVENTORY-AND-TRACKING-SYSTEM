
import React, { useState, useEffect } from 'react';
import UserLayout from '@/components/Layout/UserLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Eye, ShoppingBag, Activity, Package, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Simplified Line and Bar charts
const LineChart = () => (
  <div className="h-32 flex items-end justify-between space-x-2">
    {[40, 30, 70, 45, 60, 35, 80, 55, 65, 75, 50].map((height, i) => (
      <div
        key={i}
        className="bg-primary/80 rounded-t w-4"
        style={{ height: `${height}%` }}
      />
    ))}
  </div>
);

const BarChart = () => (
  <div className="h-32 flex items-end justify-between space-x-2">
    {[40, 70, 45, 60, 80, 65, 75].map((height, i) => (
      <div
        key={i}
        className="bg-primary/80 rounded-t w-8"
        style={{ height: `${height}%` }}
      />
    ))}
  </div>
);

const MedStatus: React.FC<{ count: number, total: number, threshold: number, title: string }> = ({ count, total, threshold, title }) => {
  const percentage = (count / total) * 100;
  const lowStock = percentage < threshold;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <span className={cn(
          "text-xs",
          lowStock ? "text-red-500" : "text-green-500"
        )}>
          {percentage.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 bg-secondary rounded overflow-hidden">
        <div 
          className={cn(
            "h-full rounded",
            lowStock ? "bg-red-500" : "bg-green-500"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{count} units</span>
        <span>{total} total</span>
      </div>
    </div>
  );
};

const UserDashboard: React.FC = () => {
  const { authState } = useAuth();
  const [inventoryView, setInventoryView] = useState<'critical' | 'all'>('critical');
  const [inventory, setInventory] = useState<any[]>([]);
  
  // Fetch medications data
  const { data: medications, isLoading: medicationsLoading } = useQuery({
    queryKey: ['medications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medications')
        .select('*');
      
      if (error) {
        console.error('Error fetching medications:', error);
        throw error;
      }
      
      return data || [];
    }
  });
  
  // Update inventory when medications data is loaded
  useEffect(() => {
    if (medications) {
      setInventory(medications);
    }
  }, [medications]);

  // Fetch user orders data
  const { data: userOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['userOrders', authState.user?.id],
    queryFn: async () => {
      if (!authState.user?.id) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          status,
          total,
          tracking_number,
          order_items (
            id,
            medication_id,
            quantity,
            price
          )
        `)
        .eq('user_id', authState.user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!authState.user?.id
  });

  // Set up real-time subscription for orders
  React.useEffect(() => {
    if (!authState.user?.id) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${authState.user.id}`
        },
        (payload) => {
          console.log('Order changed:', payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authState.user?.id]);

  // Calculate stats from orders
  const orderStats = React.useMemo(() => {
    if (!userOrders) return {
      totalOrders: 0,
      pendingOrders: 0,
      deliveredOrders: 0,
      totalSpent: 0
    };

    return {
      totalOrders: userOrders.length,
      pendingOrders: userOrders.filter(order => order.status === 'pending').length,
      deliveredOrders: userOrders.filter(order => order.status === 'delivered').length,
      totalSpent: userOrders.reduce((total, order) => total + Number(order.total), 0)
    };
  }, [userOrders]);
  
  // Filter inventory based on current view
  const filteredInventory = inventoryView === 'critical'
    ? inventory.filter(item => item.stock <= item.critical_level)
    : inventory;

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <UserLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Link to="/user/orders">
          <Button>
            <ShoppingBag className="mr-2 h-4 w-4" />
            Place New Order
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary/70" />
            ) : (
              <div className="text-2xl font-bold">{orderStats.totalOrders}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary/70" />
            ) : (
              <div className="text-2xl font-bold">{orderStats.pendingOrders}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Delivered Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary/70" />
            ) : (
              <div className="text-2xl font-bold">{orderStats.deliveredOrders}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary/70" />
            ) : (
              <div className="text-2xl font-bold">₹{orderStats.totalSpent.toFixed(2)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Order History Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
              </div>
            ) : (
              <BarChart />
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Link to="/user/orders">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
              </div>
            ) : userOrders && userOrders.length > 0 ? (
              <div className="space-y-4">
                {userOrders.slice(0, 3).map((order) => (
                  <div key={order.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Order #{order.id.substring(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        order.status === 'delivered' && "bg-green-100 text-green-800",
                        order.status === 'shipped' && "bg-blue-100 text-blue-800",
                        order.status === 'processing' && "bg-yellow-100 text-yellow-800",
                        order.status === 'pending' && "bg-orange-100 text-orange-800",
                        order.status === 'cancelled' && "bg-red-100 text-red-800",
                      )}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      <Link to={`/user/orders/${order.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No orders found</p>
                <Link to="/user/orders">
                  <Button variant="outline" size="sm" className="mt-2">
                    Place your first order
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Inventory */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Inventory Status</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant={inventoryView === 'critical' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setInventoryView('critical')}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Critical
              </Button>
              <Button 
                variant={inventoryView === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setInventoryView('all')}
              >
                All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {medicationsLoading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
                </div>
              ) : filteredInventory.length > 0 ? (
                filteredInventory.slice(0, 4).map((item) => (
                  <MedStatus 
                    key={item.id}
                    title={item.name}
                    count={item.stock}
                    total={item.initial_stock || 100}
                    threshold={item.critical_level}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No critical inventory items</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Link to="/user/inventory" className="w-full">
              <Button variant="outline" className="w-full">View All Inventory</Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Order Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart />
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Average usage:</span> 52 units/day
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Projected stock:</span> 14 days
            </div>
          </CardFooter>
        </Card>
      </div>
    </UserLayout>
  );
};

export default UserDashboard;
