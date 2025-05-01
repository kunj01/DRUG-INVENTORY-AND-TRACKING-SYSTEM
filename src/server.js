
const express = require('express');
const cors = require('cors');
const { 
  generateTrackingStatus, 
  getOrderTracking, 
  updateOrderStatus,
  validateOrderStatus
} = require('./lib/orderTracking');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Admin endpoint to update order status
app.put('/admin/orders/:orderId/status', async (req, res) => {
  const { orderId } = req.params;
  const { status, notes, location } = req.body;
  
  // In a real app, you would validate that the user is an admin here
  const adminId = req.headers.authorization; // This should be a proper JWT in production
  
  // Validate the status
  if (!validateOrderStatus(status)) {
    return res.status(400).json({ 
      error: 'Invalid status. Must be one of: pending, processing, shipped, out for delivery, delivered, cancelled' 
    });
  }
  
  try {
    // Update the order status in Supabase
    const result = await updateOrderStatus(orderId, status, adminId, notes, location);
    
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    
    // Return success response
    res.json({ 
      success: true, 
      message: `Order ${orderId} status updated to ${status}`, 
      data: result 
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// User endpoint to get order tracking info
app.get('/user/orders/:orderId/status', async (req, res) => {
  const { orderId } = req.params;
  
  // In a real app, you would extract user ID from JWT
  const userId = req.headers.authorization;
  
  try {
    // Get the order tracking information
    const trackingInfo = await getOrderTracking(orderId, userId);
    
    if (trackingInfo.error) {
      return res.status(trackingInfo.error === 'Order not found' ? 404 : 403).json({ 
        error: trackingInfo.error 
      });
    }
    
    // Return the tracking information
    res.json(trackingInfo);
  } catch (error) {
    console.error('Error getting order tracking:', error);
    res.status(500).json({ error: 'Failed to retrieve order tracking information' });
  }
});

// Bulk fetch orders endpoint for admin
app.get('/admin/orders', async (req, res) => {
  // In a real app, you would validate that the user is an admin here
  const adminId = req.headers.authorization;
  
  try {
    // Get orders from the database
    // This would normally use the same supabase client
    // that's being used on the frontend, but in a server context
    const { supabase } = require('./lib/supabaseServer');
    
    const { data, error } = await supabase
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
        ),
        profiles:user_id (
          name
        )
      `)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Track order endpoint (legacy version)
app.get('/track/:orderId', (req, res) => {
  const { orderId } = req.params;
  
  // Generate a tracking status for the order
  const trackingInfo = generateTrackingStatus(orderId);
  
  // Return the tracking information
  res.json(trackingInfo);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Order tracking API server running on port ${PORT}`);
});

// Export the app for testing
module.exports = app;
