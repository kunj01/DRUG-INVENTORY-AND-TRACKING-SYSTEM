
// Mock data for the Drug Inventory and Supply Chain Tracking System

import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  TruckIcon,
} from 'lucide-react';

export interface Drug {
  id: string;
  name: string;
  generic: string;
  category: string;
  manufacturer: string;
  stock: number;
  criticalLevel: number;
  expiryDate: string;
  batchNumber: string;
  price: number;
  unit: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  totalAmount: number;
  items: OrderItem[];
  vendorId: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
}

export interface OrderItem {
  drugId: string;
  drugName: string;
  quantity: number;
  unitPrice: number;
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  rating: number;
  responseTime: string;
  totalOrders: number;
  onTimeDelivery: number;
}

export const mockDrugs: Drug[] = [
  {
    id: '1',
    name: 'Amoxicillin',
    generic: 'Amoxicillin',
    category: 'Antibiotics',
    manufacturer: 'Pfizer',
    stock: 2500,
    criticalLevel: 500,
    expiryDate: '2024-12-31',
    batchNumber: 'AMX2023-001',
    price: 0.25,
    unit: 'Capsule'
  },
  {
    id: '2',
    name: 'Lisinopril',
    generic: 'Lisinopril',
    category: 'Antihypertensive',
    manufacturer: 'AstraZeneca',
    stock: 1200,
    criticalLevel: 300,
    expiryDate: '2025-06-30',
    batchNumber: 'LIS2023-002',
    price: 0.35,
    unit: 'Tablet'
  },
  {
    id: '3',
    name: 'Metformin',
    generic: 'Metformin Hydrochloride',
    category: 'Antidiabetic',
    manufacturer: 'Novartis',
    stock: 250,
    criticalLevel: 500,
    expiryDate: '2024-09-15',
    batchNumber: 'MET2023-003',
    price: 0.15,
    unit: 'Tablet'
  },
  {
    id: '4',
    name: 'Atorvastatin',
    generic: 'Atorvastatin Calcium',
    category: 'Antilipemic',
    manufacturer: 'Merck',
    stock: 1800,
    criticalLevel: 400,
    expiryDate: '2025-03-20',
    batchNumber: 'ATV2023-004',
    price: 0.45,
    unit: 'Tablet'
  },
  {
    id: '5',
    name: 'Omeprazole',
    generic: 'Omeprazole',
    category: 'Proton Pump Inhibitor',
    manufacturer: 'GlaxoSmithKline',
    stock: 900,
    criticalLevel: 200,
    expiryDate: '2024-11-10',
    batchNumber: 'OMP2023-005',
    price: 0.30,
    unit: 'Capsule'
  },
  {
    id: '6',
    name: 'Paracetamol',
    generic: 'Acetaminophen',
    category: 'Analgesic',
    manufacturer: 'Johnson & Johnson',
    stock: 3500,
    criticalLevel: 800,
    expiryDate: '2025-01-15',
    batchNumber: 'PCM2023-006',
    price: 0.10,
    unit: 'Tablet'
  },
  {
    id: '7',
    name: 'Azithromycin',
    generic: 'Azithromycin',
    category: 'Antibiotics',
    manufacturer: 'Pfizer',
    stock: 800,
    criticalLevel: 300,
    expiryDate: '2024-07-22',
    batchNumber: 'AZT2023-007',
    price: 0.55,
    unit: 'Tablet'
  },
  {
    id: '8',
    name: 'Insulin Glargine',
    generic: 'Insulin Glargine',
    category: 'Antidiabetic',
    manufacturer: 'Sanofi',
    stock: 150,
    criticalLevel: 50,
    expiryDate: '2024-06-18',
    batchNumber: 'INS2023-008',
    price: 25.00,
    unit: 'Vial'
  },
];

export const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-2023-001',
    date: '2023-09-01',
    status: 'delivered',
    totalAmount: 2500.00,
    items: [
      { drugId: '1', drugName: 'Amoxicillin', quantity: 5000, unitPrice: 0.25 },
      { drugId: '2', drugName: 'Lisinopril', quantity: 2000, unitPrice: 0.35 }
    ],
    vendorId: '1',
    estimatedDelivery: '2023-09-08',
    trackingNumber: 'TRK123456789'
  },
  {
    id: '2',
    orderNumber: 'ORD-2023-002',
    date: '2023-09-15',
    status: 'shipped',
    totalAmount: 1350.00,
    items: [
      { drugId: '3', drugName: 'Metformin', quantity: 3000, unitPrice: 0.15 },
      { drugId: '4', drugName: 'Atorvastatin', quantity: 2000, unitPrice: 0.45 }
    ],
    vendorId: '2',
    estimatedDelivery: '2023-09-22',
    trackingNumber: 'TRK987654321'
  },
  {
    id: '3',
    orderNumber: 'ORD-2023-003',
    date: '2023-09-20',
    status: 'processing',
    totalAmount: 1800.00,
    items: [
      { drugId: '5', drugName: 'Omeprazole', quantity: 2000, unitPrice: 0.30 },
      { drugId: '6', drugName: 'Paracetamol', quantity: 6000, unitPrice: 0.10 }
    ],
    vendorId: '3',
    estimatedDelivery: '2023-09-27'
  },
  {
    id: '4',
    orderNumber: 'ORD-2023-004',
    date: '2023-09-25',
    status: 'pending',
    totalAmount: 2250.00,
    items: [
      { drugId: '7', drugName: 'Azithromycin', quantity: 1500, unitPrice: 0.55 },
      { drugId: '8', drugName: 'Insulin Glargine', quantity: 50, unitPrice: 25.00 }
    ],
    vendorId: '1'
  },
  {
    id: '5',
    orderNumber: 'ORD-2023-005',
    date: '2023-09-28',
    status: 'cancelled',
    totalAmount: 875.00,
    items: [
      { drugId: '1', drugName: 'Amoxicillin', quantity: 1500, unitPrice: 0.25 },
      { drugId: '4', drugName: 'Atorvastatin', quantity: 1000, unitPrice: 0.45 }
    ],
    vendorId: '2'
  }
];

export const mockVendors: Vendor[] = [
  {
    id: '1',
    name: 'PharmaMed Supplies Inc.',
    contactPerson: 'John Doe',
    email: 'john.doe@pharmamed.com',
    phone: '+1 (555) 123-4567',
    address: '123 Medical Boulevard, Pharmacopolis, PM 12345',
    rating: 4.8,
    responseTime: '2 hours',
    totalOrders: 152,
    onTimeDelivery: 95
  },
  {
    id: '2',
    name: 'MediGlobal Distributors',
    contactPerson: 'Jane Smith',
    email: 'jane.smith@mediglobal.com',
    phone: '+1 (555) 987-6543',
    address: '456 Health Avenue, Medicity, MC 54321',
    rating: 4.5,
    responseTime: '3 hours',
    totalOrders: 98,
    onTimeDelivery: 92
  },
  {
    id: '3',
    name: 'HealthDirect Pharmaceuticals',
    contactPerson: 'Michael Johnson',
    email: 'michael.johnson@healthdirect.com',
    phone: '+1 (555) 456-7890',
    address: '789 Wellness Street, Healthville, HV 67890',
    rating: 4.2,
    responseTime: '4 hours',
    totalOrders: 76,
    onTimeDelivery: 89
  }
];

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'delivered':
      return { icon: CheckCircle, color: 'text-green-500' };
    case 'shipped':
      return { icon: TruckIcon, color: 'text-blue-500' };
    case 'processing':
      return { icon: Clock, color: 'text-yellow-500' };
    case 'pending':
      return { icon: AlertTriangle, color: 'text-amber-500' };
    case 'cancelled':
      return { icon: XCircle, color: 'text-red-500' };
    default:
      return { icon: Clock, color: 'text-gray-500' };
  }
};

export const getStockStatus = (stock: number, criticalLevel: number) => {
  if (stock <= criticalLevel * 0.5) {
    return { status: 'critical', color: 'text-red-500 bg-red-50' };
  } else if (stock <= criticalLevel) {
    return { status: 'low', color: 'text-amber-500 bg-amber-50' };
  } else {
    return { status: 'normal', color: 'text-green-500 bg-green-50' };
  }
};

// Monthly drug consumption data for charts
export const drugConsumptionData = [
  { name: 'Jan', antibiotics: 4000, analgesics: 2400, antihypertensives: 2400 },
  { name: 'Feb', antibiotics: 3000, analgesics: 1398, antihypertensives: 2210 },
  { name: 'Mar', antibiotics: 2000, analgesics: 9800, antihypertensives: 2290 },
  { name: 'Apr', antibiotics: 2780, analgesics: 3908, antihypertensives: 2000 },
  { name: 'May', antibiotics: 1890, analgesics: 4800, antihypertensives: 2181 },
  { name: 'Jun', antibiotics: 2390, analgesics: 3800, antihypertensives: 2500 },
  { name: 'Jul', antibiotics: 3490, analgesics: 4300, antihypertensives: 2100 },
  { name: 'Aug', antibiotics: 4000, analgesics: 2400, antihypertensives: 2400 },
  { name: 'Sep', antibiotics: 3000, analgesics: 1398, antihypertensives: 2210 },
  { name: 'Oct', antibiotics: 2000, analgesics: 9800, antihypertensives: 2290 },
  { name: 'Nov', antibiotics: 2780, analgesics: 3908, antihypertensives: 2000 },
  { name: 'Dec', antibiotics: 1890, analgesics: 4800, antihypertensives: 2181 },
];

// Order fulfillment rate
export const fulfillmentData = [
  { name: 'Jan', rate: 95 },
  { name: 'Feb', rate: 98 },
  { name: 'Mar', rate: 92 },
  { name: 'Apr', rate: 96 },
  { name: 'May', rate: 99 },
  { name: 'Jun', rate: 94 },
  { name: 'Jul', rate: 97 },
  { name: 'Aug', rate: 95 },
  { name: 'Sep', rate: 93 },
  { name: 'Oct', rate: 97 },
  { name: 'Nov', rate: 94 },
  { name: 'Dec', rate: 96 },
];

// Monthly order summary
export const orderSummaryData = [
  { name: 'Jan', completed: 65, pending: 35 },
  { name: 'Feb', completed: 75, pending: 25 },
  { name: 'Mar', completed: 82, pending: 18 },
  { name: 'Apr', completed: 78, pending: 22 },
  { name: 'May', completed: 85, pending: 15 },
  { name: 'Jun', completed: 80, pending: 20 },
];

// Vendor performance data
export const vendorPerformanceData = [
  { name: 'PharmaMed Supplies Inc.', performance: 95 },
  { name: 'MediGlobal Distributors', performance: 92 },
  { name: 'HealthDirect Pharmaceuticals', performance: 89 },
];
