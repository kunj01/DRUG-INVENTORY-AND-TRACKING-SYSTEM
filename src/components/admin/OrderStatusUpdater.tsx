
import React, { useState } from 'react';
import { CalendarIcon, Loader2, MapPin, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from '@/lib/utils';
import { addOrderStatusUpdate, setEstimatedDeliveryDate } from '@/lib/apiUtils';
import { useToast } from '@/hooks/use-toast';

interface OrderStatusUpdaterProps {
  order: {
    id: string;
    status: string;
    orderNumber?: string;
  };
  onStatusUpdated?: () => void;
}

const OrderStatusUpdater: React.FC<OrderStatusUpdaterProps> = ({ 
  order, 
  onStatusUpdated 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState(order.status);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!status) {
      toast({
        title: "Status required",
        description: "Please select a status for this update.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsUpdating(true);
      
      // Add the status update
      await addOrderStatusUpdate(
        order.id,
        status,
        notes,
        location
      );
      
      // If a delivery date was set, update it
      if (date) {
        await setEstimatedDeliveryDate(
          order.id,
          date.toISOString()
        );
      }
      
      // Show success message
      toast({
        title: "Order updated",
        description: `Order #${order.orderNumber || order.id.substring(0, 8)} has been updated to ${status}.`,
      });
      
      // Reset form
      setNotes('');
      setLocation('');
      setDate(undefined);
      
      // Close dialog
      setIsOpen(false);
      
      // Call the callback if provided
      if (onStatusUpdated) {
        onStatusUpdated();
      }
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Update Status</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Order Status</DialogTitle>
          <DialogDescription>
            Update the status and tracking information for order #{order.orderNumber || order.id.substring(0, 8)}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select 
              value={status} 
              onValueChange={setStatus}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="out for delivery">Out for Delivery</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center">
              <MessageSquare className="h-4 w-4 mr-1" />
              Notes (optional)
            </label>
            <Textarea
              placeholder="Enter any notes about this status update"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              Location (optional)
            </label>
            <Input
              placeholder="Current location of the package"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center">
              <CalendarIcon className="h-4 w-4 mr-1" />
              Estimated Delivery Date (optional)
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Order'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OrderStatusUpdater;
