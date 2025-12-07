
import React, { useState, useEffect } from 'react';
import { Client, Product, Order, OrderItem, ProductCategory, PaymentMethod, OrderStatus, StoreSettings } from '../types';
import { Search, Trash2, CreditCard, DollarSign, Wallet, QrCode } from 'lucide-react';

interface NewOrderProps {
  clients: Client[];
  products: Product[];
  orders: Order[];
  settings?: StoreSettings; // Added settings prop
  onCreateOrder: (order: Order) => void;
  onCancel: () => void;
}

export const NewOrder: React.FC<NewOrderProps> = ({ clients, products, orders, settings, onCreateOrder, onCancel }) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [itemSearch, setItemSearch] = useState('');
  
  // Fee States
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [driverFee, setDriverFee] = useState(0);
  
  // Cash Change State
  const [changeFor, setChangeFor] = useState<string>('');
  
  // States for adding item
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isHalfHalf, setIsHalfHalf] = useState(false);
  const [secondFlavor, setSecondFlavor] = useState<Product | null>(null);
  const [itemNotes, setItemNotes] = useState('');

  // UPDATE FEES WHEN CLIENT CHANGES
  useEffect(() => {
    if (!selectedClientId) {
      setDeliveryFee(0);
      setDriverFee(0);
      return;
    }

    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;
    
    const dist = client.distanceKm || 0;

    // 1. Calculate Customer Fee (Revenue)
    if (settings?.deliveryRanges && settings.deliveryRanges.length > 0) {
       const rule = settings.deliveryRanges.find(r => dist >= r.minKm && dist <= r.maxKm);
       if (rule) {
         setDeliveryFee(rule.price);
       } else {
         setDeliveryFee(0);
       }
    } else {
      setDeliveryFee(0);
    }

    // 2. Calculate Driver Fee (Cost)
    if (settings?.driverFeeRanges && settings.driverFeeRanges.length > 0) {
        const rule = settings.driverFeeRanges.find(r => dist >= r.minKm && dist <= r.maxKm);
        if (rule) {
            setDriverFee(rule.price);
        } else {
            setDriverFee(0);
        }
    } else {
        setDriverFee(0);
    }

  }, [selectedClientId, clients, settings]);

  // Totals
  const subtotal = cart.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  const discount = 0; // Can implement discount logic
  const total = subtotal + deliveryFee - discount;

  const handleAddItem = () => {
    if (!selectedProduct) return;

    let price = selectedProduct.price;
    let name = selectedProduct.name;
    let pId = selectedProduct.id;

    if (isHalfHalf && secondFlavor) {
      price = Math.max(selectedProduct.price, secondFlavor.price);
      name = `1/2 ${selectedProduct.name} + 1/2 ${secondFlavor.name}`;
      pId = `${selectedProduct.id}-${secondFlavor.id}`;
    }

    const newItem: OrderItem = {
      productId: pId,
      productName: name,
      quantity,
      unitPrice: price,
      notes: itemNotes,
      isHalfHalf,
      secondFlavorId: secondFlavor?.id
    };

    setCart([...cart, newItem]);
    
    // Reset Add Item form
    setSelectedProduct(null);
    setSecondFlavor(null);
    setIsHalfHalf(false);
    setQuantity(1);
    setItemNotes('');
    setItemSearch('');
  };

  const handleFinalize = () => {
    if (!selectedClientId || cart.length === 0) return;

    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    // --- SEQUENTIAL ID LOGIC ---
    const existingIds = orders
        .map(o => parseInt(o.id))
        .filter(n => !isNaN(n));
    
    const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    // ---------------------------

    const newOrder: Order = {
      id: nextId.toString(),
      source: 'STORE',
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      deliveryAddress: client.address.formatted || `${client.address.street}, ${client.address.number}`,
      deliveryAddressReference: client.address.reference,
      items: cart,
      subtotal,
      deliveryFee,
      driverFee, // Saving the internal cost
      discount,
      total,
      status: OrderStatus.RECEIVED,
      paymentMethod,
      changeFor: (paymentMethod === PaymentMethod.CASH && changeFor) ? parseFloat(changeFor) : undefined,
      paymentStatus: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onCreateOrder(newOrder);
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(itemSearch.toLowerCase()));
  const pizzaProducts = products.filter(p => p.category === ProductCategory.PIZZA);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">Novo Pedido</h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Client Selection */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
              <select 
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 bg-white"
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
              >
                <option value="">Selecione um cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                ))}
              </select>
              {selectedClientId && (
                <div className="mt-2 text-xs text-gray-500 flex items-center gap-1 justify-between">
                  <div className="flex flex-col">
                     <span>📍 {clients.find(c => c.id === selectedClientId)?.address.formatted}</span>
                     {clients.find(c => c.id === selectedClientId)?.address.reference && (
                        <span className="italic text-gray-400">Ref: {clients.find(c => c.id === selectedClientId)?.address.reference}</span>
                     )}
                  </div>
                  <span className="font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                    {clients.find(c => c.id === selectedClientId)?.distanceKm || 0} km
                  </span>
                </div>
              )}
            </div>

            {/* 2. Add Product */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">Adicionar Item</label>
              
              {!selectedProduct ? (
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar produto..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={itemSearch}
                    onChange={e => setItemSearch(e.target.value)}
                  />
                  {itemSearch && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg z-10">
                      {filteredProducts.map(p => (
                        <div 
                          key={p.id} 
                          className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0"
                          onClick={() => setSelectedProduct(p)}
                        >
                          <span className="font-medium text-gray-700">{p.name}</span>
                          <span className="text-sm font-bold text-indigo-600">R$ {p.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                    <span className="font-bold text-indigo-900">{selectedProduct.name}</span>
                    <button onClick={() => setSelectedProduct(null)} className="text-xs text-indigo-500 hover:text-indigo-700 font-bold">TROCAR</button>
                  </div>

                  {selectedProduct.category === ProductCategory.PIZZA && (
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="halfHalf" 
                        checked={isHalfHalf} 
                        onChange={e => {
                            setIsHalfHalf(e.target.checked);
                            if (!e.target.checked) setSecondFlavor(null);
                        }} 
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="halfHalf" className="text-sm text-gray-700 cursor-pointer select-none">Meio a Meio?</label>
                    </div>
                  )}

                  {isHalfHalf && (
                    <div className="animate-in slide-in-from-top-2 fade-in">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Segundo Sabor</label>
                      <select 
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white"
                        value={secondFlavor?.id || ''}
                        onChange={e => setSecondFlavor(products.find(p => p.id === e.target.value) || null)}
                      >
                        <option value="">Escolha...</option>
                        {pizzaProducts.filter(p => p.id !== selectedProduct.id).map(p => (
                          <option key={p.id} value={p.id}>{p.name} (+ R$ {p.price.toFixed(2)})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <div className="w-24">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Qtd</label>
                      <input 
                        type="number" 
                        min="1" 
                        className="w-full border border-gray-300 rounded-lg p-2"
                        value={quantity}
                        onChange={e => setQuantity(parseInt(e.target.value))}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Sem cebola" 
                        className="w-full border border-gray-300 rounded-lg p-2"
                        value={itemNotes}
                        onChange={e => setItemNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleAddItem}
                    disabled={isHalfHalf && !secondFlavor}
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    Adicionar ao Pedido
                  </button>
                </div>
              )}
            </div>

            {/* 3. Payment Method */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-3">Forma de Pagamento</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: PaymentMethod.CASH, icon: DollarSign, label: 'Dinheiro' },
                  { id: PaymentMethod.CARD, icon: CreditCard, label: 'Cartão' },
                  { id: PaymentMethod.PIX, icon: QrCode, label: 'Pix' },
                  { id: PaymentMethod.WALLET, icon: Wallet, label: 'Carteira' },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition ${
                      paymentMethod === method.id 
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <method.icon size={20} className="mb-1" />
                    <span className="text-xs font-medium">{method.label}</span>
                  </button>
                ))}
              </div>
              
              {paymentMethod === PaymentMethod.PIX && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg flex items-center gap-4 border border-gray-100 animate-in fade-in">
                  <div className="bg-white p-2 rounded shadow-sm">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=ExamplePixKey" alt="QR Code Pix" className="w-20 h-20" />
                  </div>
                  <div className="text-sm text-gray-600">
                    <p className="font-bold">QR Code Gerado</p>
                    <p>Aguardando pagamento...</p>
                  </div>
                </div>
              )}
              {paymentMethod === PaymentMethod.CASH && (
                <div className="mt-4 animate-in fade-in">
                   <label className="block text-xs font-medium text-gray-600 mb-1">Troco para quanto?</label>
                   <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">R$</span>
                      <input 
                        type="number" 
                        placeholder="0.00" 
                        className="border border-gray-300 rounded-lg p-2 pl-8 w-full max-w-xs focus:ring-2 focus:ring-indigo-500 outline-none" 
                        value={changeFor}
                        onChange={e => setChangeFor(e.target.value)}
                      />
                   </div>
                   {changeFor && parseFloat(changeFor) < total && (
                      <p className="text-xs text-red-500 mt-1">O valor do troco deve ser maior que o total.</p>
                   )}
                   {changeFor && parseFloat(changeFor) >= total && (
                      <p className="text-xs text-green-600 mt-1 font-bold">Troco a devolver: R$ {(parseFloat(changeFor) - total).toFixed(2)}</p>
                   )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Summary */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col h-full shadow-inner">
             <h3 className="font-bold text-gray-800 mb-4">Resumo do Pedido</h3>
             
             <div className="flex-1 overflow-y-auto space-y-3 mb-4 custom-scrollbar bg-white p-3 rounded-lg border border-gray-200">
               {cart.length === 0 ? (
                 <p className="text-center text-gray-400 text-sm py-10">Carrinho vazio</p>
               ) : (
                 cart.map((item, idx) => (
                   <div key={idx} className="flex justify-between items-start text-sm border-b border-gray-100 last:border-0 pb-2 mb-2 last:pb-0 last:mb-0">
                     <div className="flex-1">
                       <p className="font-medium text-gray-800">{item.quantity}x {item.productName}</p>
                       {item.notes && <p className="text-xs text-gray-500 italic">"{item.notes}"</p>}
                     </div>
                     <div className="flex flex-col items-end pl-2">
                       <span className="font-medium">R$ {(item.unitPrice * item.quantity).toFixed(2)}</span>
                       <button 
                        onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-600 mt-1"
                       >
                         <Trash2 size={14} />
                       </button>
                     </div>
                   </div>
                 ))
               )}
             </div>

             <div className="space-y-2 border-t border-gray-200 pt-4">
               <div className="flex justify-between text-sm text-gray-600">
                 <span>Subtotal</span>
                 <span>R$ {subtotal.toFixed(2)}</span>
               </div>
               <div className="flex justify-between text-sm text-gray-600">
                 <span>Taxa de Entrega</span>
                 <span>R$ {deliveryFee.toFixed(2)}</span>
               </div>
               <div className="flex justify-between text-base font-bold text-gray-800 pt-2">
                 <span>Total</span>
                 <span>R$ {total.toFixed(2)}</span>
               </div>
             </div>

             <button 
               onClick={handleFinalize}
               disabled={!selectedClientId || cart.length === 0}
               className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg mt-6 hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform active:scale-95"
             >
               Finalizar Pedido
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};
