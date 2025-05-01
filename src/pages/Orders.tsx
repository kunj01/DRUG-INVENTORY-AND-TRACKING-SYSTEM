import React, { useState, useEffect } from 'react';
import { Search, Filter, PlusCircle, CheckCircle, XCircle, Eye, History, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { getStatusIcon } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDate as formatApiDate, getOrderStatusHistory, safeQuery } from '@/lib/apiUtils';
import OrderStatusUpdater from '@/components/admin/OrderStatusUpdater';

const Orders: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const { toast } = useToast();

  // Fetch orders from Supabase
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        
        // Direct query for orders with profiles data separate
        const { data: ordersData, error } = await supabase
          .from('orders')
          .select(`
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
            )
          `)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        // Fetch user profiles in a separate query
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name');
        
        if (profilesError) throw profilesError;
        
        // Create a map of user IDs to profile data for quick lookups
        const profileMap = new Map();
        if (profilesData) {
          profilesData.forEach(profile => {
            profileMap.set(profile.id, profile);
          });
        }
        
        // Process the data to match expected structure
        const processedOrders = (ordersData || []).map(order => {
          // Get the user profile from the map using the user_id
          const userProfile = profileMap.get(order.user_id);
          const customerName = userProfile ? userProfile.name : 'Anonymous';

          return {
            id: order.id,
            orderNumber: order.id.substring(0, 8),
            date: order.created_at,
            status: order.status,
            estimatedDelivery: order.estimated_delivery_date,
            trackingNumber: order.tracking_number,
            totalAmount: Number(order.total),
            customerName,
            userId: order.user_id,
            items: order.order_items.map((item: any) => ({
              name: item.medications?.name || 'Unknown Medication',
              generic: item.medications?.dosage,
              quantity: item.quantity,
              unitPrice: Number(item.price)
            }))
          };
        });
        
        setOrders(processedOrders);
      } catch (err) {
        console.error('Error fetching orders:', err);
        toast({
          title: "Error",
          description: "Failed to load orders. Please try again.",
          variant: "destructive",
        });
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
    
    // Set up realtime subscription for orders
    const channel = supabase
      .channel('order-updates')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        }, 
        async (payload) => {
          console.log('Order change detected:', payload);
          
          // Show toast notification for new orders
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Order",
              description: `Order #${payload.new.id.substring(0, 8)} has been placed`,
            });
          } else if (payload.eventType === 'UPDATE') {
            // Only show toast for status changes
            if (payload.old.status !== payload.new.status) {
              toast({
                title: "Order Updated",
                description: `Order #${payload.new.id.substring(0, 8)} status changed to ${payload.new.status}`,
              });
            }
          }
          
          // Refetch orders when there's an update
          fetchOrders();
        }
      )
      .subscribe();
      
    // Add subscription for order_items changes as well
    const itemsChannel = supabase
      .channel('order-items-updates')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'order_items'
        }, 
        async () => {
          // Refetch orders when order items change
          fetchOrders();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(itemsChannel);
    };
  }, [toast]);

  // Fetch order status history when viewing details
  useEffect(() => {
    if (selectedOrder && isViewDetailsOpen) {
      const fetchStatusHistory = async () => {
        try {
          setIsLoadingHistory(true);
          const { data, error } = await supabase
            .from('order_status_history')
            .select(`
              id,
              status,
              created_at,
              notes,
              location,
              created_by
            `)
            .eq('order_id', selectedOrder.id)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          
          // Fetch admin names in a separate query
          const userIds = (data || []).map(item => item.created_by).filter(Boolean);
          
          if (userIds.length > 0) {
            const { data: adminsData, error: adminsError } = await supabase
              .from('profiles')
              .select('id, name')
              .in('id', userIds);
            
            if (adminsError) throw adminsError;
            
            // Create a map of admin IDs to names
            const adminMap = new Map();
            if (adminsData) {
              adminsData.forEach(admin => {
                adminMap.set(admin.id, admin);
              });
            }
            
            // Add admin names to the status history items
            const enhancedData = (data || []).map(item => ({
              ...item,
              profiles: adminMap.get(item.created_by) || { name: 'System' }
            }));
            
            setStatusHistory(enhancedData || []);
          } else {
            setStatusHistory(data || []);
          }
        } catch (error) {
          console.error('Error fetching status history:', error);
          toast({
            title: "Error",
            description: "Failed to load order history",
            variant: "destructive",
          });
          setStatusHistory([]);
        } finally {
          setIsLoadingHistory(false);
        }
      };
      
      fetchStatusHistory();
    }
  }, [selectedOrder, isViewDetailsOpen, toast]);

  // Filter orders based on search term and status filter
  const filteredOrders = orders.filter(order => {
    // Search filter
    const matchesSearch = 
      searchTerm === '' || 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = 
      statusFilter === null || 
      order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleApproveOrder = async () => {
    if (!selectedOrder) return;
    
    try {
      // Update order status to processing
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'processing',
          updated_at: new Date().toISOString() 
        })
        .eq('id', selectedOrder.id);
        
      if (error) throw error;
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');
      
      // Add status history entry
      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: selectedOrder.id,
          status: 'processing',
          notes: 'Order approved by admin',
          created_by: user.id
        });
        
      if (historyError) throw historyError;
      
      toast({
        title: "Order Approved",
        description: `Order #${selectedOrder?.orderNumber} has been approved and is now being processed.`,
        variant: "default",
      });
      
      // Update the local state (this will be redundant with real-time updates, but ensures UI consistency)
      setOrders(orders.map(order => 
        order.id === selectedOrder.id
          ? { ...order, status: 'processing' }
          : order
      ));
      
      setIsApproveDialogOpen(false);
      setSelectedOrder(null);
    } catch (err: any) {
      console.error('Error approving order:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to approve order",
        variant: "destructive",
      });
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    
    try {
      // Update order status to cancelled
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString() 
        })
        .eq('id', selectedOrder.id);
        
      if (error) throw error;
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');
      
      // Add status history entry
      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: selectedOrder.id,
          status: 'cancelled',
          notes: 'Order cancelled by admin',
          created_by: user.id
        });
        
      if (historyError) throw historyError;
      
      toast({
        title: "Order Cancelled",
        description: `Order #${selectedOrder?.orderNumber} has been cancelled.`,
        variant: "destructive",
      });
      
      // Update the local state
      setOrders(orders.map(order => 
        order.id === selectedOrder.id
          ? { ...order, status: 'cancelled' }
          : order
      ));
      
      setIsCancelDialogOpen(false);
      setSelectedOrder(null);
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to cancel order",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order Management</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your drug orders
          </p>
        </div>
        <Button className="mt-4 md:mt-0" onClick={() => alert('Create order functionality')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New Order
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search order number..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Status
              {statusFilter && <span className="ml-1">: {statusFilter}</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStatusFilter(null)}>
              All Statuses
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('pending')}>
              Pending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('processing')}>
              Processing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('shipped')}>
              Shipped
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('out for delivery')}>
              Out for Delivery
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('delivered')}>
              Delivered
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('cancelled')}>
              Cancelled
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Estimated Delivery</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredOrders.length > 0 ? (
              filteredOrders.map((order) => {
                const { icon: StatusIcon, color: statusColor } = getStatusIcon(order.status);
                
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>{formatApiDate(order.date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {StatusIcon && React.createElement(StatusIcon, { className: cn("h-4 w-4", statusColor) })}
                        <span className="capitalize">{order.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>{order.items.length} items</TableCell>
                    <TableCell>₹{order.totalAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      {formatApiDate(order.estimatedDelivery)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsViewDetailsOpen(true);
                          }}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {order.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-500 hover:text-green-600 hover:bg-green-50"
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsApproveDialogOpen(true);
                              }}
                              title="Approve order"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsCancelDialogOpen(true);
                              }}
                              title="Cancel order"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  No orders found matching your filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Approve Order Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve Order #{selectedOrder?.orderNumber}?
              This will change the order status to "processing".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApproveOrder} className="gap-2">
              <CheckCircle className="h-4 w-4" /> Approve Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel Order #{selectedOrder?.orderNumber}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
              Go Back
            </Button>
            <Button variant="destructive" onClick={handleCancelOrder} className="gap-2">
              <XCircle className="h-4 w-4" /> Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Order Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details: #{selectedOrder?.orderNumber}</DialogTitle>
            <DialogDescription>
              {selectedOrder && `Ordered on ${formatApiDate(selectedOrder.date)}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <Tabs defaultValue="details">
                <TabsList>
                  <TabsTrigger value="details">Order Details</TabsTrigger>
                  <TabsTrigger value="history" className="flex items-center gap-1">
                    <History className="h-4 w-4" /> Status History
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Status</h4>
                      <div className="flex items-center gap-2">
                        {React.createElement(getStatusIcon(selectedOrder.status).icon, {
                          className: cn("h-4 w-4", getStatusIcon(selectedOrder.status).color)
                        })}
                        <span className="capitalize">{selectedOrder.status}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">Customer</h4>
                      <p className="text-sm">{selectedOrder.customerName || "Anonymous"}</p>
                    </div>
                    {selectedOrder.trackingNumber && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Tracking Number</h4>
                        <p className="text-sm">{selectedOrder.trackingNumber}</p>
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-medium mb-1">Estimated Delivery</h4>
                      <p className="text-sm">{formatApiDate(selectedOrder.estimatedDelivery)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Items</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.items.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="font-medium">{item.name}</div>
                              {item.generic && (
                                <div className="text-sm text-muted-foreground">{item.generic}</div>
                              )}
                            </TableCell>
                            <TableCell>₹{item.unitPrice.toFixed(2)}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell className="text-right">
                              ₹{(item.unitPrice * item.quantity).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} className="text-right font-medium">Total</TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{selectedOrder.totalAmount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                
                <TabsContent value="history">
                  {isLoadingHistory ? (
                    <div className="flex justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : statusHistory.length > 0 ? (
                    <div className="space-y-4">
                      {statusHistory.map((update) => (
                        <div key={update.id} className="border rounded-md p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center">
                              <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center mr-3",
                                update.status === 'delivered' && "bg-green-100 text-green-500",
                                update.status === 'shipped' && "bg-blue-100 text-blue-500",
                                update.status === 'processing' && "bg-amber-100 text-amber-500",
                                update.status === 'pending' && "bg-orange-100 text-orange-500",
                                update.status === 'cancelled' && "bg-red-100 text-red-500",
                              )}>
                                {React.createElement(getStatusIcon(update.status).icon, { className: "h-4 w-4" })}
                              </div>
                              <div>
                                <p className="font-medium capitalize">{update.status}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(update.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Updated by {update.profiles?.name || 'Admin'}
                            </div>
                          </div>
                          {update.notes && (
                            <div className="mt-2 ml-11">
                              <p className="text-sm">{update.notes}</p>
                            </div>
                          )}
                          {update.location && (
                            <div className="mt-1 ml-11 flex items-center text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3 mr-1" />
                              {update.location}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No status history available</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end gap-2 pt-4">
                <OrderStatusUpdater 
                  order={selectedOrder} 
                  onStatusUpdated={() => {
                    setIsViewDetailsOpen(false);
                    // Refresh status history
                    getOrderStatusHistory(selectedOrder.id)
                      .then(history => setStatusHistory(history || []));
                  }}
                />
                
                <Button variant="ghost" onClick={() => setIsViewDetailsOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Orders;
