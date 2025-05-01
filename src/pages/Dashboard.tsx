
import React from 'react';
import { 
  CircleAlert, 
  PackageCheck, 
  PackageOpen, 
  Clock, 
  TrendingUp,
  Pill, 
  ShoppingCart, 
  FileBarChart
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
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { drugConsumptionData, mockDrugs, mockOrders, fulfillmentData } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ 
  title, 
  value, 
  icon, 
  description,
  trend,
  iconColor
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode;
  description?: string;
  trend?: { value: string; positive: boolean };
  iconColor?: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className={cn("rounded-full p-2", iconColor || "bg-muted")}>
        {icon}
      </div>
    </CardHeader>
    <CardContent>
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
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const isAdmin = authState.user?.role === 'admin';

  // Calculate some stats for the dashboard
  const lowStockItems = mockDrugs.filter(drug => drug.stock <= drug.criticalLevel).length;
  const pendingOrders = mockOrders.filter(order => order.status === 'pending').length;
  const processingOrders = mockOrders.filter(order => order.status === 'processing').length;
  const orderFulfillmentRate = 94; // Would typically calculate this based on real data

  // Get recent orders for the current user
  const recentOrders = isAdmin 
    ? [...mockOrders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4)
    : mockOrders
        .filter(order => order.vendorId === authState.user?.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 4);

  const handleNavigateToOrders = () => {
    if (isAdmin) {
      navigate('/admin/orders');
    } else {
      navigate('/user/orders');
    }
  };

  const handlePlaceOrder = () => {
    navigate('/user/orders');
  };

  const handleGenerateReport = () => {
    // This would be implemented in a real app
    alert('Report generation will be implemented in a future update.');
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {isAdmin 
            ? 'Admin Dashboard' 
            : `Welcome back, ${authState.user?.name || 'User'}`}
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Low Stock Items" 
          value={lowStockItems}
          icon={<CircleAlert className="h-4 w-4 text-red-500" />}
          description="Items requiring immediate attention"
          trend={{ value: "+2 since yesterday", positive: false }}
          iconColor="bg-red-100"
        />
        <StatCard 
          title="In Stock Items" 
          value={mockDrugs.length - lowStockItems}
          icon={<PackageCheck className="h-4 w-4 text-green-500" />}
          description="Items with sufficient inventory"
          trend={{ value: "+5 since last week", positive: true }}
          iconColor="bg-green-100"
        />
        <StatCard 
          title="Pending Orders" 
          value={pendingOrders}
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          description="Orders awaiting processing"
          iconColor="bg-amber-100"
        />
        <StatCard 
          title="Order Fulfillment Rate" 
          value={`${orderFulfillmentRate}%`}
          icon={<PackageOpen className="h-4 w-4 text-blue-500" />}
          description="Average rate over past 30 days"
          trend={{ value: "+2% since last month", positive: true }}
          iconColor="bg-blue-100"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Drug Consumption Trends</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Order Fulfillment Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={fulfillmentData.slice(0, 6)}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[80, 100]} />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="rate" 
                  name="Fulfillment Rate (%)" 
                  fill="#8884d8" 
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 mt-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button 
                variant="default" 
                size="sm" 
                className="w-full justify-start" 
                onClick={() => navigate(isAdmin ? '/admin/inventory' : '/user/inventory')}
              >
                <Pill className="mr-2 h-4 w-4" /> View Inventory
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start" 
                onClick={handlePlaceOrder}
              >
                <ShoppingCart className="mr-2 h-4 w-4" /> Place Order
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start" 
                onClick={handleGenerateReport}
              >
                <FileBarChart className="mr-2 h-4 w-4" /> Generate Report
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => {
                  const date = new Date(order.date);
                  return (
                    <div key={order.id} className="flex items-center justify-between pb-3 border-b">
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {date.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
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
                  );
                })
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No recent activities found</p>
                  {!isAdmin && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={handlePlaceOrder}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" /> Place Your First Order
                    </Button>
                  )}
                </div>
              )}
              
              {recentOrders.length > 0 && (
                <div className="flex justify-center">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleNavigateToOrders}
                  >
                    View All Orders
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

// Need to import Button that we used within the component:
const Button = ({ 
  children, 
  variant, 
  size, 
  className, 
  onClick
}: { 
  children: React.ReactNode; 
  variant: 'default' | 'outline' | 'ghost'; 
  size: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}) => {
  return (
    <button 
      className={cn(
        "inline-flex items-center rounded font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        size === 'sm' && "text-xs px-3 py-1",
        size === 'md' && "text-sm px-4 py-2",
        size === 'lg' && "text-md px-5 py-3",
        variant === 'default' && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === 'outline' && "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        variant === 'ghost' && "hover:bg-accent hover:text-accent-foreground",
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default Dashboard;
