
import React, { useEffect, useState } from 'react';
import { 
  CircleAlert, 
  PackageCheck, 
  PackageOpen, 
  Clock, 
  TrendingUp,
  Pill, 
  ShoppingCart, 
  FileBarChart,
  Users,
  Loader2
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdminLayout from '@/components/Layout/AdminLayout';
import { drugConsumptionData, fulfillmentData } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { safeQuery, formatDate } from '@/lib/apiUtils';

const StatCard = ({ 
  title, 
  value, 
  icon, 
  description,
  trend,
  iconColor,
  isLoading = false
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode;
  description?: string;
  trend?: { value: string; positive: boolean };
  iconColor?: string;
  isLoading?: boolean;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className={cn("rounded-full p-2", iconColor || "bg-muted")}>
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <>
          <Skeleton className="h-8 w-24 mb-2" />
          {description && <Skeleton className="h-4 w-full" />}
          {trend && <Skeleton className="h-4 w-16 mt-1" />}
        </>
      ) : (
        <>
          <div className="text-2xl font-bold">{value}</div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp 
                className={cn(
                  "h-3 w-3", 
                  trend.positive ? "text-green-500" : "text-red-500"
                )} 
              />
              <span 
                className={cn(
                  "text-xs", 
                  trend.positive ? "text-green-500" : "text-red-500"
                )}
              >
                {trend.value}
              </span>
            </div>
          )}
        </>
      )}
    </CardContent>
  </Card>
);

const AdminDashboard: React.FC = () => {
  const { authState } = useAuth();
  const { toast } = useToast();
  const [medications, setMedications] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingRecentOrders, setIsFetchingRecentOrders] = useState(true);
  const [showError, setShowError] = useState(false);
  
  useEffect(() => {
    // Show welcome toast when dashboard loads
    toast({
      title: "Welcome to Admin Dashboard",
      description: `Hello, ${authState.user?.name}. You have full administrative access.`,
    });
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Use our safe query utility to fetch medications with timeout protection
        const medsData = await safeQuery<any[]>(() => 
          supabase.from('medications').select('*')
        );
        
        // Type check and set medications data
        setMedications(medsData || []);
        
        // Start fetching orders in the background
        fetchOrders();
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        setShowError(true);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    const fetchOrders = async () => {
      try {
        setIsFetchingRecentOrders(true);
        
        // Use our safe query utility for orders
        const ordersData = await safeQuery<any[]>(() => 
          supabase.from('orders').select(`
            id,
            created_at,
            status,
            total,
            tracking_number,
            estimated_delivery_date,
            user_id,
            order_items (
              id,
              medication_id,
              quantity,
              price,
              medications:medication_id (
                name,
                dosage
              )
            ),
            profiles:user_id (
              name
            )
          `).order('created_at', { ascending: false }).limit(10)
        );
        
        setOrders(ordersData || []);
      } catch (error: any) {
        console.error('Error fetching orders:', error);
        // We'll still show the dashboard even if orders fail to load
      } finally {
        setIsFetchingRecentOrders(false);
      }
    };
    
    fetchDashboardData();
  }, [toast]);

  // Set up real-time subscription for orders
  useEffect(() => {
    // Create a channel for listening to changes
    const channel = supabase
      .channel('admin-dashboard-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          console.log('Order changed:', payload);
          
          // Refresh orders when a change occurs
          try {
            const ordersData = await safeQuery<any[]>(() => 
              supabase.from('orders').select(`
                id,
                created_at,
                status,
                total,
                tracking_number,
                estimated_delivery_date,
                user_id,
                order_items (
                  id,
                  medication_id,
                  quantity,
                  price,
                  medications:medication_id (
                    name,
                    dosage
                  )
                ),
                profiles:user_id (
                  name
                )
              `).order('created_at', { ascending: false }).limit(10)
            );
            
            // Show a toast notification for new orders
            if (payload.eventType === 'INSERT') {
              toast({
                title: "New Order Received",
                description: `Order #${payload.new.id.substring(0, 8)} has been placed.`,
              });
            }
            
            // Update orders state with the latest data
            setOrders(ordersData || []);
          } catch (err) {
            console.error('Error refreshing orders:', err);
          }
        }
      )
      .subscribe();

    // Also set up subscription for order_items to catch changes there
    const itemsChannel = supabase
      .channel('admin-dashboard-order-items')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
        },
        async () => {
          // Refresh orders when order items change
          try {
            const ordersData = await safeQuery<any[]>(() => 
              supabase.from('orders').select(`
                id,
                created_at,
                status,
                total,
                tracking_number,
                estimated_delivery_date,
                user_id,
                order_items (
                  id,
                  medication_id,
                  quantity,
                  price,
                  medications:medication_id (
                    name,
                    dosage
                  )
                ),
                profiles:user_id (
                  name
                )
              `).order('created_at', { ascending: false }).limit(10)
            );
            
            setOrders(ordersData || []);
          } catch (err) {
            console.error('Error refreshing orders after item change:', err);
          }
        }
      )
      .subscribe();

    // Set up subscription for medication changes as well
    const medicationsChannel = supabase
      .channel('admin-dashboard-medications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'medications',
        },
        async () => {
          // Refresh medications when they change
          try {
            const medsData = await safeQuery<any[]>(() => 
              supabase.from('medications').select('*')
            );
            
            setMedications(medsData || []);
          } catch (err) {
            console.error('Error refreshing medications:', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(medicationsChannel);
    };
  }, [toast]);

  // Calculate dashboard stats
  const lowStockItems = medications.filter(med => med.stock <= med.critical_level).length;
  const pendingOrders = orders.filter(order => order.status === 'pending').length;
  const orderFulfillmentRate = orders.length > 0 
    ? Math.round((orders.filter(order => order.status === 'delivered').length / orders.length) * 100)
    : 0;

  // Retry fetch in case of error
  const handleRetryFetch = () => {
    window.location.reload();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Administrator Dashboard
        </h1>
      </div>

      {showError ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex items-start">
            <CircleAlert className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error loading dashboard data</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>There was a problem loading the dashboard data. Please try again later.</p>
              </div>
              <div className="mt-4">
                <Button size="sm" onClick={handleRetryFetch}>
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Low Stock Items" 
          value={lowStockItems}
          icon={<CircleAlert className="h-4 w-4 text-red-500" />}
          description="Items requiring immediate attention"
          trend={{ value: "+2 since yesterday", positive: false }}
          iconColor="bg-red-100"
          isLoading={isLoading}
        />
        <StatCard 
          title="In Stock Items" 
          value={medications.length - lowStockItems}
          icon={<PackageCheck className="h-4 w-4 text-green-500" />}
          description="Items with sufficient inventory"
          trend={{ value: "+5 since last week", positive: true }}
          iconColor="bg-green-100"
          isLoading={isLoading}
        />
        <StatCard 
          title="Pending Orders" 
          value={pendingOrders}
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          description="Orders awaiting processing"
          iconColor="bg-amber-100"
          isLoading={isLoading}
        />
        <StatCard 
          title="Order Fulfillment Rate" 
          value={`${orderFulfillmentRate}%`}
          icon={<PackageOpen className="h-4 w-4 text-blue-500" />}
          description="Average rate over past 30 days"
          trend={{ value: "+2% since last month", positive: true }}
          iconColor="bg-blue-100"
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Drug Consumption Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={drugConsumptionData.slice(0, 6)}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="antibiotics" 
                    stroke="#0088FE" 
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="analgesics" 
                    stroke="#00C49F" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="antihypertensives" 
                    stroke="#FFBB28" 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Order Fulfillment Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={fulfillmentData.slice(0, 6)}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="rate" 
                    name="Fulfillment Rate (%)" 
                    fill="#8884d8" 
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 mt-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button 
                variant="default" 
                size="sm" 
                className="w-full justify-start" 
                onClick={() => window.location.href = '/admin/inventory'}
              >
                <Pill className="mr-2 h-4 w-4" /> View Inventory
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start" 
                onClick={() => window.location.href = '/admin/orders'}
              >
                <ShoppingCart className="mr-2 h-4 w-4" /> Manage Orders
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start" 
                onClick={() => window.location.href = '/admin/users'}
              >
                <Users className="mr-2 h-4 w-4" /> Manage Users
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start" 
                onClick={() => window.location.href = '/admin/analytics'}
              >
                <FileBarChart className="mr-2 h-4 w-4" /> Generate Reports
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent System Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {isFetchingRecentOrders ? (
              <div className="space-y-4">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center justify-between pb-3 border-b">
                    <div>
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {orders.length > 0 ? (
                  orders
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 4)
                    .map((order) => {
                      // Type assertion after null check for TypeScript
                      const profileName = order.profiles?.name || 'Anonymous';
                      
                      return (
                        <div key={order.id} className="flex items-center justify-between pb-3 border-b">
                          <div>
                            <p className="font-medium">Order #{order.id.substring(0, 8)}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(order.created_at)} by {profileName}
                            </p>
                          </div>
                          <div>
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
                          </div>
                        </div>
                      )
                    })
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No recent activities found</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
