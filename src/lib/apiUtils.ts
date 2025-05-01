/**
 * Add a status update to an order and update its status
 * @param orderId The ID of the order to update
 * @param status The new status
 * @param notes Optional notes about this update
 * @param location Optional location information
 */
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://mmnxrploqtbztkghziev.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tbnhycGxvcXRienRrZ2h6aWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzMTM5MTMsImV4cCI6MjA1Nzg4OTkxM30.WieYbGAMd0lX3EUZUewHf_qiAArfaRW3rQdUf8mTbNc";

// Mock admin UUID for development (using a proper UUID format)
const MOCK_ADMIN_ID = '00000000-0000-4000-a000-000000000000';

/**
 * Format a date for display
 * @param dateString ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString?: string | null) {
  if (!dateString) return 'Not available';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch (e) {
    return 'Invalid date';
  }
}

/**
 * Execute a Supabase query with timeout protection
 * @param queryFn Function that returns a Supabase query or Promise
 * @param timeoutMs Optional timeout in milliseconds (default: 10000)
 * @returns The data from the query or null if it times out/errors
 */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T; error: any }> | any,
  timeoutMs = 10000
): Promise<T | null> {
  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<{ data: null; error: any }>((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), timeoutMs);
    });
    
    // Execute the query function to get a promise
    const query = queryFn();
    
    // If query is a Supabase builder, ensure it's executed
    const queryPromise = typeof query.then === 'function' 
      ? query 
      : typeof query.execute === 'function'
        ? query.execute()
        : query;

    // Race the query against the timeout
    const { data, error } = await Promise.race([
      queryPromise,
      timeoutPromise
    ]);
    
    if (error) throw error;
    return data as T;
  } catch (error) {
    console.error('Error in safeQuery:', error);
    return null;
  }
}

export async function addOrderStatusUpdate(
  orderId: string,
  status: string,
  notes?: string,
  location?: string
) {
  try {
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    
    // Check if we're in development mode first
    if (process.env.NODE_ENV === 'development' && !session) {
      // This is a development environment with mock data
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
        
      if (updateError) throw updateError;
      
      // Add the status update to history
      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status,
          notes,
          location,
          created_by: MOCK_ADMIN_ID
        });
        
      if (historyError) throw historyError;
      
      return { success: true };
    }
    
    // For production or when we have a session
    if (!session) throw new Error('Not authenticated');
    
    // Get user's profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
      
    if (profileError || !profile) throw new Error('Failed to verify user role');
    if (profile.role !== 'admin') throw new Error('Only admins can update order status');
    
    // Update the order status directly in the database
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
      
    if (updateError) throw updateError;
    
    // Add the status update to history
    const { error: historyError } = await supabase
      .from('order_status_history')
      .insert({
        order_id: orderId,
        status,
        notes,
        location,
        created_by: session.user.id
      });
      
    if (historyError) throw historyError;
    
    return { success: true };
  } catch (error: any) {
    console.error('Error in addOrderStatusUpdate:', error);
    throw error;
  }
}

/**
 * Set the estimated delivery date for an order
 * @param orderId The ID of the order to update
 * @param date The new estimated delivery date (ISO string)
 */
export async function setEstimatedDeliveryDate(
  orderId: string,
  date: string
) {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        estimated_delivery_date: date,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error: any) {
    console.error('Error in setEstimatedDeliveryDate:', error);
    throw error;
  }
}

/**
 * Get the status history for an order
 * @param orderId The ID of the order
 * @returns Array of status history items
 */
export async function getOrderStatusHistory(orderId: string) {
  try {
    const { data, error } = await supabase
      .from('order_status_history')
      .select(`
        id,
        status,
        created_at,
        notes,
        location,
        profiles:created_by (
          name
        )
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error: any) {
    console.error('Error in getOrderStatusHistory:', error);
    throw error;
  }
}

/**
 * Subscribe to changes in an order's status
 * @param orderId The ID of the order to watch
 * @param callback Function to call when the order status changes
 * @returns Function to unsubscribe
 */
export function subscribeToOrderUpdates(
  orderId: string,
  callback: (order: any) => void
) {
  // Create a channel for this specific order
  const channel = supabase
    .channel(`order-updates-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      },
      (payload) => {
        // Pass the updated order to the callback
        callback(payload.new);
      }
    )
    .subscribe();
  
  // Return a function that can be called to unsubscribe
  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Get all orders for admin dashboard
 * @returns Array of orders with their items and user information
 */
export async function getAdminOrders() {
  try {
    return await safeQuery(() => 
      supabase
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
        .order('created_at', { ascending: false })
    );
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    return null;
  }
}
