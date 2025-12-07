
import React, { useState, useEffect } from 'react';
import { Product, StoreSettings, Order, OrderItem, PaymentMethod, ProductCategory, OrderStatus, Client } from '../types';
import { ShoppingBag, Minus, Plus, X, ChevronRight, MapPin, CheckCircle, User, ArrowRight, ChevronLeft, Store, Clock, Lock, Navigation } from 'lucide-react';

interface DigitalMenuProps {
  storeId: string;
  onSwitchStore: () => void;
}

export const DigitalMenu: React.FC<DigitalMenuProps> = ({ storeId, onSwitchStore }) => {
  // Load data from LocalStorage
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  
  // Session State
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [view, setView] = useState<'REGISTER' | 'MENU' | 'SUCCESS'>('REGISTER');

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [regDistrict, setRegDistrict] = useState('');
  const [regComplement, setRegComplement] = useState('');
  const [regNote, setRegNote] = useState('');
  
  // Geolocation State
  const [isCalculating, setIsCalculating] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Cart State
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');

  // Payment Selection
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.PIX);

  useEffect(() => {
    // 1. Load Store Data
    const loadedProducts = localStorage.getItem(`dm_${storeId}_products`);
    const loadedSettings = localStorage.getItem(`dm_${storeId}_settings`);
    
    if (loadedProducts) setProducts(JSON.parse(loadedProducts));
    if (loadedSettings) setSettings(JSON.parse(loadedSettings));

    // 2. Check for Customer Session
    const savedClient = localStorage.getItem(`dm_customer_session_${storeId}`);
    if (savedClient) {
      const client = JSON.parse(savedClient);
      setCurrentClient(client);
      setDistanceKm(client.distanceKm || 0);
      setView('MENU');
      
      // Recalculate delivery fee if client exists based on settings
      if (loadedSettings) {
          const parsedSettings: StoreSettings = JSON.parse(loadedSettings);
          const fee = calculateFee(client.distanceKm || 0, parsedSettings);
          setDeliveryFee(fee);
      }
    }
  }, [storeId]);

  // --- GEOLOCATION HELPER ---
  const calculateFee = (dist: number, storeSettings: StoreSettings | null): number => {
      if (!storeSettings?.deliveryRanges) return 5.0; // Default fallback
      const rule = storeSettings.deliveryRanges.find(r => dist >= r.minKm && dist <= r.maxKm);
      return rule ? rule.price : 0;
  };

  const calculateDistance = async () => {
      if (!regAddress || !regNumber || !regDistrict || !settings?.address) {
          setGeoError("Preencha o endereço completo da entrega.");
          return;
      }
      
      setIsCalculating(true);
      setGeoError(null);

      try {
          // 1. Get Coordinates for CLIENT
          const clientQuery = `${regAddress} ${regNumber}, ${regDistrict}`;
          const clientRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clientQuery)}&limit=1`);
          const clientData = await clientRes.json();

          if (!clientData || clientData.length === 0) {
              throw new Error("Endereço do cliente não encontrado no mapa.");
          }

          // 2. Get Coordinates for STORE
          // Clean store address to remove special chars if needed, but Nominatim is usually smart
          const storeRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(settings.address)}&limit=1`);
          const storeData = await storeRes.json();

          if (!storeData || storeData.length === 0) {
              throw new Error("Endereço da loja não encontrado no mapa.");
          }

          const lat1 = parseFloat(clientData[0].lat);
          const lon1 = parseFloat(clientData[0].lon);
          const lat2 = parseFloat(storeData[0].lat);
          const lon2 = parseFloat(storeData[0].lon);

          // 3. Haversine Formula (KM)
          const R = 6371; // Radius of earth in km
          const dLat = deg2rad(lat2 - lat1);
          const dLon = deg2rad(lon2 - lon1);
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
          const d = R * c; // Distance in km
          
          const finalDist = parseFloat(d.toFixed(1));
          setDistanceKm(finalDist);
          
          // 4. Calculate Fee
          const fee = calculateFee(finalDist, settings);
          setDeliveryFee(fee);

      } catch (err: any) {
          setGeoError(err.message || "Erro ao calcular distância.");
          setDistanceKm(0);
          setDeliveryFee(5.0); // Fallback
      } finally {
          setIsCalculating(false);
      }
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI/180);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regPhone || !regAddress || !regNumber) {
      alert("Por favor, preencha os campos obrigatórios.");
      return;
    }

    const fullAddress = `${regAddress}, ${regNumber} - ${regDistrict}`;

    // Get existing clients
    const storeClientsStr = localStorage.getItem(`dm_${storeId}_clients`);
    const storeClients: Client[] = storeClientsStr ? JSON.parse(storeClientsStr) : [];

    // Check if client exists (by phone) to unify
    const existingIndex = storeClients.findIndex(c => c.phone === regPhone);
    let finalClient: Client;
    let updatedClients = [...storeClients];

    if (existingIndex >= 0) {
       const existingClient = storeClients[existingIndex];
       finalClient = {
          ...existingClient,
          name: regName,
          address: {
             street: regAddress,
             number: regNumber,
             neighborhood: regDistrict,
             complement: regComplement,
             city: '', 
             formatted: fullAddress,
             reference: regNote
          },
          distanceKm: distanceKm // Update distance
       };
       updatedClients[existingIndex] = finalClient;
    } else {
       finalClient = {
          id: `cli_${Date.now()}`,
          name: regName,
          phone: regPhone,
          email: '', 
          address: {
            street: regAddress,
            number: regNumber,
            neighborhood: regDistrict,
            complement: regComplement,
            city: '', 
            formatted: fullAddress,
            reference: regNote
          },
          distanceKm: distanceKm, 
          walletBalance: 0
       };
       updatedClients.push(finalClient);
    }

    // 1. Save Session
    localStorage.setItem(`dm_customer_session_${storeId}`, JSON.stringify(finalClient));
    setCurrentClient(finalClient);

    // 2. Save to Store Database
    localStorage.setItem(`dm_${storeId}_clients`, JSON.stringify(updatedClients));

    // 3. Move to Menu
    setView('MENU');
  };

  const handleLogout = () => {
    localStorage.removeItem(`dm_customer_session_${storeId}`);
    setCurrentClient(null);
    setView('REGISTER');
    setCart([]);
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(i => i.productId === product.id);
    if (existing) {
      setCart(cart.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { 
        productId: product.id, 
        productName: product.name, 
        quantity: 1, 
        unitPrice: product.price 
      }]);
    }
    setIsCartOpen(true);
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(i => i.quantity > 0));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);

  const handleSubmitOrder = () => {
    if (!currentClient) return;
    
    if (settings && settings.isStoreOpen === false) {
        alert("Desculpe, a loja está fechada no momento.");
        return;
    }

    const existingOrdersStr = localStorage.getItem(`dm_${storeId}_orders`);
    const existingOrders: Order[] = existingOrdersStr ? JSON.parse(existingOrdersStr) : [];
    
    const existingIds = existingOrders.map(o => parseInt(o.id)).filter(n => !isNaN(n));
    const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

    const newOrder: Order = {
      id: nextId.toString(),
      source: 'DIGITAL_MENU',
      clientId: currentClient.id,
      clientName: currentClient.name,
      clientPhone: currentClient.phone,
      deliveryAddress: currentClient.address.formatted || 'Endereço não informado',
      deliveryAddressReference: currentClient.address.reference,
      items: cart,
      subtotal: cartTotal,
      deliveryFee: deliveryFee, // Calculated Fee
      discount: 0,
      total: cartTotal + deliveryFee,
      status: OrderStatus.PENDING,
      paymentMethod,
      paymentStatus: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedOrders = [newOrder, ...existingOrders];
    localStorage.setItem(`dm_${storeId}_orders`, JSON.stringify(updatedOrders));
    
    window.dispatchEvent(new Event('storage'));

    setView('SUCCESS');
    setCart([]);
  };
  
  const handleWhatsAppShare = () => {
      if (!settings?.contactPhone) return;
      
      const phone = settings.contactPhone.replace(/\D/g, '');
      const message = `Olá! Fiz um pedido pelo cardápio digital.\n` + 
                      `Nome: ${currentClient?.name}\n` + 
                      `Itens: ${cartTotal} itens.\n` + 
                      `Total: R$ ${(cartTotal + deliveryFee).toFixed(2)}\n` +
                      `Poderiam confirmar?`;
      
      const url = `https://api.whatsapp.com/send/?phone=55${phone}&text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
  };

  // --- RENDER VIEWS ---
  
  // STORE CLOSED SCREEN
  if (settings && settings.isStoreOpen === false) {
      return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center font-sans text-white">
            <div className="bg-red-500/20 p-6 rounded-full text-red-500 mb-6 animate-pulse">
                <Lock size={64} />
            </div>
            <h1 className="text-3xl font-bold mb-2">Loja Fechada</h1>
            <p className="text-gray-400 mb-8 max-w-xs">
                No momento não estamos aceitando pedidos. Por favor, verifique nosso horário de funcionamento ou tente novamente mais tarde.
            </p>
            
            <button 
              onClick={onSwitchStore}
              className="text-white/70 hover:text-white flex items-center gap-2 border border-white/20 px-4 py-2 rounded-full"
            >
              <ChevronLeft size={16} /> Ver outros restaurantes
            </button>
        </div>
      );
  }

  if (view === 'SUCCESS') {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="bg-green-100 p-6 rounded-full text-green-600 mb-6 animate-in zoom-in">
          <CheckCircle size={64} />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Pedido Enviado!</h1>
        <p className="text-gray-600 mb-6 max-w-xs">A loja <strong>{settings?.name}</strong> recebeu seu pedido e está analisando.</p>
        
        {settings?.contactPhone && (
            <button 
            onClick={handleWhatsAppShare}
            className="w-full max-w-xs bg-green-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-600 transition shadow-lg shadow-green-200 mb-4 flex items-center justify-center gap-2"
            >
            Enviar para WhatsApp da Loja
            </button>
        )}

        <button 
          onClick={() => setView('MENU')}
          className="text-green-700 font-bold hover:underline"
        >
          Fazer Novo Pedido
        </button>
        
        <button 
          onClick={onSwitchStore}
          className="mt-8 text-sm text-gray-400 flex items-center gap-1 bg-white px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <ChevronLeft size={14} /> Voltar para Restaurantes
        </button>
      </div>
    );
  }

  if (view === 'REGISTER') {
    return (
      <div className="min-h-screen bg-white flex flex-col font-sans">
        
        {/* Sticky Back Button */}
        <div className="bg-white border-b sticky top-0 z-30 shadow-sm">
             <button onClick={onSwitchStore} className="w-full text-indigo-600 flex items-center justify-center gap-2 text-sm font-bold py-4 bg-indigo-50 hover:bg-indigo-100 transition">
                <ChevronLeft size={18}/> Escolher outro restaurante
             </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-md mx-auto w-full">
           <div className="text-center mb-10">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-24 h-24 rounded-2xl object-cover mx-auto mb-4 shadow-lg" />
              ) : (
                <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
                  <ShoppingBag size={32} />
                </div>
              )}
              <h1 className="text-2xl font-bold text-gray-800">Bem-vindo(a) ao<br/>{settings?.name || 'Nosso Cardápio'}</h1>
              <p className="text-gray-500 text-sm mt-2">Cadastre-se rapidinho para fazer seu pedido.</p>
           </div>

           <form onSubmit={handleRegister} className="w-full space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Seu Nome</label>
                <div className="relative">
                   <User className="absolute left-3 top-3 text-gray-400" size={18} />
                   <input 
                      type="text" 
                      required
                      placeholder="Como podemos te chamar?"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                   />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">WhatsApp / Telefone</label>
                <input 
                    type="tel" 
                    required
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                />
              </div>

              <div className="pt-2">
                 <label className="block text-sm font-bold text-gray-700 mb-2 ml-1 flex items-center gap-1"><MapPin size={16}/> Onde vamos entregar?</label>
                 <div className="space-y-3">
                    <input 
                        type="text" 
                        required
                        placeholder="Nome da Rua / Avenida"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={regAddress}
                        onChange={e => setRegAddress(e.target.value)}
                    />
                    <div className="flex gap-3">
                        <input 
                            type="text" 
                            required
                            placeholder="Número"
                            className="w-1/3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={regNumber}
                            onChange={e => setRegNumber(e.target.value)}
                        />
                        <input 
                            type="text" 
                            required
                            placeholder="Bairro"
                            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={regDistrict}
                            onChange={e => setRegDistrict(e.target.value)}
                        />
                    </div>
                    
                    {/* --- AUTO CALCULATION BUTTON --- */}
                    <button
                        type="button" 
                        onClick={calculateDistance}
                        disabled={isCalculating}
                        className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition"
                    >
                        {isCalculating ? (
                            <span className="animate-pulse">Calculando...</span>
                        ) : (
                            <>
                                <Navigation size={16} /> Validar Endereço & Taxa
                            </>
                        )}
                    </button>
                    
                    {/* GEO FEEDBACK */}
                    {geoError && <p className="text-xs text-red-500 text-center font-bold">{geoError}</p>}
                    {distanceKm > 0 && !geoError && (
                        <div className="text-center bg-green-50 border border-green-200 p-2 rounded-lg">
                            <p className="text-green-700 text-sm font-bold">Localizado! Distância: {distanceKm}km</p>
                            <p className="text-green-600 text-xs">Taxa de Entrega: R$ {deliveryFee.toFixed(2)}</p>
                        </div>
                    )}
                    
                    <input 
                        type="text" 
                        placeholder="Complemento (Opcional)"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={regComplement}
                        onChange={e => setRegComplement(e.target.value)}
                    />
                    <input 
                        type="text" 
                        placeholder="Ponto de Referência (Opcional)"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={regNote}
                        onChange={e => setRegNote(e.target.value)}
                    />
                 </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 mt-6 flex items-center justify-center gap-2 group"
              >
                Acessar Cardápio <ArrowRight className="group-hover:translate-x-1 transition" />
              </button>
           </form>
        </div>
      </div>
    );
  }

  // --- MENU VIEW (Main Logic) ---

  const filteredProducts = activeCategory === 'Todos' 
    ? products 
    : products.filter(p => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans max-w-md mx-auto shadow-2xl relative">
      {/* Sticky Header with Back Button */}
      <div className="bg-indigo-900 text-white p-3 text-xs flex justify-between items-center sticky top-0 z-30 shadow-md">
         <button 
            onClick={onSwitchStore} 
            className="flex items-center gap-1.5 font-bold hover:bg-white/10 px-3 py-1.5 rounded-lg transition"
         >
            <ChevronLeft size={16}/> Escolher outro restaurante
         </button>
      </div>

      <div className="bg-white p-4 border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <ShoppingBag size={20} />
            </div>
          )}
          <div>
            <h1 className="font-bold text-gray-800 leading-tight">{settings?.name || 'Cardápio Digital'}</h1>
            <p className="text-xs text-gray-500 truncate max-w-[150px]">Olá, {currentClient?.name}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-xs text-red-500 font-medium hover:underline bg-red-50 px-3 py-1 rounded-full">
           Sair
        </button>
      </div>

      {/* Categories */}
      <div className="p-4 overflow-x-auto whitespace-nowrap no-scrollbar flex gap-2">
        <button 
          onClick={() => setActiveCategory('Todos')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition ${activeCategory === 'Todos' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
        >
          Todos
        </button>
        {Object.values(ProductCategory).map(cat => (
          <button 
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition ${activeCategory === cat ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product List */}
      <div className="px-4 space-y-4">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex gap-3 cursor-pointer hover:border-indigo-200 transition" onClick={() => addToCart(product)}>
             <div className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
             </div>
             <div className="flex-1 flex flex-col justify-between">
                <div>
                   <h3 className="font-bold text-gray-800 line-clamp-1">{product.name}</h3>
                   <p className="text-xs text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                </div>
                <div className="flex justify-between items-end mt-2">
                   <span className="font-bold text-gray-900">R$ {product.price.toFixed(2)}</span>
                   <button className="bg-gray-100 text-gray-800 p-1.5 rounded-lg">
                      <Plus size={16} />
                   </button>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-0 right-0 p-4 max-w-md mx-auto z-20 animate-in slide-in-from-bottom-4">
           <button 
             onClick={() => setIsCartOpen(true)}
             className="w-full bg-indigo-600 text-white p-4 rounded-xl shadow-xl shadow-indigo-200 flex justify-between items-center font-bold"
           >
             <div className="flex items-center gap-2">
                <div className="bg-indigo-800 w-6 h-6 rounded-full flex items-center justify-center text-xs">
                   {cart.reduce((acc, i) => acc + i.quantity, 0)}
                </div>
                <span>Ver Carrinho</span>
             </div>
             <span>R$ {cartTotal.toFixed(2)}</span>
           </button>
        </div>
      )}

      {/* Cart Modal / Checkout */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-bottom-full duration-300 max-w-md mx-auto">
           <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-lg">Seu Pedido</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 bg-white rounded-full text-gray-500"><X size={20}/></button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Items */}
              <div className="space-y-4">
                 {cart.map(item => (
                   <div key={item.productId} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                         <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                            <button onClick={() => updateQty(item.productId, -1)} className="p-1"><Minus size={14}/></button>
                            <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQty(item.productId, 1)} className="p-1"><Plus size={14}/></button>
                         </div>
                         <div>
                            <p className="font-medium text-sm text-gray-800">{item.productName}</p>
                            <p className="text-xs text-gray-500">R$ {item.unitPrice.toFixed(2)}</p>
                         </div>
                      </div>
                      <span className="font-bold text-gray-800">R$ {(item.unitPrice * item.quantity).toFixed(2)}</span>
                   </div>
                 ))}
              </div>

              <hr className="border-gray-100" />

              {/* Delivery Info (Read Only or Edit) */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                 <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2 text-sm"><MapPin size={16}/> Entregar para:</h3>
                 <p className="font-bold text-gray-700">{currentClient?.name}</p>
                 <p className="text-sm text-gray-500">{currentClient?.address.formatted}</p>
                 {currentClient?.address.complement && (
                     <p className="text-xs text-gray-500 mt-1 italic">Compl: {currentClient.address.complement}</p>
                 )}
                  {currentClient?.address.reference && (
                     <p className="text-xs text-gray-500 mt-1 italic">Ref: {currentClient.address.reference}</p>
                 )}
                 <button onClick={handleLogout} className="text-xs text-indigo-600 font-bold mt-2 hover:underline">
                    Trocar Endereço / Cadastro
                 </button>
              </div>

              {/* Payment */}
              <div>
                 <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm"><DollarSignIcon size={16}/> Forma de Pagamento</h3>
                 <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setPaymentMethod(PaymentMethod.PIX)}
                      className={`p-3 rounded-lg border text-sm font-medium transition ${paymentMethod === PaymentMethod.PIX ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200'}`}
                    >
                       Pix
                    </button>
                    <button 
                      onClick={() => setPaymentMethod(PaymentMethod.CARD)}
                      className={`p-3 rounded-lg border text-sm font-medium transition ${paymentMethod === PaymentMethod.CARD ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200'}`}
                    >
                       Cartão
                    </button>
                    <button 
                      onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                      className={`p-3 rounded-lg border text-sm font-medium transition ${paymentMethod === PaymentMethod.CASH ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200'}`}
                    >
                       Dinheiro
                    </button>
                 </div>
              </div>

           </div>

           {/* Footer Checkout */}
           <div className="p-4 border-t bg-white">
              <div className="flex justify-between mb-2 text-sm">
                 <span className="text-gray-500">Subtotal</span>
                 <span>R$ {cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-4 text-sm">
                 <span className="text-gray-500">Taxa de Entrega {distanceKm > 0 ? `(${distanceKm}km)` : ''}</span>
                 <span>R$ {deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-6 text-xl font-bold">
                 <span>Total</span>
                 <span>R$ {(cartTotal + deliveryFee).toFixed(2)}</span>
              </div>
              
              <button 
                onClick={handleSubmitOrder}
                className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition shadow-lg shadow-green-200 flex items-center justify-center gap-2"
              >
                 Confirmar Pedido <ChevronRight />
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

// Helper icon
const DollarSignIcon = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
);
