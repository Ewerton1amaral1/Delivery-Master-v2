
export enum OrderStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  PREPARING = 'PREPARING',
  DELIVERING = 'DELIVERING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export const OrderStatusLabels = {
  [OrderStatus.PENDING]: 'Aguardando Confirmação',
  [OrderStatus.RECEIVED]: 'Recebido',
  [OrderStatus.PREPARING]: 'Em Preparo',
  [OrderStatus.DELIVERING]: 'Em Entrega',
  [OrderStatus.COMPLETED]: 'Concluído',
  [OrderStatus.CANCELLED]: 'Cancelado'
};

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  PIX = 'PIX',
  WALLET = 'WALLET',
  OTHER = 'OTHER'
}

export const PaymentMethodLabels = {
  [PaymentMethod.CASH]: 'Dinheiro',
  [PaymentMethod.CARD]: 'Cartão',
  [PaymentMethod.PIX]: 'Pix',
  [PaymentMethod.WALLET]: 'Carteira Digital',
  [PaymentMethod.OTHER]: 'Outro'
};

export enum ProductCategory {
  SNACK = 'Lanches',
  PIZZA = 'Pizzas',
  DRINK = 'Bebidas',
  DESSERT = 'Sobremesas'
}

export type OrderSource = 'STORE' | 'IFOOD' | 'WHATSAPP' | 'DIGITAL_MENU' | 'WHATSAPP_BOT';

export interface Address {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  zipCode?: string; // CEP
  reference?: string; // Ponto de Referência
  complement?: string;
  formatted?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: Address;
  distanceKm?: number; // Added for delivery calculation
  walletBalance: number;
  preferences?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  imageUrl: string;
  stock: number;
  ingredients: string[];
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  // For pizzas
  isHalfHalf?: boolean;
  secondFlavorId?: string;
  secondFlavorName?: string;
  extras?: string[]; // e.g., Stuffed Crust
}

// NEW: Driver Interface
export interface Driver {
  id: string;
  name: string;
  phone: string;
  plate?: string;
  pixKey?: string;
  dailyRate?: number; // Valor fixo da diária
  isActive: boolean;
}

// NEW: Employee (Staff) Interface
export interface EmployeeAdvance {
  id: string;
  date: string;
  amount: number;
  description: string;
}

export interface Employee {
  id: string;
  // Personal Info
  name: string;
  cpf: string;
  rg?: string;
  birthDate?: string;
  phone: string;
  address: string;
  email?: string;

  // Job Info
  role: string; // Função
  admissionDate: string;
  baseSalary: number;
  transportVoucherValue: number; // Vale Transporte (0 se não usar)

  // Financials
  advances: EmployeeAdvance[]; // Histórico de vales

  isActive: boolean;
}

export interface Order {
  id: string;
  displayId?: number; // Sequential ID (Backend)
  source: OrderSource;
  clientId: string;
  clientName: string;
  clientPhone: string;
  deliveryAddress: string;
  deliveryAddressReference?: string; // Saved reference point
  items: OrderItem[];
  subtotal: number;

  deliveryFee: number; // What the CLIENT pays
  driverFee?: number;  // What the STORE pays the driver (Internal cost)
  driverPaid?: boolean; // NEW: If the driver has been paid for this order

  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  changeFor?: number; // Troco para quanto (if cash)
  paymentStatus: 'Pending' | 'Paid';

  // NEW: Driver Link
  driverId?: string;
  driverName?: string;

  createdAt: string; // ISO date
  updatedAt: string;
}

export interface DeliveryRange {
  id: string;
  minKm: number;
  maxKm: number;
  price: number;
}

export interface StoreSettings {
  name: string;
  address: string;
  logoUrl?: string;
  managerPassword?: string;
  contactPhone?: string; // WhatsApp number
  isStoreOpen?: boolean; // Status da Loja (Aberta/Fechada)

  // WhatsApp Connection Status
  whatsappStatus?: 'CONNECTED' | 'DISCONNECTED' | 'PAIRING';

  deliveryRanges?: DeliveryRange[]; // Fee charged to CUSTOMER
  driverFeeRanges?: DeliveryRange[]; // Fee paid to DRIVER

  integrations?: {
    ifoodEnabled: boolean;
    whatsappEnabled: boolean;
  };

  latitude?: number;
  longitude?: number;
}

// INVENTORY & SUPPLIES
export interface SupplyItem {
  id: string;
  name: string;
  unit: string; // e.g., 'kg', 'un', 'L'
  quantity: number;
  minQuantity: number;
  category?: string;
}

// AUTH & SAAS TYPES
export type UserRole = 'admin' | 'store';

export interface UserSession {
  role: UserRole;
  storeId?: string; // Only for store role
  storeName?: string;
  username: string;
}

export interface StoreAccount {
  id: string; // Unique ID (e.g., 'store_123')
  name: string;
  username: string;
  password: string;
  isActive: boolean;
  createdAt: string;
}
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
