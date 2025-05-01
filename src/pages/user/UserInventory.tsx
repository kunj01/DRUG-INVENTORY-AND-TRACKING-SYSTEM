
import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  ShoppingCart,
  CircleAlert,
  CheckCircle,
  Loader2
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import UserLayout from '@/components/Layout/UserLayout';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';

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
}

const UserInventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const { toast } = useToast();
  const { authState } = useAuth();

  // Fetch medications from Supabase
  useEffect(() => {
    const fetchMedications = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('medications')
          .select('*');

        if (error) throw error;
        
        setMedications(data || []);
      } catch (err: any) {
        console.error('Error fetching medications:', err);
        setError(err.message || 'Failed to load medications');
        toast({
          title: "Error",
          description: "Failed to load medications",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMedications();
  }, [toast]);

  const handleOrderClick = async (medication: Medication) => {
    if (!authState.user?.id) {
      toast({
        title: "Authentication required",
        description: "Please login to place an order",
        variant: "destructive",
      });
      return;
    }

    try {
      setPlacingOrder(true);
      
      // Create a new order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: authState.user.id,
          total: medication.stock > 0 ? 100 : 0, // Example price calculation
          status: 'pending'
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Add order item
      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: orderData.id,
          medication_id: medication.id,
          quantity: 1,
          price: 100 // Example price
        });
        
      if (itemError) throw itemError;
      
      toast({
        title: "Order placed successfully",
        description: `${medication.name} has been added to your orders.`,
      });
    } catch (err: any) {
      console.error('Error placing order:', err);
      toast({
        title: "Order failed",
        description: err.message || "Failed to place order",
        variant: "destructive",
      });
    } finally {
      setPlacingOrder(false);
    }
  };

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

  return (
    <UserLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Medication Inventory</h1>
      </div>

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
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" /> Filter
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, index) => (
            <Card key={index} className="h-full">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-destructive">{error}</p>
        </div>
      ) : (
        <Tabs defaultValue="all" onValueChange={setSelectedCategory}>
          <TabsList className="mb-4 flex flex-wrap h-auto">
            <TabsTrigger value="all">All Items</TabsTrigger>
            {Object.keys(categorizedMedications).map((category) => (
              <TabsTrigger key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedMedications.length > 0 ? (
                displayedMedications.map((med) => (
                  <MedicationCard 
                    key={med.id} 
                    medication={med} 
                    onOrderClick={handleOrderClick}
                    isPlacingOrder={placingOrder}
                  />
                ))
              ) : (
                <div className="col-span-3 text-center py-10">
                  <p className="text-muted-foreground">No medications found for your search criteria.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {Object.entries(categorizedMedications).map(([category, meds]) => (
            <TabsContent key={category} value={category} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {meds
                  .filter(med => 
                    searchTerm === '' || 
                    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    med.description.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((med) => (
                    <MedicationCard 
                      key={med.id} 
                      medication={med}
                      onOrderClick={handleOrderClick}
                      isPlacingOrder={placingOrder}
                    />
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </UserLayout>
  );
};

// Medication Card Component
const MedicationCard = ({ 
  medication, 
  onOrderClick,
  isPlacingOrder
}: { 
  medication: Medication;
  onOrderClick: (medication: Medication) => void;
  isPlacingOrder: boolean;
}) => {
  const isLowStock = medication.stock <= medication.critical_level;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{medication.name}</CardTitle>
          {isLowStock ? (
            <CircleAlert className="h-5 w-5 text-amber-500" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
        </div>
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
            <span className="text-muted-foreground">Manufacturer:</span>
            <span>{medication.manufacturer}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full gap-2" 
          onClick={() => onOrderClick(medication)}
          disabled={isPlacingOrder}
        >
          {isPlacingOrder ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Processing
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" /> Add to Order
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default UserInventory;
