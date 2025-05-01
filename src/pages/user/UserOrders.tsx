
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Search, 
  Filter, 
  ShoppingCart, 
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import UserLayout from '@/components/Layout/UserLayout';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

// Define medication type
interface Medication {
  id: string;
  name: string;
  description: string;
  category: string;
  dosage: string;
  manufacturer: string;
  stock: number;
  critical_level: number;
  price?: number;
}

// Define cart item type
interface CartItem {
  medication: Medication;
  quantity: number;
}

// Define order type
interface Order {
  id: string;
  created_at: string;
  status: string;
  total: number;
  tracking_number: string | null;
  order_items: {
    id: string;
    medication_id: string;
    quantity: number;
    price: number;
    medication?: Medication;
  }[];
}

const UserOrders: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [isFetchingMedication, setIsFetchingMedication] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [openCart, setOpenCart] = useState(false);
  const [viewOrderDetails, setViewOrderDetails] = useState<Order | null>(null);
  const { toast } = useToast();
  const { authState } = useAuth();
  const navigate = useNavigate();
  const cancelOrderButtonRef = useRef<HTMLButtonElement>(null);
  const confirmOrderButtonRef = useRef<HTMLButtonElement>(null);
  
  // Calculate cart total
  const cartTotal = cart.reduce((total, item) => {
    return total + (item.quantity * (item.medication.price || 499.99));
  }, 0);
  
  // Calculate total items in cart
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  // Fetch medications with error handling and timeout
  useEffect(() => {
    const fetchMedications = async () => {
      try {
        setIsLoading(true);
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timed out')), 10000);
        });
        
        // Create the fetch promise
        const fetchPromise = supabase
          .from('medications')
          .select('*');
          
        // Race the fetch against the timeout
        const { data, error } = await Promise.race([
          fetchPromise,
          timeoutPromise.then(() => { throw new Error('Request timed out'); })
        ]) as any;

        if (error) throw error;
        
        setMedications(data || []);
      } catch (err: any) {
        console.error('Error fetching medications:', err);
        setError(err.message || 'Failed to load medications');
        toast({
          title: "Error",
          description: "Failed to load medications. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMedications();
  }, [toast]);

  // Fetch user orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!authState.user?.id) return;
      
      try {
        setOrdersLoading(true);
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timed out')), 10000);
        });
        
        // Create the fetch promise
        const fetchPromise = supabase
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
          
        // Race the fetch against the timeout
        const { data, error } = await Promise.race([
          fetchPromise,
          timeoutPromise.then(() => { throw new Error('Request timed out'); })
        ]) as any;
        
        if (error) throw error;
        
        // Fetch medication details for each order item
        const ordersWithMedicationDetails = await Promise.all(
          (data || []).map(async (order: Order) => {
            const orderItemsWithMedication = await Promise.all(
              order.order_items.map(async (item) => {
                try {
                  setIsFetchingMedication(true);
                  const { data: medicationData, error: medicationError } = await supabase
                    .from('medications')
                    .select('*')
                    .eq('id', item.medication_id)
                    .single();
                  
                  if (medicationError) throw medicationError;
                  
                  return {
                    ...item,
                    medication: medicationData
                  };
                } catch (err) {
                  console.error('Error fetching medication details:', err);
                  return item;
                } finally {
                  setIsFetchingMedication(false);
                }
              })
            );
            
            return {
              ...order,
              order_items: orderItemsWithMedication
            };
          })
        );
        
        setOrders(ordersWithMedicationDetails);
      } catch (err: any) {
        console.error('Error fetching orders:', err);
        toast({
          title: "Error",
          description: "Failed to load orders. Please try again.",
          variant: "destructive",
        });
      } finally {
        setOrdersLoading(false);
      }
    };
    
    fetchOrders();
  }, [authState.user?.id, toast]);

  // Set up real-time subscription for orders
  useEffect(() => {
    if (!authState.user?.id) return;

    // Enable realtime for the orders table
    const setupRealtime = async () => {
      // Create a channel for listening to changes
      const channel = supabase
        .channel('orders-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${authState.user?.id}`
          },
          async (payload) => {
            console.log('Order changed:', payload);
            
            // Refresh orders when a change occurs
            try {
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
                .eq('user_id', authState.user?.id)
                .order('created_at', { ascending: false });
              
              if (error) throw error;
              
              // Fetch medication details for each order item
              const ordersWithMedicationDetails = await Promise.all(
                (data || []).map(async (order: Order) => {
                  const orderItemsWithMedication = await Promise.all(
                    order.order_items.map(async (item) => {
                      try {
                        const { data: medicationData, error: medicationError } = await supabase
                          .from('medications')
                          .select('*')
                          .eq('id', item.medication_id)
                          .single();
                        
                        if (medicationError) throw medicationError;
                        
                        return {
                          ...item,
                          medication: medicationData
                        };
                      } catch (err) {
                        console.error('Error fetching medication details:', err);
                        return item;
                      }
                    })
                  );
                  
                  return {
                    ...order,
                    order_items: orderItemsWithMedication
                  };
                })
              );
              
              setOrders(ordersWithMedicationDetails);
            } catch (err) {
              console.error('Error refreshing orders:', err);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupRealtime();
    return () => {
      if (cleanup) {
        cleanup.then(unsub => unsub);
      }
    };
  }, [authState.user?.id]);

  // Filter medications based on search term
  const filteredMedications = medications.filter(med => 
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Further filter by selected category if not "all"
  const displayedMedications = selectedCategory === 'all' 
    ? filteredMedications 
    : filteredMedications.filter(med => med.category === selectedCategory);

  // Group medications by category
  const categorizedMedications = medications.reduce((acc, med) => {
    if (!acc[med.category]) {
      acc[med.category] = [];
    }
    acc[med.category].push(med);
    return acc;
  }, {} as Record<string, Medication[]>);

  // Add medication to cart
  const addToCart = (medication: Medication) => {
    const existingCartItem = cart.find(item => item.medication.id === medication.id);
    
    if (existingCartItem) {
      const updatedCart = cart.map(item => 
        item.medication.id === medication.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      setCart(updatedCart);
    } else {
      setCart([...cart, { medication, quantity: 1 }]);
    }
    
    toast({
      title: "Added to Cart",
      description: `${medication.name} has been added to your cart.`,
    });
    
    // Open cart drawer
    setOpenCart(true);
  };

  // Update item quantity in cart
  const updateCartItemQuantity = (medicationId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(medicationId);
      return;
    }
    
    const updatedCart = cart.map(item => 
      item.medication.id === medicationId
        ? { ...item, quantity: newQuantity }
        : item
    );
    
    setCart(updatedCart);
  };

  // Remove item from cart
  const removeFromCart = (medicationId: string) => {
    const updatedCart = cart.filter(item => item.medication.id !== medicationId);
    setCart(updatedCart);
  };

  // Place order
  const placeOrder = async () => {
    if (!authState.user?.id) {
      toast({
        title: "Authentication required",
        description: "Please login to place an order",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Empty cart",
        description: "Please add items to your cart before placing an order",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsPlacingOrder(true);
      
      // Create a new order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: authState.user.id,
          total: cartTotal,
          status: 'pending'
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Add order items
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        medication_id: item.medication.id,
        quantity: item.quantity,
        price: item.medication.price || 499.99
      }));
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
        
      if (itemsError) throw itemsError;
      
      // Clear cart
      setCart([]);
      
      // Close cart drawer
      setOpenCart(false);
      
      // Show success message
      toast({
        title: "Order placed successfully",
        description: `Your order #${orderData.id.substring(0, 8)} has been placed.`,
      });
      
      // Trigger confirmation dialog
      if (confirmOrderButtonRef.current) {
        confirmOrderButtonRef.current.click();
      }
    } catch (err: any) {
      console.error('Error placing order:', err);
      toast({
        title: "Order failed",
        description: err.message || "Failed to place order",
        variant: "destructive",
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };
  
  // Cancel order
  const cancelOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);
        
      if (error) throw error;
      
      // Show success message
      toast({
        title: "Order cancelled",
        description: `Order #${orderId.substring(0, 8)} has been cancelled.`,
      });
      
      // Update orders state
      setOrders(orders.map(order => 
        order.id === orderId
          ? { ...order, status: 'cancelled' }
          : order
      ));
      
      // Close details dialog
      setViewOrderDetails(null);
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to cancel order",
        variant: "destructive",
      });
    }
  };
  
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
        <h1 className="text-3xl font-bold tracking-tight">Place an Order</h1>
        <Sheet open={openCart} onOpenChange={setOpenCart}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative">
              <ShoppingCart className="h-5 w-5 mr-2" />
              <span>Cart</span>
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground w-5 h-5 rounded-full text-xs flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md flex flex-col">
            <SheetHeader>
              <SheetTitle>Your Cart</SheetTitle>
              <SheetDescription>
                {cart.length === 0 
                  ? "Your cart is empty" 
                  : `You have ${cartItemCount} item${cartItemCount !== 1 ? 's' : ''} in your cart`}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-grow overflow-auto py-4">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">Your cart is empty</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setOpenCart(false)}
                  >
                    Browse Medications
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <Card key={item.medication.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-medium">{item.medication.name}</h3>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeFromCart(item.medication.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground mb-4">
                          {item.medication.dosage}
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => updateCartItemQuantity(item.medication.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => updateCartItemQuantity(item.medication.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="font-medium">
                            ₹{((item.medication.price || 499.99) * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between mb-4">
                <span className="font-medium">Total</span>
                <span className="font-bold">₹{cartTotal.toFixed(2)}</span>
              </div>
              <Button 
                className="w-full" 
                size="lg" 
                onClick={placeOrder}
                disabled={cart.length === 0 || isPlacingOrder}
              >
                {isPlacingOrder ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Checkout
                  </>
                )}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Tabs defaultValue="medications" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="medications">Order Medications</TabsTrigger>
          <TabsTrigger value="history">Order History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="medications" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search medications by name or description..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.keys(categorizedMedications).map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(6).fill(0).map((_, index) => (
                <Card key={index} className="h-48 animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="h-5 bg-muted rounded w-2/3"></div>
                    <div className="h-3 bg-muted rounded w-full mt-2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="h-9 bg-muted rounded w-full"></div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-destructive">{error}</p>
              <Button 
                variant="outline" 
                className="ml-4"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedMedications.length > 0 ? (
                displayedMedications.map((med) => (
                  <MedicationCard 
                    key={med.id} 
                    medication={med} 
                    onAddToCart={addToCart}
                  />
                ))
              ) : (
                <div className="col-span-3 text-center py-10">
                  <p className="text-muted-foreground">No medications found for your search criteria.</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Your Order History</CardTitle>
              <CardDescription>
                View and track your previous orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">You haven't placed any orders yet</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => document.querySelector('[data-value="medications"]')?.dispatchEvent(new Event('click'))}
                  >
                    Browse Medications
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableCaption>A list of your recent orders.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.id.substring(0, 8)}</TableCell>
                        <TableCell>{formatDate(order.created_at)}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            order.status === 'delivered' && "bg-green-100 text-green-800 hover:bg-green-100",
                            order.status === 'shipped' && "bg-blue-100 text-blue-800 hover:bg-blue-100",
                            order.status === 'processing' && "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
                            order.status === 'pending' && "bg-orange-100 text-orange-800 hover:bg-orange-100",
                            order.status === 'cancelled' && "bg-red-100 text-red-800 hover:bg-red-100",
                          )}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>₹{Number(order.total).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setViewOrderDetails(order)}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Details Dialog */}
      <Dialog open={!!viewOrderDetails} onOpenChange={(open) => !open && setViewOrderDetails(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order #{viewOrderDetails?.id.substring(0, 8)} • {viewOrderDetails && formatDate(viewOrderDetails.created_at)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:justify-between gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                <Badge className={cn(
                  "text-xs",
                  viewOrderDetails?.status === 'delivered' && "bg-green-100 text-green-800 hover:bg-green-100",
                  viewOrderDetails?.status === 'shipped' && "bg-blue-100 text-blue-800 hover:bg-blue-100",
                  viewOrderDetails?.status === 'processing' && "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
                  viewOrderDetails?.status === 'pending' && "bg-orange-100 text-orange-800 hover:bg-orange-100",
                  viewOrderDetails?.status === 'cancelled' && "bg-red-100 text-red-800 hover:bg-red-100",
                )}>
                  {viewOrderDetails?.status.charAt(0).toUpperCase() + (viewOrderDetails?.status.slice(1) || '')}
                </Badge>
              </div>
              {viewOrderDetails?.tracking_number && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Tracking Number</h4>
                  <p className="text-sm">{viewOrderDetails.tracking_number}</p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Total</h4>
                <p className="text-sm font-bold">₹{viewOrderDetails?.total.toFixed(2)}</p>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Order Items</h4>
              {isFetchingMedication ? (
                <div className="flex justify-center items-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewOrderDetails?.order_items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.medication ? (
                            <div>
                              <div className="font-medium">{item.medication.name}</div>
                              <div className="text-xs text-muted-foreground">{item.medication.dosage}</div>
                            </div>
                          ) : (
                            <div className="font-medium">Unknown Medication</div>
                          )}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
            {viewOrderDetails?.status === 'pending' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="mt-3 sm:mt-0"
                    ref={cancelOrderButtonRef}
                  >
                    Cancel Order
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will cancel your order. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>No, keep my order</AlertDialogCancel>
                    <AlertDialogAction onClick={() => viewOrderDetails && cancelOrder(viewOrderDetails.id)}>
                      Yes, cancel order
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            {viewOrderDetails?.status === 'shipped' && (
              <Button 
                variant="outline" 
                onClick={() => navigate(`/user/orders/${viewOrderDetails.id}`)}
              >
                Track Order
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              onClick={() => setViewOrderDetails(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Confirmation Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button className="hidden" ref={confirmOrderButtonRef}>Open</Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Order Placed Successfully
            </DialogTitle>
            <DialogDescription>
              Your order has been placed and is being processed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              You will receive updates about your order status. You can track your order in the Order History tab.
            </p>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => document.querySelector('[data-value="history"]')?.dispatchEvent(new Event('click'))}
            >
              View Order History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UserLayout>
  );
};

// Medication Card Component
const MedicationCard = ({ 
  medication, 
  onAddToCart
}: { 
  medication: Medication;
  onAddToCart: (medication: Medication) => void;
}) => {
  const isLowStock = medication.stock <= medication.critical_level;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{medication.name}</CardTitle>
        <CardDescription>{medication.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Dosage:</span>
            <span>{medication.dosage}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">In Stock:</span>
            <span className={cn(
              isLowStock ? "text-amber-500 font-medium" : ""
            )}>
              {medication.stock} units
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Price:</span>
            <span className="font-medium">₹{(medication.price || 499.99).toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full gap-2" 
          onClick={() => onAddToCart(medication)}
          disabled={medication.stock <= 0}
        >
          <ShoppingCart className="h-4 w-4" /> Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
};

export default UserOrders;
