
import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Utensils,
  UtensilsCrossed,
  ChefHat,
  Menu,
  Bike,
  Calculator,
  Settings as SettingsIcon,
  LogOut,
  Package,
  FileBarChart,
  Briefcase,
  Moon,
  Sun,
  Lock,
  DoorOpen,
  DoorClosed
} from 'lucide-react';

import { Dashboard } from './Dashboard';
import { ClientManagement } from './ClientManagement';
import { ProductManagement } from './ProductManagement';
import { OrderManagement } from './OrderManagement';
import { NewOrder } from './NewOrder';
import { PricingCalculator } from './PricingCalculator';
import { Settings } from './Settings';
import { SupplyManagement } from './SupplyManagement';
import { Reports } from './Reports';
import { DriverManagement } from './DriverManagement';
import { TeamManagement } from './TeamManagement';
import { WhatsAppSimulator } from './WhatsAppSimulator'; // Import new simulator
import { WhatsappConnection } from './WhatsappConnection';
import { LiveChat } from './LiveChat';
import { MessageCircle, QrCode } from 'lucide-react';
import { Client, Product, Order, OrderStatus, ProductCategory, StoreSettings, SupplyItem, Driver, Employee } from '../types';

// Simple notification sound (Base64 MP3) - "Ding Dong" style
// Notification Sound Configured in useEffect

// Mock Data Generators for new stores
const generateInitialClients = (): Client[] => [
  {
    id: '1',
    name: 'Cliente Exemplo',
    phone: '(11) 99999-0000',
    email: 'cliente@exemplo.com',
    address: { street: 'Rua Exemplo', number: '100', neighborhood: 'Centro', city: 'São Paulo', formatted: 'Rua Exemplo, 100 - Centro' },
    distanceKm: 2.5,
    walletBalance: 0
  }
];

const generateInitialProducts = (): Product[] => [
  { id: '1', name: 'Exemplo Burguer', description: 'Um hambúrguer de exemplo.', price: 20.00, category: ProductCategory.SNACK, imageUrl: 'https://picsum.photos/200/200?random=1', stock: 100, ingredients: ['Pão', 'Carne', 'Queijo'] },
  { id: '2', name: 'Pizza Exemplo', description: 'Pizza deliciosa.', price: 40.00, category: ProductCategory.PIZZA, imageUrl: 'https://picsum.photos/200/200?random=2', stock: 50, ingredients: ['Mussarela', 'Tomate'] },
];

const DEFAULT_SETTINGS: StoreSettings = {
  name: 'Minha Loja',
  address: 'Endereço da Loja',
  logoUrl: '',
  managerPassword: '',
  isStoreOpen: true,
  whatsappStatus: 'DISCONNECTED', // Initialize as disconnected
  deliveryRanges: [],
  driverFeeRanges: []
};

interface StoreAppProps {
  storeId: string;
  onLogout: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const StoreApp: React.FC<StoreAppProps> = ({ storeId, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'clients' | 'products' | 'pricing' | 'supplies' | 'settings' | 'reports' | 'drivers' | 'team' | 'whatsapp_connect' | 'live_chat'>('dashboard');
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showWhatsAppSim, setShowWhatsAppSim] = useState(false); // State for WA Simulator

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dm_dark_mode') === 'true');

  // Settings Lock State
  const [showSettingsLock, setShowSettingsLock] = useState(false);
  const [lockPassword, setLockPassword] = useState('');
  const [lockError, setLockError] = useState(false);

  // Audio Ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dm_dark_mode', darkMode.toString());
  }, [darkMode]);

  // Helper to key localstorage by storeId
  const getKey = (key: string) => `dm_${storeId}_${key}`;

  // Persistence with storeId isolation
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem(getKey('clients'));
    return saved ? JSON.parse(saved) : generateInitialClients();
  });
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(getKey('products'));
    return saved ? JSON.parse(saved) : generateInitialProducts();
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem(getKey('orders'));
    return saved ? JSON.parse(saved) : [];
  });
  const [supplies, setSupplies] = useState<SupplyItem[]>(() => {
    const saved = localStorage.getItem(getKey('supplies'));
    return saved ? JSON.parse(saved) : [];
  });
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem(getKey('settings'));
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // --- SAVE EFFECTS (Local Only - Settings) ---
  // Clients, Products, Orders, Supplies, Drivers, Employees are now Sync Only
  useEffect(() => {
    localStorage.setItem(getKey('clients'), JSON.stringify(clients)); // Still keeping clients cached locally?
    // Actually user requested DB for Clients too. But I kept local cache logic in previous step 1068 (fetcher maps it, but useEffect lines 139 persist it to LocalStorage).
    // Ideally I remove all LocalStorage logic for these resources to avoid sync conflicts.
    // I will remove them for Drivers, Employees, Supplies.
  }, [clients, storeId]);

  // --- SYNC WITH BACKEND ---
  useEffect(() => {
    const fetchData = () => {
      // 1. Fetch Products
      fetch(`${API_URL}/api/products`)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setProducts(data); })
        .catch(err => console.error('Failed to sync products', err));

      // 2. Fetch Orders
      fetch(`${API_URL}/api/orders`)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setOrders(data); })
        .catch(err => console.error('Failed to sync orders', err));

      // 3. Fetch Settings
      fetch(`${API_URL}/api/settings`)
        .then(res => res.json())
        .then(data => { if (data && data.id) setStoreSettings(data); })
        .catch(err => console.error('Failed to sync settings', err));

      // 4. Fetch Clients
      fetch(`${API_URL}/api/clients`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const mapped = data.map((c: any) => ({
              ...c,
              address: c.addresses && c.addresses.length > 0 ? c.addresses[0] : {}
            }));
            setClients(mapped);
          }
        })
        .catch(err => console.error('Failed to sync clients', err));

      // 5. Fetch Drivers
      fetch(`${API_URL}/api/drivers`)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setDrivers(data); })
        .catch(err => console.error('Failed to sync drivers', err));

      // 6. Fetch Employees (Team)
      fetch(`${API_URL}/api/employees`)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setEmployees(data); })
        .catch(err => console.error('Failed to sync employees', err));

      // 7. Fetch Supplies (Inventory)
      fetch(`${API_URL}/api/supplies`)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setSupplies(data); })
        .catch(err => console.error('Failed to sync supplies', err));
    };

    fetchData(); // Initial load

    const interval = setInterval(fetchData, 10000); // Poll every 10s
    return () => clearInterval(interval);

  }, [storeId]);

  useEffect(() => {
    localStorage.setItem(getKey('products'), JSON.stringify(products));
  }, [products, storeId]);

  useEffect(() => {
    localStorage.setItem(getKey('orders'), JSON.stringify(orders));
  }, [orders, storeId]);

  // Removed LocalStorage effects for Supplies, Drivers, Employees to rely on Backend




  // Continuous Sound Effect for Pending Orders
  useEffect(() => {
    const hasPending = orders.some(o => o.status === OrderStatus.PENDING);

    if (!audioRef.current) {
      // Sound: Polyphonic Ringtone (Retro Mobile)
      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2860/2860-preview.mp3');
    }

    if (hasPending) {
      audioRef.current.loop = true;
      audioRef.current.play().catch(e => console.log("Audio play failed (interaction likely required)", e));
    } else {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [orders]);

  const handleCreateOrder = (newOrder: Order) => {
    // 1. Add to state
    setOrders([newOrder, ...orders]);
    // 2. Close simulators
    setShowNewOrder(false);
    setShowWhatsAppSim(false); // Close bot if order created
    // 3. Play notification
    if (audioRef.current) audioRef.current.play();
    // 4. Focus Tab
    setActiveTab('orders');
  };

  // --- BACKUP HANDLERS ---
  const handleBackup = () => {
    const backupData = {
      clients, products, orders, supplies, drivers, employees, settings: storeSettings
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_deliverymaster_${storeId}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleRestore = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (confirm('Isso substituirá todos os dados atuais. Deseja continuar?')) {
          if (data.clients) setClients(data.clients);
          if (data.products) setProducts(data.products);
          if (data.orders) setOrders(data.orders);
          if (data.supplies) setSupplies(data.supplies);
          if (data.drivers) setDrivers(data.drivers);
          if (data.employees) setEmployees(data.employees);
          if (data.settings) setStoreSettings(data.settings);
          alert('Dados restaurados com sucesso!');
        }
      } catch (err) {
        alert('Erro ao ler arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

  const handleImportOrders = (newOrders: Order[]) => {
    // filter duplicates based on ID
    const unique = newOrders.filter(n => !orders.some(o => o.id === n.id));
    if (unique.length === 0) {
      alert('Nenhum pedido novo encontrado (todos já importados).');
      return;
    }
    setOrders(prev => [...unique, ...prev]);
    alert(`${unique.length} pedidos importados com sucesso!`);
  };

  const handleNavClick = (tab: typeof activeTab) => {
    if (tab === 'settings' && storeSettings.managerPassword && storeSettings.managerPassword.trim() !== '') {
      setShowSettingsLock(true);
      setLockPassword('');
      setLockError(false);
    } else {
      setActiveTab(tab);
    }
  };

  const unlockSettings = () => {
    if (lockPassword === storeSettings.managerPassword) {
      setShowSettingsLock(false);
      setActiveTab('settings');
    } else {
      setLockError(true);
    }
  };

  const toggleStoreStatus = () => {
    setStoreSettings(prev => ({ ...prev, isStoreOpen: !prev.isStoreOpen }));
  };

  const NavItem = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button
      onClick={() => handleNavClick(id)}
      className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition font-medium ${activeTab === id
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
        : 'text-gray-500 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-gray-800 hover:text-indigo-600 dark:hover:text-indigo-400'
        }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col md:flex-row font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">

      {/* Mobile Header */}
      <div className="md:hidden bg-white dark:bg-gray-800 p-4 flex justify-between items-center shadow-sm z-10 border-b dark:border-gray-700">
        <div className="flex items-center gap-2">
          {storeSettings.logoUrl ? (
            <img src={storeSettings.logoUrl} alt="Logo" className="w-8 h-8 rounded object-cover" />
          ) : (
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Bike size={24} />
            </div>
          )}
          <span className="font-bold text-lg text-indigo-900 dark:text-white truncate max-w-[150px]">{storeSettings.name}</span>
        </div>
        <button onClick={() => setShowNewOrder(true)} className="bg-indigo-600 text-white p-2 rounded-lg">
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar */}
      <aside className="hidden md:flex w-72 bg-white dark:bg-gray-800 flex-col border-r border-gray-100 dark:border-gray-700 p-6 shadow-sm z-20 transition-colors duration-200">
        <div className="flex items-center gap-3 mb-10 px-2">
          {storeSettings.logoUrl ? (
            <div className="w-12 h-12 rounded-xl border border-gray-100 dark:border-gray-600 p-1 shadow-md bg-white dark:bg-gray-700">
              <img src={storeSettings.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-lg" />
            </div>
          ) : (
            <div className="bg-gradient-to-br from-indigo-600 to-blue-500 p-2.5 rounded-xl text-white shadow-md">
              <Bike size={28} />
            </div>
          )}
          <div className="overflow-hidden">
            <h1 className="font-bold text-xl text-gray-800 dark:text-white tracking-tight truncate" title={storeSettings.name}>{storeSettings.name}</h1>
            <p className="text-xs text-indigo-500 dark:text-indigo-400 font-medium tracking-wide">GESTÃO PRO</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem id="dashboard" label="Visão Geral" icon={LayoutDashboard} />
          <NavItem id="orders" label="Pedidos" icon={ShoppingBag} />

          <div className="pt-2 pb-2 my-2 border-y border-gray-100 dark:border-gray-700">
            <p className="px-4 text-xs font-bold text-gray-400 uppercase mb-2">Auto-Atendimento</p>
            <NavItem id="whatsapp_connect" label="Conexão WhatsApp" icon={QrCode} />
            <NavItem id="live_chat" label="Chat Ao Vivo" icon={MessageCircle} />
          </div>

          <NavItem id="products" label="Cardápio" icon={Utensils} />
          <NavItem id="clients" label="Clientes" icon={Users} />
          <NavItem id="drivers" label="Entregadores" icon={Bike} />
          <NavItem id="team" label="Equipe / RH" icon={Briefcase} />
          <NavItem id="reports" label="Relatórios" icon={FileBarChart} />
          <NavItem id="supplies" label="Estoque (Insumos)" icon={Package} />
          <NavItem id="pricing" label="Precificador" icon={Calculator} />
          <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
            <NavItem id="settings" label="Configurações" icon={SettingsIcon} />
          </div>
        </nav>

        <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-700 space-y-3">

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-2 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {darkMode ? 'Modo Claro' : 'Modo Escuro'}
          </button>

          <button
            onClick={() => setShowNewOrder(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition transform hover:-translate-y-0.5 active:translate-y-0"
          >
            + Novo Pedido
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 py-2 rounded-lg transition text-sm"
          >
            <LogOut size={16} /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              {activeTab === 'dashboard' && 'Painel de Controle'}
              {activeTab === 'orders' && 'Gestão de Pedidos'}
              {activeTab === 'products' && 'Produtos e Estoque'}
              {activeTab === 'clients' && 'Base de Clientes'}
              {activeTab === 'drivers' && 'Gestão de Entregadores'}
              {activeTab === 'team' && 'Recursos Humanos'}
              {activeTab === 'supplies' && 'Estoque de Insumos'}
              {activeTab === 'pricing' && 'Precificador Inteligente'}
              {activeTab === 'settings' && 'Configurações do Sistema'}
              {activeTab === 'settings' && 'Configurações do Sistema'}
              {activeTab === 'reports' && 'Relatórios e Análises'}
              {activeTab === 'whatsapp_connect' && 'Conectar WhatsApp'}
              {activeTab === 'live_chat' && 'Atendimento ao Vivo'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-4">

            {/* STORE TOGGLE */}
            <button
              onClick={toggleStoreStatus}
              className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-sm border transition ${storeSettings.isStoreOpen ? 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800' : 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800'}`}
              title="Clique para Abrir/Fechar a loja"
            >
              {storeSettings.isStoreOpen ? (
                <>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm font-bold text-green-700 dark:text-green-400">Loja Aberta</span>
                  <DoorOpen size={16} className="text-green-700 dark:text-green-400 ml-1" />
                </>
              ) : (
                <>
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <span className="text-sm font-bold text-red-700 dark:text-red-400">Loja Fechada</span>
                  <DoorClosed size={16} className="text-red-700 dark:text-red-400 ml-1" />
                </>
              )}
            </button>

          </div>
        </header>

        {activeTab === 'dashboard' && <Dashboard orders={orders} />}
        {activeTab === 'orders' && (
          <OrderManagement
            orders={orders}
            setOrders={setOrders}
            settings={storeSettings}
            drivers={drivers}
            onOpenWhatsAppSimulator={() => setShowWhatsAppSim(true)}
          />
        )}
        {activeTab === 'clients' && <ClientManagement clients={clients} setClients={setClients} />}
        {activeTab === 'products' && <ProductManagement products={products} setProducts={setProducts} />}
        {activeTab === 'supplies' && <SupplyManagement supplies={supplies} setSupplies={setSupplies} />}
        {activeTab === 'pricing' && <PricingCalculator />}
        {activeTab === 'reports' && <Reports orders={orders} />}
        {activeTab === 'drivers' && <DriverManagement drivers={drivers} setDrivers={setDrivers} orders={orders} setOrders={setOrders} />}
        {activeTab === 'team' && <TeamManagement employees={employees} setEmployees={setEmployees} />}
        {activeTab === 'settings' && (
          <Settings
            settings={storeSettings}
            onSave={(newSettings) => {
              setStoreSettings(newSettings);
              // Sync with Backend
              fetch(`${API_URL}/api/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings)
              }).catch(err => console.error('Failed to save settings API', err));
            }}
            onLogout={onLogout}
            onBackup={handleBackup}
            onRestore={handleRestore}
            onImportOrders={handleImportOrders}
          />
        )}
        {activeTab === 'whatsapp_connect' && <WhatsappConnection />}
        {activeTab === 'live_chat' && <LiveChat />}
      </main>

      {/* NEW ORDER MODAL */}
      {showNewOrder && (
        <NewOrder
          clients={clients}
          products={products}
          orders={orders}
          settings={storeSettings}
          onCreateOrder={handleCreateOrder}
          onCancel={() => setShowNewOrder(false)}
        />
      )}

      {/* WHATSAPP SIMULATOR MODAL */}
      {showWhatsAppSim && (
        <WhatsAppSimulator
          onClose={() => setShowWhatsAppSim(false)}
          products={products}
          settings={storeSettings}
          onCreateOrder={handleCreateOrder}
        />
      )}

      {/* SETTINGS LOCK MODAL */}
      {showSettingsLock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-sm text-center">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full text-red-600 dark:text-red-400 w-fit mx-auto mb-4">
              <Lock size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Acesso Restrito</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Digite a senha de gerente para acessar as configurações.</p>

            <input
              type="password"
              autoFocus
              className={`w-full text-center text-2xl font-bold tracking-widest border-2 rounded-lg p-3 outline-none transition mb-2 dark:bg-gray-700 dark:text-white ${lockError ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900' : 'border-gray-200 dark:border-gray-600 focus:border-indigo-500'}`}
              placeholder="••••"
              value={lockPassword}
              onChange={e => { setLockPassword(e.target.value); setLockError(false); }}
              onKeyDown={e => e.key === 'Enter' && unlockSettings()}
            />

            {lockError && <p className="text-red-500 text-xs font-bold mb-4">Senha incorreta</p>}

            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowSettingsLock(false)} className="flex-1 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">Cancelar</button>
              <button onClick={unlockSettings} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">Acessar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
