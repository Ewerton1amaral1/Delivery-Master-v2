
import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, StoreSettings, PaymentMethod, OrderSource, Driver, PaymentMethodLabels } from '../types';
import { Clock, CheckCircle, Truck, ShoppingBag, XCircle, Printer, Copy, Eye, EyeOff, RotateCcw, Trash2, Timer, Lock, AlertTriangle, RefreshCw, Bike, MessageCircle, Send, Bell } from 'lucide-react';

interface OrderManagementProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  settings?: StoreSettings;
  drivers?: Driver[];
  onOpenWhatsAppSimulator?: () => void; // Added prop
}

// -- SUB-COMPONENTS --

const OrderTimer = ({ createdAt, status }: { createdAt: string, status: OrderStatus }) => {
  const [elapsed, setElapsed] = useState('');
  const [colorClass, setColorClass] = useState('text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400');

  useEffect(() => {
    if (status === OrderStatus.COMPLETED || status === OrderStatus.CANCELLED) return;

    const interval = setInterval(() => {
      const now = new Date();
      const start = new Date(createdAt);
      const diffMs = now.getTime() - start.getTime();
      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setElapsed(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);

      if (minutes >= 50 || hours > 0) setColorClass('text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 animate-pulse');
      else if (minutes >= 30) setColorClass('text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400');
      else setColorClass('text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400');
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt, status]);

  if (status === OrderStatus.COMPLETED || status === OrderStatus.CANCELLED) return null;

  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold font-mono border border-transparent ${colorClass}`}>
      <Timer size={12} />
      <span>{elapsed}</span>
    </div>
  );
};

const SourceBadge = ({ source }: { source: OrderSource }) => {
  if (source === 'IFOOD') return <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">iFood</span>;
  if (source === 'WHATSAPP_BOT') return <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">WhatsApp</span>;
  if (source === 'DIGITAL_MENU') return <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Site</span>;
  return <span className="bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-200 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Loja</span>;
};

// -- MAIN COMPONENT --

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const OrderManagement: React.FC<OrderManagementProps> = ({ orders, setOrders, settings, drivers, onOpenWhatsAppSimulator }) => {
  const [showCancelled, setShowCancelled] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modal States
  const [modalType, setModalType] = useState<'NONE' | 'PASSWORD' | 'CONFIRM'>('NONE');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Driver WhatsApp Modal State
  const [whatsappModal, setWhatsappModal] = useState<{ isOpen: boolean; link: string; driverName: string } | null>(null);

  // -- HELPER: Clean Phone Number --
  const cleanPhoneNumber = (phone: string) => {
    return phone.replace(/\D/g, ''); // Removes everything that is not a digit
  };

  // -- ACTIONS --

  const updateStatus = (orderId: string, newStatus: OrderStatus) => {
    // 1. Update the order status in the state (Optimistic)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o));

    // 2. Persist to Backend
    fetch(`${API_URL}/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    }).catch(err => {
      console.error("Failed to update status", err);
      alert("Falha ao atualizar status no servidor. Verifique a conexão.");
    });

    // 3. Logic to trigger WhatsApp Modal when moving to DELIVERING
    if (newStatus === OrderStatus.DELIVERING) {
      const order = orders.find(o => o.id === orderId);

      // Check if there is a driver assigned
      if (order && order.driverId && drivers) {
        const driver = drivers.find(d => d.id === order.driverId);

        if (driver && driver.phone) {
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`;
          const itemsText = order.items.map(i => `${i.quantity}x ${i.productName}`).join('\n');

          const message = `🛵 *NOVA ENTREGA - Pedido #${order.id}*\n` +
            `👤 *Cliente:* ${order.clientName}\n` +
            `📍 *Endereço:* ${order.deliveryAddress}\n` +
            (order.deliveryAddressReference ? `ℹ️ *Ref:* ${order.deliveryAddressReference}\n` : '') +
            `\n🍔 *ITENS:*\n${itemsText}\n` +
            `\n💰 *Total:* R$ ${order.total.toFixed(2)}\n` +
            `💳 *Pagamento:* ${order.paymentMethod}\n` +
            (order.changeFor ? `💵 *Levar Troco para:* R$ ${order.changeFor.toFixed(2)}\n` : '') +
            `\nLink Maps: ${mapsUrl}`;

          const phone = cleanPhoneNumber(driver.phone);
          const link = `https://api.whatsapp.com/send/?phone=55${phone}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;

          // Open the modal
          setWhatsappModal({
            isOpen: true,
            link: link,
            driverName: driver.name
          });
        }
      }
    }
  };

  const assignDriver = (orderId: string, driverId: string) => {
    const driver = drivers?.find(d => d.id === driverId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, driverId, driverName: driver?.name, updatedAt: new Date().toISOString() } : o));
  };

  const simulateSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const existingIds = orders.map(o => parseInt(o.id)).filter(n => !isNaN(n));
      const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1001;

      const newOrder: Order = {
        id: nextId.toString(),
        source: 'IFOOD',
        clientId: 'ifood_guest',
        clientName: 'Cliente iFood #' + nextId,
        clientPhone: '(11) 99999-9999',
        deliveryAddress: 'Rua do iFood, 123 - Centro',
        items: [
          { productId: 'temp', productName: 'Promoção iFood', quantity: 1, unitPrice: 35.00 }
        ],
        subtotal: 35.00,
        deliveryFee: 0,
        discount: 0,
        total: 35.00,
        status: OrderStatus.RECEIVED,
        paymentMethod: PaymentMethod.CARD,
        paymentStatus: 'Paid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setOrders(prev => [newOrder, ...prev]);
      setIsSyncing(false);
    }, 2000);
  };

  const initCancel = (e: React.MouseEvent, orderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedOrderId(orderId);

    if (settings?.managerPassword && settings.managerPassword.trim().length > 0) {
      setModalType('PASSWORD');
      setPasswordInput('');
      setPasswordError(false);
    } else {
      setModalType('CONFIRM');
    }
  };

  const confirmCancel = () => {
    if (selectedOrderId) {
      updateStatus(selectedOrderId, OrderStatus.CANCELLED);
    }
    closeModal();
  };

  const verifyPasswordAndCancel = () => {
    if (passwordInput === settings?.managerPassword) {
      confirmCancel();
    } else {
      setPasswordError(true);
    }
  };

  const closeModal = () => {
    setModalType('NONE');
    setSelectedOrderId(null);
    setPasswordInput('');
    setPasswordError(false);
  };

  const handlePrintOrder = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    const printWindow = window.open('', '_blank', 'width=400,height=600');

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(mapsUrl)}`;

    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Pedido #${order.id}</title>
            <style>
              @page { size: 58mm auto; margin: 0; }
              body { width: 58mm; margin: 0; padding: 2mm; font-family: 'Courier New', monospace; font-size: 11px; color: #000; }
              .header { text-align: center; margin-bottom: 5px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
              .store { font-size: 14px; font-weight: bold; text-transform: uppercase; }
              .info { font-size: 10px; margin-bottom: 5px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
              .items { width: 100%; border-collapse: collapse; margin: 5px 0; border-bottom: 1px dashed #000; }
              .items td { vertical-align: top; padding-bottom: 2px; }
              .totals { text-align: right; font-size: 12px; margin-top: 5px; }
              .total-row { font-weight: bold; font-size: 14px; }
              .qr-container { text-align: center; margin-top: 10px; }
              .qr-container img { width: 80px; height: 80px; }
              .ref { font-size: 9px; font-style: italic; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="store">${settings?.name || 'DELIVERY MASTER'}</div>
              <div>${new Date(order.createdAt).toLocaleDateString()} ${new Date(order.createdAt).toLocaleTimeString()}</div>
              <div style="font-size: 16px; margin: 5px 0;"><strong>PEDIDO #${order.id}</strong></div>
              <div>Origem: ${order.source === 'WHATSAPP_BOT' ? 'WhatsApp Bot' : order.source}</div>
              ${order.driverName ? `<div>Entregador: ${order.driverName}</div>` : ''}
            </div>
            
            <div class="info">
              <strong>CLIENTE:</strong> ${order.clientName}<br/>
              ${order.clientPhone || ''}<br/>
              <strong>ENDEREÇO:</strong><br/>
              ${order.deliveryAddress}
              ${order.deliveryAddressReference ? `<br/><span class="ref">Ref: ${order.deliveryAddressReference}</span>` : ''}
            </div>

            <table class="items">
              ${order.items.map(item => `
                <tr>
                  <td width="15%">${item.quantity}x</td>
                  <td width="60%">${item.productName} <br/><i style="font-size:9px">${item.notes || ''}</i></td>
                  <td width="25%" align="right">${(item.unitPrice * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </table>

            <div class="totals">
              <div>Subtotal: ${order.subtotal.toFixed(2)}</div>
              <div>Entrega: ${order.deliveryFee.toFixed(2)}</div>
              ${order.discount > 0 ? `<div>Desconto: -${order.discount.toFixed(2)}</div>` : ''}
              <div class="total-row">TOTAL: R$ ${order.total.toFixed(2)}</div>
              <div style="margin-top:5px">Pagamento: <strong>${PaymentMethodLabels[order.paymentMethod] || order.paymentMethod}</strong></div>
              ${order.changeFor ? `<div>Levar Troco p/: R$ ${order.changeFor.toFixed(2)}</div>` : ''}
              ${order.changeFor ? `<div><strong>Troco: R$ ${(order.changeFor - order.total).toFixed(2)}</strong></div>` : ''}
            </div>

            <div class="qr-container">
               <img src="${qrCodeUrl}" />
               <div style="font-size:9px">Localização GPS</div>
            </div>
            
            <br/>
            <center>.</center>
            <script>window.onload = function() { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleCopy = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();

    // FORMAT REQUESTED BY USER
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`;

    const text = `🛵 NOVO PEDIDO #${order.id} - ${settings?.name || 'Minha Loja'}
    
👤 Cliente: ${order.clientName}
📞 Tel: ${order.clientPhone}
📍 Endereço: ${order.deliveryAddress}
${order.deliveryAddressReference ? `ℹ️ Ref: ${order.deliveryAddressReference}` : ''}

🍔 ITENS:
${order.items.map(i => `${i.quantity}x ${i.productName} ${i.notes ? `(${i.notes})` : ''}`).join('\n')}

💰 Total: R$ ${order.total.toFixed(2)}
💳 Pagamento: ${PaymentMethodLabels[order.paymentMethod] || order.paymentMethod}
${order.changeFor ? `💵 Troco para: R$ ${order.changeFor.toFixed(2)}` : ''}

Link Maps: ${mapsUrl}`;

    navigator.clipboard.writeText(text).then(() => alert('Copiado no formato padrão!'));
  };

  // Render helpers
  const renderCard = (order: Order, showActions = true) => (
    <div key={order.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition relative group mb-3">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-800 dark:text-gray-100 text-lg">#{order.id}</span>
          <OrderTimer createdAt={order.createdAt} status={order.status} />
        </div>
        <div className="flex flex-col items-end gap-1">
          <SourceBadge source={order.source} />
          <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <div className="mb-3">
        <p className="font-medium text-gray-700 dark:text-gray-200 leading-tight">{order.clientName}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{order.deliveryAddress}</p>
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-300 mb-3 space-y-1 bg-gray-50 dark:bg-gray-700/50 p-2 rounded border border-gray-100 dark:border-gray-600">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between">
            <span>{item.quantity}x {item.productName} {item.isHalfHalf ? '(1/2)' : ''}</span>
          </div>
        ))}
      </div>

      {/* DRIVER SELECTOR */}
      {(order.status === OrderStatus.PREPARING || order.status === OrderStatus.DELIVERING) && drivers && drivers.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 p-1.5 rounded border border-indigo-100 dark:border-indigo-800">
            <Bike size={14} className="text-indigo-600 dark:text-indigo-400" />
            <select
              className="bg-transparent text-xs w-full outline-none text-indigo-800 dark:text-indigo-300 font-medium"
              value={order.driverId || ''}
              onChange={(e) => assignDriver(order.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="" className="dark:bg-gray-800">Selecione Entregador...</option>
              {drivers.map(d => <option key={d.id} value={d.id} className="dark:bg-gray-800">{d.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {showActions && (
        <>
          <div className="flex gap-2 mb-3">
            <button onClick={(e) => handlePrintOrder(e, order)} className="flex-1 flex items-center justify-center gap-1 text-xs bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-1.5 rounded border border-gray-200 dark:border-gray-600 transition font-medium">
              <Printer size={14} /> Imprimir
            </button>
            <button onClick={(e) => handleCopy(e, order)} className="flex-1 flex items-center justify-center gap-1 text-xs bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 py-1.5 rounded border border-indigo-100 dark:border-indigo-800 transition font-medium">
              <Copy size={14} /> Copiar
            </button>
          </div>

          <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-700 pt-2">
            <div className="flex flex-col">
              <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">R$ {order.total.toFixed(2)}</span>
              {order.paymentMethod === PaymentMethod.CASH && order.changeFor && (
                <span className="text-[10px] text-gray-500 bg-gray-100 px-1 rounded">Troco p/ {order.changeFor}</span>
              )}
            </div>
            <div className="flex gap-1">
              {order.status === OrderStatus.PENDING && (
                <div className="flex gap-2 w-full">
                  <button onClick={(e) => { e.stopPropagation(); updateStatus(order.id, OrderStatus.RECEIVED); }} className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded font-bold text-xs hover:bg-green-700 shadow-md">
                    ACEITAR
                  </button>
                  <button onClick={(e) => initCancel(e, order.id)} className="px-3 py-1.5 bg-red-100 text-red-600 rounded font-bold text-xs hover:bg-red-200">
                    RECUSAR
                  </button>
                </div>
              )}

              {order.status === OrderStatus.RECEIVED && (
                <button onClick={(e) => { e.stopPropagation(); updateStatus(order.id, OrderStatus.PREPARING); }} className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded hover:bg-amber-200 transition" title="Mover para Cozinha">
                  <Clock size={20} />
                </button>
              )}
              {order.status === OrderStatus.PREPARING && (
                <button onClick={(e) => { e.stopPropagation(); updateStatus(order.id, OrderStatus.DELIVERING); }} className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 transition" title="Saiu para Entrega">
                  <Truck size={20} />
                </button>
              )}
              {order.status === OrderStatus.DELIVERING && (
                <button onClick={(e) => { e.stopPropagation(); updateStatus(order.id, OrderStatus.COMPLETED); }} className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded hover:bg-green-200 transition" title="Concluir Pedido">
                  <CheckCircle size={20} />
                </button>
              )}
              {order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.PENDING && (
                <button
                  onClick={(e) => initCancel(e, order.id)}
                  className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded hover:bg-red-100 border border-red-100 dark:border-red-900 transition"
                  title="Cancelar Pedido"
                >
                  <XCircle size={20} />
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* SPECIAL RENDER FOR PENDING ORDERS ONLY */}
      {order.status === OrderStatus.PENDING && !showActions && (
        <div className="flex gap-2 mt-4">
          <button onClick={(e) => { e.stopPropagation(); updateStatus(order.id, OrderStatus.RECEIVED); }} className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold shadow-sm transition">
            ACEITAR
          </button>
          <button onClick={(e) => initCancel(e, order.id)} className="flex-1 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg font-bold transition">
            RECUSAR
          </button>
        </div>
      )}
    </div>
  );

  const columns = [
    { status: OrderStatus.RECEIVED, title: 'Recebidos', icon: ShoppingBag, color: 'text-blue-600 dark:text-blue-400 border-blue-500' },
    { status: OrderStatus.PREPARING, title: 'Na Cozinha', icon: Clock, color: 'text-amber-600 dark:text-amber-400 border-amber-500' },
    { status: OrderStatus.DELIVERING, title: 'Saiu p/ Entrega', icon: Truck, color: 'text-purple-600 dark:text-purple-400 border-purple-500' },
    { status: OrderStatus.COMPLETED, title: 'Concluídos', icon: CheckCircle, color: 'text-green-600 dark:text-green-400 border-green-500' },
  ];

  const pendingOrders = orders.filter(o => o.status === OrderStatus.PENDING);
  const cancelledOrders = orders.filter(o => o.status === OrderStatus.CANCELLED);

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex justify-between mb-4 px-2 items-center">
        <div className="flex items-center gap-2">
          {/* WHATSAPP BOT BUTTON */}
          <button
            onClick={onOpenWhatsAppSimulator}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition bg-green-600 text-white hover:bg-green-700 shadow-sm"
          >
            <MessageCircle size={16} /> 🤖 Testar Bot WhatsApp
          </button>

          {settings?.integrations?.ifoodEnabled && (
            <button
              onClick={simulateSync}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition border ${isSyncing ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 border-gray-200 dark:border-gray-600' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900 hover:bg-red-100'}`}
            >
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Sincronizando...' : 'Buscar Pedidos iFood'}
            </button>
          )}
        </div>

        <button
          onClick={() => setShowCancelled(!showCancelled)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${showCancelled ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-red-600 border border-gray-200 dark:border-gray-700'}`}
        >
          {showCancelled ? <EyeOff size={16} /> : <Eye size={16} />}
          {showCancelled ? 'Ocultar Cancelados' : `Ver Cancelados (${cancelledOrders.length})`}
        </button>
      </div>

      {/* PENDING APPROVAL SECTION */}
      {pendingOrders.length > 0 && (
        <div className="mx-2 mb-6 bg-yellow-50 dark:bg-yellow-900/10 border-2 border-yellow-400 dark:border-yellow-600 rounded-xl p-4 animate-pulse-slow">
          <h3 className="text-yellow-800 dark:text-yellow-500 font-bold text-lg mb-4 flex items-center gap-2">
            <Bell className="animate-bounce" /> Pedidos Aguardando Aceite ({pendingOrders.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingOrders.map(order => renderCard(order, false))}
          </div>
        </div>
      )}

      {showCancelled && (
        <div className="mb-6 mx-2 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/50 rounded-xl">
          <h3 className="text-red-800 dark:text-red-400 font-bold mb-3 flex items-center gap-2"><Trash2 size={20} /> Histórico de Cancelamentos</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cancelledOrders.map(order => (
              <div key={order.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-red-100 dark:border-red-900/30 opacity-75">
                <div className="font-bold text-gray-700 dark:text-gray-300">#{order.id} - {order.clientName}</div>
                <div className="text-xs text-red-500 mb-2">Cancelado em {new Date(order.updatedAt).toLocaleDateString()}</div>
                <button onClick={() => updateStatus(order.id, OrderStatus.RECEIVED)} className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-2 py-1 rounded flex items-center gap-1 dark:text-gray-300">
                  <RotateCcw size={12} /> Restaurar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex gap-4 overflow-x-auto pb-2 px-2">
        {columns.map(col => {
          const colOrders = orders
            .filter(o => o.status === col.status)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Sort by newest first

          return (
            <div key={col.status} className="flex-1 min-w-[300px] bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 flex flex-col h-full border border-gray-100 dark:border-gray-700/50">
              <div className={`flex items-center gap-2 mb-4 pb-2 border-b-2 ${col.color}`}>
                <col.icon size={20} />
                <h3 className="font-bold text-gray-700 dark:text-gray-300">{col.title}</h3>
                <span className="ml-auto bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">{colOrders.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {colOrders.map(order => renderCard(order))}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- MODALS --- */}

      {/* 1. PASSWORD MODAL */}
      {modalType === 'PASSWORD' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 rounded-xl">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full text-red-600 dark:text-red-400 mb-3">
                <Lock size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Senha de Gerente</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Esta ação requer autorização.</p>
            </div>

            <input
              type="password"
              autoFocus
              className={`w-full text-center text-2xl font-bold tracking-widest border-2 rounded-lg p-3 outline-none transition mb-2 dark:bg-gray-700 dark:text-white ${passwordError ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900' : 'border-gray-200 dark:border-gray-600 focus:border-indigo-500'}`}
              placeholder="••••"
              value={passwordInput}
              onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
              onKeyDown={e => e.key === 'Enter' && verifyPasswordAndCancel()}
            />

            {passwordError && <p className="text-red-500 text-xs text-center mb-4 font-bold">Senha incorreta.</p>}

            <div className="flex gap-3 mt-4">
              <button onClick={closeModal} className="flex-1 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium dark:text-gray-300">Cancelar</button>
              <button onClick={verifyPasswordAndCancel} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-200">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SIMPLE CONFIRM MODAL */}
      {modalType === 'CONFIRM' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 rounded-xl">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-full text-amber-600 dark:text-amber-400 mb-3">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Cancelar Pedido?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">O pedido será movido para o histórico de cancelados. Deseja continuar?</p>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={closeModal} className="flex-1 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium dark:text-gray-300">Não, voltar</button>
              <button onClick={confirmCancel} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-200">Sim, cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. WHATSAPP DRIVER CONFIRMATION MODAL */}
      {whatsappModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full text-green-600 dark:text-green-400 mb-3">
                <MessageCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Enviar para Entregador?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Deseja enviar os dados do pedido para o WhatsApp do entregador <strong>{whatsappModal.driverName}</strong>?
              </p>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setWhatsappModal(null)}
                className="flex-1 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium dark:text-gray-300 text-xs"
              >
                Não (Apenas mudar status)
              </button>
              <button
                onClick={() => {
                  window.open(whatsappModal.link, '_blank');
                  setWhatsappModal(null);
                }}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-lg shadow-green-200 flex items-center justify-center gap-2"
              >
                <Send size={16} /> Sim, Enviar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
