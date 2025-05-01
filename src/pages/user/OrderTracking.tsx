import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import UserLayout from '@/components/Layout/UserLayout';
import OrderTracking from '@/components/OrderTracking';
import OrderTrackingMap from '@/components/OrderTrackingMap';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockOrders } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Sample locations in Surat, Gujarat
const SURAT_LOCATIONS = {
  warehouse: [21.1702, 72.8311] as [number, number], // Central warehouse
  deliveryCenter: [21.1702, 72.8311] as [number, number], // Delivery center
  customerLocation: [21.1702, 72.8311] as [number, number], // Customer location
};

const OrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<[number, number]>(SURAT_LOCATIONS.warehouse);
  const navigate = useNavigate();
  const { authState } = useAuth();
  
  // Simulate delivery movement
  useEffect(() => {
    if (!order) return;

    const statusToLocation: Record<string, [number, number]> = {
      'pending': SURAT_LOCATIONS.warehouse,
      'processing': SURAT_LOCATIONS.warehouse,
      'shipped': SURAT_LOCATIONS.deliveryCenter,
      'out_for_delivery': SURAT_LOCATIONS.customerLocation,
      'delivered': SURAT_LOCATIONS.customerLocation,
    };

    setCurrentLocation(statusToLocation[order.status] || SURAT_LOCATIONS.warehouse);
  }, [order]);

  useEffect(() => {
    // Fetch order details from Supabase
    const fetchOrder = async () => {
      if (!orderId || !authState.user?.id) return;
      
      try {
        setLoading(true);
        
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
              price,
              medications:medication_id (
                name,
                dosage
              )
            )
          `)
          .eq('id', orderId)
          .eq('user_id', authState.user.id)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            throw new Error('Order not found');
          }
          throw error;
        }
        
        if (!data) {
          throw new Error('Order not found');
        }
        
        // Transform the data to match the expected format
        const transformedOrder = {
          id: data.id,
          orderNumber: data.id.substring(0, 8),
          date: data.created_at,
          status: data.status,
          estimatedDelivery: data.estimated_delivery_date,
          trackingNumber: data.tracking_number,
          items: data.order_items.map((item: any) => ({
            name: item.medications?.name || 'Unknown Medication',
            generic: item.medications?.dosage,
            quantity: item.quantity,
            unitPrice: Number(item.price)
          }))
        };
        
        setOrder(transformedOrder);
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching order:', err);
        
        // Fallback to mock data
        try {
          const mockOrder = mockOrders.find(o => o.id === orderId);
          
          if (!mockOrder) {
            setError('Order not found');
            setLoading(false);
            return;
          }
          
          // Ensure the user can only view their own orders
          if (mockOrder.vendorId !== authState.user?.id) {
            setError('Unauthorized to view this order');
            setLoading(false);
            return;
          }
          
          setOrder(mockOrder);
          setLoading(false);
        } catch (mockErr) {
          setError(err.message || 'Error loading order information');
          setLoading(false);
        }
      }
    };
    
    fetchOrder();
    
    // Set up real-time subscription for order updates
    const channel = supabase
      .channel('order-status-changes')
      .on('postgres_changes', 
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        }, 
        async (payload) => {
          console.log('Order updated:', payload);
          
          if (payload.new) {
            // Fetch the complete updated order
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
                    price,
                    medications:medication_id (
                      name,
                      dosage
                    )
                  )
                `)
                .eq('id', orderId)
                .single();
              
              if (error) throw error;
              
              // Transform the data to match the expected format
              const transformedOrder = {
                id: data.id,
                orderNumber: data.id.substring(0, 8),
                date: data.created_at,
                status: data.status,
                estimatedDelivery: data.estimated_delivery_date,
                trackingNumber: data.tracking_number,
                items: data.order_items.map((item: any) => ({
                  name: item.medications?.name || 'Unknown Medication',
                  generic: item.medications?.dosage,
                  quantity: item.quantity,
                  unitPrice: Number(item.price)
                }))
              };
              
              setOrder(transformedOrder);
            } catch (err) {
              console.error('Error fetching updated order:', err);
            }
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, authState.user?.id]);
  
  const handleBackClick = () => {
    navigate('/user/orders');
  };
  
  return (
    <UserLayout>
      <div className="flex items-center gap-2 mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleBackClick}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Order Tracking</h1>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-500">{error}</p>
        </div>
      ) : order ? (
        <div className="space-y-6">
          <Tabs defaultValue="map" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="map">Map View</TabsTrigger>
              <TabsTrigger value="details">Order Details</TabsTrigger>
            </TabsList>
            <TabsContent value="map">
              <OrderTrackingMap
                currentLocation={currentLocation}
                destinationLocation={SURAT_LOCATIONS.customerLocation}
                orderStatus={order.status}
              />
            </TabsContent>
            <TabsContent value="details">
              <OrderTracking order={order} />
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </UserLayout>
  );
};

export default OrderTrackingPage;
