
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Star, 
  Clock, 
  ThumbsUp, 
  MessageSquare,
  Package,
  AlertCircle
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import UserLayout from '@/components/Layout/UserLayout';
import { cn } from '@/lib/utils';
import { mockOrders } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { OrderFeedback as OrderFeedbackType } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';

const StarRating = ({ 
  rating, 
  setRating, 
  disabled = false 
}: { 
  rating: number; 
  setRating: (value: number) => void;
  disabled?: boolean;
}) => {
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={cn(
            "cursor-pointer w-6 h-6 transition-colors",
            value <= rating 
              ? "fill-yellow-400 text-yellow-400" 
              : "text-gray-300",
            disabled && "cursor-default"
          )}
          onClick={() => !disabled && setRating(value)}
        />
      ))}
    </div>
  );
};

interface FeedbackFormProps {
  orderId: string;
  onSubmit: (feedback: {
    quality: number;
    time: number;
    service: number;
    comment: string;
  }) => void;
  existingFeedback?: {
    quality: number;
    time: number;
    service: number;
    comment: string;
  };
  isSubmitting: boolean;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ orderId, onSubmit, existingFeedback, isSubmitting }) => {
  const [quality, setQuality] = useState(existingFeedback?.quality || 0);
  const [time, setTime] = useState(existingFeedback?.time || 0);
  const [service, setService] = useState(existingFeedback?.service || 0);
  const [comment, setComment] = useState(existingFeedback?.comment || '');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ quality, time, service, comment });
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium flex items-center">
              <Star className="mr-2 h-4 w-4 text-yellow-400" /> 
              Quality Rating
            </label>
            <span className="text-sm font-medium">{quality}/5</span>
          </div>
          <StarRating rating={quality} setRating={setQuality} disabled={isSubmitting} />
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium flex items-center">
              <Clock className="mr-2 h-4 w-4 text-blue-400" /> 
              Delivery Time Rating
            </label>
            <span className="text-sm font-medium">{time}/5</span>
          </div>
          <StarRating rating={time} setRating={setTime} disabled={isSubmitting} />
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium flex items-center">
              <ThumbsUp className="mr-2 h-4 w-4 text-green-400" /> 
              Service Rating
            </label>
            <span className="text-sm font-medium">{service}/5</span>
          </div>
          <StarRating rating={service} setRating={setService} disabled={isSubmitting} />
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium flex items-center">
              <MessageSquare className="mr-2 h-4 w-4" /> 
              Comments
            </label>
            <span className="text-xs text-muted-foreground">
              {comment.length}/250 characters
            </span>
          </div>
          <Textarea
            placeholder="Share your experience with this order..."
            maxLength={250}
            rows={4}
            value={comment}
            onChange={e => setComment(e.target.value)}
            disabled={isSubmitting}
            className="resize-none"
          />
        </div>
      </div>
      
      <Button
        type="submit"
        className="w-full"
        disabled={!quality || !time || !service || isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : existingFeedback ? 'Update Feedback' : 'Submit Feedback'}
      </Button>
    </form>
  );
};

const OrderFeedback: React.FC = () => {
  const { authState } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchUserOrders = async () => {
      try {
        if (!authState.user) return;
        
        const { data: orders, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', authState.user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        // Fetch existing feedback
        const { data: userFeedback, error: feedbackError } = await supabase
          .from('order_feedback')
          .select('*')
          .eq('user_id', authState.user.id);
          
        if (feedbackError) throw feedbackError;
        
        setUserOrders(orders || []);
        setFeedbacks(userFeedback || []);
      } catch (err) {
        console.error('Error fetching user orders or feedback:', err);
        toast({
          title: "Error",
          description: "Failed to load orders and feedback",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserOrders();
  }, [authState.user, toast]);
  
  // If no real data, use mock data
  useEffect(() => {
    if (!loading && userOrders.length === 0) {
      const mockUserOrders = mockOrders.filter(order => order.vendorId === authState.user?.id);
      setUserOrders(mockUserOrders);
    }
  }, [loading, userOrders, authState.user]);
  
  const handleSubmitFeedback = async (orderId: string, feedbackData: {
    quality: number;
    time: number;
    service: number;
    comment: string;
  }) => {
    if (!authState.user) return;
    
    setSubmitting(true);
    
    try {
      // Check if feedback already exists
      const existingFeedback = feedbacks.find(f => f.order_id === orderId);
      
      let result;
      
      if (existingFeedback) {
        // Update existing feedback
        const { data, error } = await supabase
          .from('order_feedback')
          .update({
            quality: feedbackData.quality,
            time: feedbackData.time,
            service: feedbackData.service,
            comment: feedbackData.comment
          })
          .eq('id', existingFeedback.id)
          .select();
          
        if (error) throw error;
        result = data;
        
        // Update local state
        setFeedbacks(prev => prev.map(f => 
          f.id === existingFeedback.id ? {...f, ...feedbackData} : f
        ));
        
        toast({
          title: "Feedback updated",
          description: "Thank you for updating your feedback!",
        });
      } else {
        // Create new feedback
        const { data, error } = await supabase
          .from('order_feedback')
          .insert({
            order_id: orderId,
            user_id: authState.user.id,
            quality: feedbackData.quality,
            time: feedbackData.time,
            service: feedbackData.service,
            comment: feedbackData.comment
          })
          .select();
          
        if (error) throw error;
        result = data;
        
        // Update local state
        if (result && result[0]) {
          setFeedbacks(prev => [...prev, result[0]]);
        }
        
        toast({
          title: "Feedback submitted",
          description: "Thank you for your feedback!",
        });
      }
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to submit feedback",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  const getExistingFeedback = (orderId: string) => {
    return feedbacks.find(f => f.order_id === orderId);
  };
  
  if (loading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </UserLayout>
    );
  }
  
  return (
    <UserLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Order Feedback</h1>
      </div>
      
      <div className="space-y-6">
        {userOrders.length > 0 ? (
          userOrders.map((order) => {
            const existingFeedback = getExistingFeedback(order.id);
            const orderDate = new Date(order.created_at || order.date);
            
            return (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <div className="flex justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Order {order.tracking_number || order.orderNumber}
                      </CardTitle>
                      <CardDescription>
                        Placed on {orderDate.toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </CardDescription>
                    </div>
                    <div className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      order.status === 'delivered' && "bg-green-100 text-green-800",
                      order.status === 'shipped' && "bg-blue-100 text-blue-800",
                      order.status === 'processing' && "bg-yellow-100 text-yellow-800",
                      order.status === 'pending' && "bg-orange-100 text-orange-800",
                      order.status === 'cancelled' && "bg-red-100 text-red-800",
                    )}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Order Details</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="font-medium capitalize">{order.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Order ID:</span>
                          <span className="font-medium">{order.id.substring(0, 8)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total:</span>
                          <span className="font-medium">₹{order.total || "250.00"}</span>
                        </div>
                        <div className="mt-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/user/orders/${order.id}`)}
                            className="w-full sm:w-auto"
                          >
                            <Package className="mr-2 h-4 w-4" />
                            View Order Details
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">
                        {existingFeedback ? "Your Feedback" : "Leave Feedback"}
                      </h3>
                      
                      {order.status === 'delivered' ? (
                        <FeedbackForm 
                          orderId={order.id}
                          onSubmit={(data) => handleSubmitFeedback(order.id, data)}
                          existingFeedback={existingFeedback}
                          isSubmitting={submitting}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed rounded-md">
                          <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">
                            You can leave feedback once the order has been delivered.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No orders found</h3>
            <p className="text-muted-foreground mt-1">
              You haven't placed any orders yet.
            </p>
            <Button 
              onClick={() => navigate('/user/orders')}
              className="mt-4"
            >
              Place Your First Order
            </Button>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default OrderFeedback;
