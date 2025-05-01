
/**
 * Utility functions for order tracking
 */
import { supabase } from '@/integrations/supabase/client';

/**
 * Validates if the provided status is valid
 * @param status Status string to validate
 * @returns Boolean indicating if the status is valid
 */
export function validateOrderStatus(status: string): boolean {
  const validStatuses = [
    'pending', 
    'Order Placed', 
    'Processing', 
    'Shipped', 
    'Out for Delivery', 
    'Delivered',
    'cancelled'
  ];
  
  return validStatuses.includes(status);
}

/**
 * Updates an order's status in Supabase
 * @param orderId The order ID to update
 * @param status The new status
 * @param adminId The ID of the admin making the update
 * @param notes Optional notes about this update
 * @param location Optional location information
 * @returns Updated order data or error
 */
export async function updateOrderStatus(
  orderId: string, 
  status: string, 
  adminId: string,
  notes?: string,
  location?: string
) {
  try {
    // First update the main order status
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();
      
    if (orderError) {
      console.error('Error updating order:', orderError);
      return { error: orderError.message };
    }
    
    if (!orderData) {
      return { error: 'Order not found' };
    }
    
    // Then add to the status history
    const { data: historyData, error: historyError } = await supabase
      .from('order_status_history')
      .insert({
        order_id: orderId,
        status,
        notes,
        location,
        created_by: adminId
      })
      .select();
      
    if (historyError) {
      console.error('Error adding status history:', historyError);
      return { error: historyError.message };
    }
    
    return { 
      order: orderData,
      history: historyData
    };
  } catch (error) {
    console.error('Error in updateOrderStatus:', error);
    return { error: 'Failed to update order status' };
  }
}

/**
 * Get tracking information for an order
 * @param orderId The order ID to get tracking for
 * @param userId The ID of the user making the request (for authorization)
 * @returns Tracking information or error
 */
export async function getOrderTracking(orderId: string, userId?: string) {
  try {
    // Query for the order
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        estimated_delivery_date,
        user_id,
        tracking_number,
        order_status_history (
          id,
          status,
          location,
          created_at,
          notes
        )
      `)
      .eq('id', orderId)
      .single();
    
    if (error) {
      console.error('Error fetching order:', error);
      return { error: 'Order not found' };
    }
    
    // If userId is provided, check if user is authorized to view this order
    if (userId && data.user_id !== userId) {
      return { error: 'Not authorized to view this order' };
    }
    
    // Find the most recent status update with location
    const latestStatusWithLocation = data.order_status_history
      ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .find((update: any) => update.location);
    
    // Format and return a simplified response for the user
    return {
      orderId: data.id,
      status: data.status,
      details: {
        trackingNumber: data.tracking_number,
        estimatedDelivery: data.estimated_delivery_date,
        location: latestStatusWithLocation?.location || 'Processing Facility',
        lastUpdated: latestStatusWithLocation?.created_at || new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error in getOrderTracking:', error);
    return { error: 'Failed to retrieve tracking information' };
  }
}

/**
 * Generates a random tracking status for an order
 * @param orderId The order ID to generate a status for
 * @returns An object with order information including its current status
 */
export function generateTrackingStatus(orderId: string) {
  const statusOptions = [
    'Order Placed', 
    'Processing', 
    'Shipped', 
    'Out for Delivery', 
    'Delivered'
  ];
  
  // Generate a deterministic status based on order ID
  // This ensures the same order ID returns the same status within a time period
  const currentHour = new Date().getHours();
  const hash = orderId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + currentHour;
  const statusIndex = hash % statusOptions.length;
  
  // Create metadata for the order
  const carrier = ['FedEx', 'UPS', 'USPS', 'DHL'][hash % 4];
  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + (hash % 7) + 1);
  
  // Calculate a location based on the status
  let location;
  switch (statusOptions[statusIndex]) {
    case 'Order Placed':
      location = 'Order Processing Center';
      break;
    case 'Processing':
      location = 'Regional Distribution Facility';
      break;
    case 'Shipped':
      location = `In Transit to ${['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][hash % 5]}`;
      break;
    case 'Out for Delivery':
      location = 'Local Delivery Facility';
      break;
    case 'Delivered':
      location = 'Delivery Address';
      break;
    default:
      location = 'Unknown';
  }
  
  return {
    orderId,
    status: statusOptions[statusIndex],
    details: {
      carrier,
      trackingNumber: `TRK${orderId.substring(0, 8).toUpperCase()}`,
      estimatedDelivery: estimatedDelivery.toISOString(),
      location
    },
    lastUpdated: new Date().toISOString()
  };
}
