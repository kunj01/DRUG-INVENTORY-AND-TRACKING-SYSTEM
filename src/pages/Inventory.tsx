
import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash, 
  ArrowUpDown,
  Package
} from 'lucide-react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AdminLayout from '@/components/Layout/AdminLayout';
import { mockDrugs } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Group medications by category
const medications = {
  antibiotics: mockDrugs.filter(drug => drug.category === 'Antibiotics'),
  painRelievers: mockDrugs.filter(drug => drug.category === 'Antilipemic'),
  cardiovascular: mockDrugs.filter(drug => drug.category === 'Antihypertensive'),
  respiratory: mockDrugs.filter(drug => drug.category === 'Antidiabetic'),
  skincare: mockDrugs.filter(drug => drug.category === 'Analgesic'),
  gastrointestinal: mockDrugs.filter(drug => drug.category === 'Proton Pump Inhibitor'),
};

const Inventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { toast } = useToast();

  // Filter medications based on search term
  const filteredMedications = mockDrugs.filter(drug => 
    drug.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    drug.generic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Further filter by selected category if not "all"
  const displayedMedications = selectedCategory === 'all' 
    ? filteredMedications 
    : filteredMedications.filter(drug => drug.category === selectedCategory);

  const handleAddNew = () => {
    toast({
      title: "Feature coming soon",
      description: "The add new medication feature will be available in the next update.",
    });
  };

  const handleEdit = (id: string) => {
    toast({
      title: "Edit medication",
      description: `Editing medication with ID: ${id}`,
    });
  };

  const handleDelete = (id: string) => {
    toast({
      title: "Delete medication",
      description: `Deleting medication with ID: ${id}`,
      variant: "destructive"
    });
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="h-4 w-4" /> Add New Item
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search medications by name or generic name..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" /> Filter
        </Button>
      </div>

      <Tabs defaultValue="all" onValueChange={setSelectedCategory}>
        <TabsList className="mb-4 flex flex-wrap h-auto">
          <TabsTrigger value="all">All Inventory</TabsTrigger>
          <TabsTrigger value="Antibiotics">Antibiotics</TabsTrigger>
          <TabsTrigger value="Antilipemic">Pain Relief</TabsTrigger>
          <TabsTrigger value="Antihypertensive">Cardiovascular</TabsTrigger>
          <TabsTrigger value="Antidiabetic">Respiratory</TabsTrigger>
          <TabsTrigger value="Analgesic">Skincare</TabsTrigger>
          <TabsTrigger value="Proton Pump Inhibitor">Gastrointestinal</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <InventoryTable 
            medications={displayedMedications} 
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        {Object.entries(medications).map(([category, drugs]) => (
          <TabsContent key={category} value={category} className="mt-6">
            <InventoryTable 
              medications={drugs.filter(drug => 
                drug.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                drug.generic.toLowerCase().includes(searchTerm.toLowerCase())
              )} 
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Inventory Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockDrugs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              {mockDrugs.filter(drug => drug.stock <= drug.criticalLevel).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(medications).length}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

// Inventory Table Component
const InventoryTable = ({ 
  medications, 
  onEdit,
  onDelete
}: { 
  medications: any[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  return medications.length > 0 ? (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  Name <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Manufacturer</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Critical Level</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {medications.map((drug) => (
              <TableRow key={drug.id}>
                <TableCell className="font-medium">{drug.id}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{drug.name}</div>
                    <div className="text-sm text-muted-foreground">{drug.generic}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="capitalize">{drug.category}</div>
                </TableCell>
                <TableCell>{drug.manufacturer}</TableCell>
                <TableCell className={cn(
                  "text-right font-medium",
                  drug.stock <= drug.criticalLevel ? "text-red-500" : ""
                )}>
                  {drug.stock}
                </TableCell>
                <TableCell className="text-right">{drug.criticalLevel}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => onEdit(drug.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => onDelete(drug.id)}
                    >
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  ) : (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <h3 className="text-lg font-medium">No medications found</h3>
      <p className="text-muted-foreground mt-1">
        No items in this category
      </p>
    </div>
  );
};

export default Inventory;
