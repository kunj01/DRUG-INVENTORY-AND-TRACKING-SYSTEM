
import React from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, Route, Warehouse, MapPin, TrendingUp } from 'lucide-react';

const SupplyChain = () => {
  // Mock data for supply chain entities
  const shipments = [
    { id: "SHP-001", origin: "Distributor A", destination: "Hospital XYZ", status: "In Transit", eta: "2023-05-15", priority: "High" },
    { id: "SHP-002", origin: "Manufacturer B", destination: "Pharmacy 123", status: "Delivered", eta: "2023-05-10", priority: "Medium" },
    { id: "SHP-003", origin: "Warehouse C", destination: "Clinic ABC", status: "Delayed", eta: "2023-05-18", priority: "High" },
    { id: "SHP-004", origin: "Distributor D", destination: "Hospital UVW", status: "Processing", eta: "2023-05-20", priority: "Low" },
    { id: "SHP-005", origin: "Manufacturer E", destination: "Pharmacy 456", status: "In Transit", eta: "2023-05-17", priority: "Medium" },
  ];

  const distributionCenters = [
    { id: "DC-001", name: "Central Warehouse", location: "Chicago, IL", capacity: "85%", activePallets: 342, shipmentsPending: 12 },
    { id: "DC-002", name: "Eastern Distribution", location: "Philadelphia, PA", capacity: "65%", activePallets: 218, shipmentsPending: 8 },
    { id: "DC-003", name: "Western Facility", location: "Phoenix, AZ", capacity: "92%", activePallets: 450, shipmentsPending: 21 },
    { id: "DC-004", name: "Southern Hub", location: "Atlanta, GA", capacity: "70%", activePallets: 275, shipmentsPending: 15 },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "In Transit":
        return <Badge className="bg-blue-500 hover:bg-blue-600">In Transit</Badge>;
      case "Delivered":
        return <Badge className="bg-green-500 hover:bg-green-600">Delivered</Badge>;
      case "Delayed":
        return <Badge className="bg-red-500 hover:bg-red-600">Delayed</Badge>;
      case "Processing":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Processing</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "High":
        return <Badge variant="outline" className="text-red-500 border-red-500">High</Badge>;
      case "Medium":
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500">Medium</Badge>;
      case "Low":
        return <Badge variant="outline" className="text-green-500 border-green-500">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Supply Chain Management</h1>
          </div>
          
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">
                <TrendingUp className="mr-2 h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="shipments">
                <Truck className="mr-2 h-4 w-4" />
                Shipments
              </TabsTrigger>
              <TabsTrigger value="distribution">
                <Warehouse className="mr-2 h-4 w-4" />
                Distribution Centers
              </TabsTrigger>
              <TabsTrigger value="routes">
                <Route className="mr-2 h-4 w-4" />
                Routes
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Shipments</CardTitle>
                    <Truck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">47</div>
                    <p className="text-xs text-muted-foreground">+2% from last month</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Distribution Centers</CardTitle>
                    <Warehouse className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">8</div>
                    <p className="text-xs text-muted-foreground">
                      Average capacity: 78%
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Delivery Performance</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">93.8%</div>
                    <p className="text-xs text-muted-foreground">+4.1% from previous quarter</p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Shipment Activities</CardTitle>
                    <CardDescription>
                      Monitor the latest movements across your supply chain network
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Shipment ID</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>ETA</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shipments.slice(0, 3).map((shipment) => (
                          <TableRow key={shipment.id}>
                            <TableCell className="font-medium">{shipment.id}</TableCell>
                            <TableCell>{shipment.origin} → {shipment.destination}</TableCell>
                            <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                            <TableCell>{getPriorityBadge(shipment.priority)}</TableCell>
                            <TableCell>{shipment.eta}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="shipments">
              <Card>
                <CardHeader>
                  <CardTitle>Active Shipments</CardTitle>
                  <CardDescription>
                    Track all active shipments across your supply chain network
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shipment ID</TableHead>
                        <TableHead>Origin</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>ETA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shipments.map((shipment) => (
                        <TableRow key={shipment.id}>
                          <TableCell className="font-medium">{shipment.id}</TableCell>
                          <TableCell>{shipment.origin}</TableCell>
                          <TableCell>{shipment.destination}</TableCell>
                          <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                          <TableCell>{getPriorityBadge(shipment.priority)}</TableCell>
                          <TableCell>{shipment.eta}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="distribution">
              <Card>
                <CardHeader>
                  <CardTitle>Distribution Centers</CardTitle>
                  <CardDescription>
                    Monitor the status and performance of all distribution centers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Active Pallets</TableHead>
                        <TableHead>Pending Shipments</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distributionCenters.map((center) => (
                        <TableRow key={center.id}>
                          <TableCell className="font-medium">{center.id}</TableCell>
                          <TableCell>{center.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                              {center.location}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                              <div 
                                className={`h-2.5 rounded-full ${
                                  parseInt(center.capacity) > 90 
                                    ? 'bg-red-500' 
                                    : parseInt(center.capacity) > 75 
                                      ? 'bg-yellow-500' 
                                      : 'bg-green-500'
                                }`} 
                                style={{ width: center.capacity }}
                              ></div>
                            </div>
                            <span className="text-xs ml-2">{center.capacity}</span>
                          </TableCell>
                          <TableCell>{center.activePallets}</TableCell>
                          <TableCell>{center.shipmentsPending}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="routes">
              <Card>
                <CardHeader>
                  <CardTitle>Supply Chain Routes</CardTitle>
                  <CardDescription>
                    Analyze and optimize shipping routes across your network
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center p-8 text-center">
                    <div className="flex flex-col items-center">
                      <Route className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">Route Visualization Coming Soon</h3>
                      <p className="text-muted-foreground mt-2">
                        An interactive map to visualize and optimize supply chain routes will be available in the next update.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SupplyChain;
