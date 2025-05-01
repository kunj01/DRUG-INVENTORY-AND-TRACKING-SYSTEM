
const express = require('express');
const cors = require('cors');
const { supabase, safeSupabaseQuery } = require('./supabaseServer');

// Generate a tracking status for an order based on its ID
const generateTrackingStatus = (orderId) => {
  // In a real application, this would query a shipping API or database
  // For now, we'll generate a dummy tracking status based on the order ID
  const hash = Array.from(orderId).reduce((h, c) => (h + c.charCodeAt(0)) % 100, 0);
  
  let status;
  if (hash < 20) status = 'Order Placed';
  else if (hash < 40) status = 'Processing';
  else if (hash < 60) status = 'Shipped';
  else if (hash < 80) status = 'Out for Delivery';
  else status = 'Delivered';
  
  return {
    orderId,
    status,
    lastUpdated: new Date().toISOString(),
    location: `Distribution Center ${(hash % 10) + 1}`,
    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    updates: [
      {
        status: 'Order Placed',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Online'
      },
      {
        status: 'Processing',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        location: `Warehouse ${(hash % 5) + 1}`
      },
      hash >= 40 ? {
        status: 'Shipped',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        location: `Distribution Center ${(hash % 10) + 1}`
      } : null,
      hash >= 60 ? {
        status: 'Out for Delivery',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        location: `Delivery Route ${(hash % 20) + 1}`
      } : null,
      hash >= 80 ? {
        status: 'Delivered',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        location: 'Customer Address'
      } : null
    ].filter(Boolean)
  };
};

// Validate that the status is one of the allowed values
const validateOrderStatus = (status) => {
  const validStatuses = [
    'pending',
    'processing',
    'shipped',
    'out for delivery',
    'delivered',
    'cancelled'
  ];
  
  return validStatuses.includes(status.toLowerCase());
};

// Get the tracking information for an order
const getOrderTracking = async (orderId, userId) => {
  try {
    // Check if the order exists and belongs to the user
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (error) {
      console.error('Error getting order:', error);
      return { error: 'Order not found' };
    }
    
    // Verify the order belongs to the user (in a real app)
    if (userId && order.user_id !== userId) {
      return { error: 'You do not have permission to view this order' };
    }
    
    // Get the order status history
    const { data: statusHistory, error: historyError } = await supabase
      .from('order_status_history')
      .select(`
        id,
        status,
        created_at,
        notes,
        location
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    
    if (historyError) {
      console.error('Error getting status history:', historyError);
      return { error: 'Failed to get tracking information' };
    }
    
    // Return the tracking information
    return {
      orderId,
      status: order.status,
      lastUpdated: order.updated_at,
      estimatedDelivery: order.estimated_delivery_date,
      trackingNumber: order.tracking_number,
      updates: statusHistory || []
    };
  } catch (error) {
    console.error('Error in getOrderTracking:', error);
    return { error: 'Failed to get tracking information' };
  }
};

// Update an order's status
const updateOrderStatus = async (orderId, status, adminId, notes, location) => {
  try {
    // Update the order status
    const result = await safeSupabaseQuery(async () => {
      // First update the order
      const orderUpdate = await supabase
        .from('orders')
        .update({
          status: status.toLowerCase(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
      
      if (orderUpdate.error) throw orderUpdate.error;
      
      // Add a status history entry
      const historyInsert = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status: status.toLowerCase(),
          notes,
          location,
          created_by: adminId
        });
      
      if (historyInsert.error) throw historyInsert.error;
      
      // If the status is "shipped", generate a tracking number if there isn't one
      if (status.toLowerCase() === 'shipped') {
        const { data: order } = await supabase
          .from('orders')
          .select('tracking_number')
          .eq('id', orderId)
          .single();
        
        if (!order.tracking_number) {
          // Generate a random tracking number
          const trackingNumber = `MED${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
          
          const trackingUpdate = await supabase
            .from('orders')
            .update({ tracking_number: trackingNumber })
            .eq('id', orderId);
          
          if (trackingUpdate.error) throw trackingUpdate.error;
        }
      }
      
      return { success: true };
    });
    
    return result;
  } catch (error) {
    console.error('Error in updateOrderStatus:', error);
    return { error: error.message || 'Failed to update order status' };
  }
};

module.exports = {
  generateTrackingStatus,
  getOrderTracking,
  updateOrderStatus,
  validateOrderStatus
};
