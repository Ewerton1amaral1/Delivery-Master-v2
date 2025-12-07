
import React, { useState } from 'react';
import { Driver, Order, OrderStatus } from '../types';
import { Plus, Trash2, Bike, User, Edit2, Calendar, DollarSign, Wallet, Coins, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface DriverManagementProps {
   drivers: Driver[];
   setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
   orders: Order[];
   setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const DriverManagement: React.FC<DriverManagementProps> = ({ drivers, setDrivers, orders, setOrders }) => {
   const [activeTab, setActiveTab] = useState<'team' | 'finance'>('team');
   const [isEditing, setIsEditing] = useState(false);
   const [currentDriver, setCurrentDriver] = useState<Partial<Driver>>({});

   // Delete Modal State
   const [driverToDelete, setDriverToDelete] = useState<string | null>(null);

   // Finance Filters
   const [selectedDriverId, setSelectedDriverId] = useState<string>('');
   const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);

   // --- CRUD OPERATIONS ---
   const handleSave = async () => {
      if (!currentDriver.name) {
         alert("Nome é obrigatório.");
         return;
      }

      try {
         const isUpdate = !!currentDriver.id;
         const method = isUpdate ? 'PUT' : 'POST';
         const url = isUpdate
            ? `${API_URL}/api/drivers/${currentDriver.id}`
            : `${API_URL}/api/drivers`;

         const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentDriver)
         });

         if (res.ok) {
            const saved = await res.json();
            setDrivers(prev => isUpdate
               ? prev.map(d => d.id === saved.id ? saved : d)
               : [...prev, saved]
            );
            setIsEditing(false);
            setCurrentDriver({});
         } else {
            alert("Erro ao salvar entregador no servidor.");
         }
      } catch (error) {
         console.error(error);
         alert("Erro de conexão ao salvar entregador.");
      }
   };

   const requestDelete = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setDriverToDelete(id);
   };

   const confirmDelete = async () => {
      if (driverToDelete) {
         try {
            const res = await fetch(`${API_URL}/api/drivers/${driverToDelete}`, { method: 'DELETE' });
            if (res.ok) {
               setDrivers(prev => prev.filter(d => d.id !== driverToDelete));
               setDriverToDelete(null);
            } else {
               alert("Erro ao excluir entregador.");
            }
         } catch (e) {
            alert("Erro de conexão ao excluir.");
         }
      }
   };

   // --- FINANCE OPERATIONS ---
   const filteredDeliveries = orders.filter(o =>
      o.driverId === selectedDriverId &&
      o.status === OrderStatus.COMPLETED &&
      o.createdAt.startsWith(filterDate)
   );

   const selectedDriver = drivers.find(d => d.id === selectedDriverId);
   const totalFees = filteredDeliveries.reduce((acc, o) => acc + (o.driverFee || 0), 0);
   const dailyRate = selectedDriver?.dailyRate || 0;

   // Check pending amount
   const paidOrders = filteredDeliveries.filter(o => o.driverPaid).length;
   const isFullyPaid = paidOrders === filteredDeliveries.length && filteredDeliveries.length > 0;
   const pendingAmount = filteredDeliveries.reduce((acc, o) => !o.driverPaid ? acc + (o.driverFee || 0) : acc, 0) + (isFullyPaid ? 0 : dailyRate); // Simplification: Daily rate is paid with the batch

   const handleRegisterPayment = () => {
      if (pendingAmount <= 0) return;

      // Mark orders as paid
      const deliveryIds = filteredDeliveries.map(o => o.id);

      setOrders(prev => prev.map(o => {
         if (deliveryIds.includes(o.id)) {
            return { ...o, driverPaid: true, updatedAt: new Date().toISOString() };
         }
         return o;
      }));
   };

   return (
      <div className="space-y-6">

         {/* Tabs */}
         <div className="flex gap-4 border-b border-gray-200 pb-2">
            <button
               onClick={() => setActiveTab('team')}
               className={`pb-2 px-4 font-medium transition ${activeTab === 'team' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
               Equipe de Entregas
            </button>
            <button
               onClick={() => setActiveTab('finance')}
               className={`pb-2 px-4 font-medium transition ${activeTab === 'finance' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
               Acertos e Taxas
            </button>
         </div>

         {activeTab === 'team' && (
            <>
               <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-gray-800">Motoboys Cadastrados</h3>
                  <button
                     onClick={() => { setCurrentDriver({ isActive: true, dailyRate: 0 }); setIsEditing(true); }}
                     className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition"
                  >
                     <Plus size={20} /> Novo Entregador
                  </button>
               </div>

               {!isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {drivers.map(driver => (
                        <div key={driver.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                           <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                 <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                                    <Bike size={24} />
                                 </div>
                                 <div>
                                    <h4 className="font-bold text-gray-800">{driver.name}</h4>
                                    <p className="text-xs text-gray-500">{driver.phone}</p>
                                 </div>
                              </div>
                              <div className="flex gap-1">
                                 <button onClick={() => { setCurrentDriver(driver); setIsEditing(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded">
                                    <Edit2 size={16} />
                                 </button>
                                 <button onClick={(e) => requestDelete(e, driver.id)} className="p-1.5 text-red-300 hover:text-red-500 rounded">
                                    <Trash2 size={16} />
                                 </button>
                              </div>
                           </div>
                           <div className="space-y-2 mt-auto text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                              <div className="flex justify-between">
                                 <span>Diária Fixa:</span>
                                 <span className="font-bold text-indigo-600">R$ {(driver.dailyRate || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                 <span>Placa:</span>
                                 <span className="font-mono font-bold">{driver.plate || '---'}</span>
                              </div>
                              <div className="flex justify-between">
                                 <span>Pix:</span>
                                 <span className="font-mono">{driver.pixKey || '---'}</span>
                              </div>
                           </div>
                        </div>
                     ))}
                     {drivers.length === 0 && <p className="text-gray-400 col-span-3 text-center py-10">Nenhum entregador cadastrado.</p>}
                  </div>
               ) : (
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl mx-auto animate-in fade-in">
                     <h3 className="text-lg font-bold mb-6">{currentDriver.id ? 'Editar' : 'Novo'} Entregador</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                           <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                           <input type="text" className="w-full border border-gray-300 rounded-lg p-2" value={currentDriver.name || ''} onChange={e => setCurrentDriver({ ...currentDriver, name: e.target.value })} />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                           <input type="text" className="w-full border border-gray-300 rounded-lg p-2" value={currentDriver.phone || ''} onChange={e => setCurrentDriver({ ...currentDriver, phone: e.target.value })} />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Diária (Fixo)</label>
                           <div className="relative">
                              <span className="absolute left-3 top-2 text-gray-500 text-sm">R$</span>
                              <input
                                 type="number"
                                 className="w-full border border-gray-300 rounded-lg p-2 pl-8"
                                 value={currentDriver.dailyRate || ''}
                                 onChange={e => setCurrentDriver({ ...currentDriver, dailyRate: parseFloat(e.target.value) })}
                                 placeholder="0.00"
                              />
                           </div>
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Placa do Veículo</label>
                           <input type="text" className="w-full border border-gray-300 rounded-lg p-2" value={currentDriver.plate || ''} onChange={e => setCurrentDriver({ ...currentDriver, plate: e.target.value })} />
                        </div>
                        <div className="col-span-2">
                           <label className="block text-sm font-medium text-gray-700 mb-1">Chave Pix (para pagamentos)</label>
                           <input type="text" className="w-full border border-gray-300 rounded-lg p-2" value={currentDriver.pixKey || ''} onChange={e => setCurrentDriver({ ...currentDriver, pixKey: e.target.value })} />
                        </div>
                     </div>
                     <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Salvar</button>
                     </div>
                  </div>
               )}
            </>
         )}

         {activeTab === 'finance' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-1 space-y-4">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                     <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Wallet size={20} /> Filtros de Acerto</h3>

                     <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Entregador</label>
                        <select
                           className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                           value={selectedDriverId}
                           onChange={e => setSelectedDriverId(e.target.value)}
                        >
                           <option value="">Selecione...</option>
                           {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                     </div>

                     <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data do Acerto</label>
                        <input
                           type="date"
                           className="w-full border border-gray-300 rounded-lg p-2"
                           value={filterDate}
                           onChange={e => setFilterDate(e.target.value)}
                        />
                     </div>
                  </div>

                  {selectedDriverId && (
                     <div className={`p-6 rounded-xl text-white shadow-lg space-y-4 transition-colors ${pendingAmount > 0 ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-green-600'}`}>
                        <div>
                           <p className="text-white/80 text-sm font-medium mb-1">
                              {pendingAmount > 0 ? 'Pendente de Pagamento' : 'Tudo Pago!'}
                           </p>
                           <h3 className="text-4xl font-bold">R$ {pendingAmount > 0 ? pendingAmount.toFixed(2) : (totalFees + dailyRate).toFixed(2)}</h3>
                        </div>

                        <div className="bg-white/10 p-3 rounded-lg text-sm space-y-2">
                           <div className="flex justify-between">
                              <span>Comissões ({filteredDeliveries.length} entregas)</span>
                              <span className="font-mono">R$ {totalFees.toFixed(2)}</span>
                           </div>
                           <div className="flex justify-between text-white/80">
                              <span>+ Diária Fixa</span>
                              <span className="font-mono">R$ {dailyRate.toFixed(2)}</span>
                           </div>
                        </div>

                        {pendingAmount > 0 && (
                           <button
                              onClick={handleRegisterPayment}
                              className="w-full bg-white text-blue-700 font-bold py-3 rounded-lg hover:bg-blue-50 transition shadow-lg"
                           >
                              Registrar Pagamento
                           </button>
                        )}
                        {pendingAmount === 0 && filteredDeliveries.length > 0 && (
                           <div className="flex items-center justify-center gap-2 font-bold bg-white/20 py-2 rounded-lg">
                              <CheckCircle size={20} /> Acerto Realizado
                           </div>
                        )}
                     </div>
                  )}
               </div>

               <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-4">Detalhamento das Entregas</h3>
                  {filteredDeliveries.length === 0 ? (
                     <div className="text-center py-10 text-gray-400">
                        Nenhuma entrega encontrada para este filtro.
                     </div>
                  ) : (
                     <div className="overflow-auto max-h-[500px]">
                        <table className="w-full text-left text-sm">
                           <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                              <tr>
                                 <th className="p-3">Status</th>
                                 <th className="p-3">Hora</th>
                                 <th className="p-3">Pedido</th>
                                 <th className="p-3">Endereço</th>
                                 <th className="p-3 text-right">Taxa Motoboy</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100">
                              {filteredDeliveries.map(order => (
                                 <tr key={order.id} className={`hover:bg-gray-50 ${order.driverPaid ? 'bg-green-50/30' : ''}`}>
                                    <td className="p-3">
                                       {order.driverPaid ? (
                                          <span className="text-green-600 font-bold text-xs flex items-center gap-1"><CheckCircle size={14} /> PAGO</span>
                                       ) : (
                                          <span className="text-amber-600 font-bold text-xs flex items-center gap-1"><Clock size={14} /> PENDENTE</span>
                                       )}
                                    </td>
                                    <td className="p-3 text-gray-500">{new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td className="p-3 font-medium">#{order.id}</td>
                                    <td className="p-3 text-gray-600 truncate max-w-[200px]">{order.deliveryAddress}</td>
                                    <td className="p-3 text-right font-bold text-blue-600">+ R$ {(order.driverFee || 0).toFixed(2)}</td>
                                 </tr>
                              ))}
                           </tbody>
                           <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
                              <tr>
                                 <td colSpan={4} className="p-3 text-right">Subtotal das Entregas:</td>
                                 <td className="p-3 text-right text-indigo-600">R$ {totalFees.toFixed(2)}</td>
                              </tr>
                           </tfoot>
                        </table>
                     </div>
                  )}
               </div>
            </div>
         )}

         {/* CONFIRM DELETE MODAL */}
         {driverToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
               <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm">
                  <div className="flex flex-col items-center text-center mb-4">
                     <div className="bg-red-100 p-3 rounded-full text-red-600 mb-3">
                        <AlertTriangle size={32} />
                     </div>
                     <h3 className="text-xl font-bold text-gray-800">Excluir Entregador?</h3>
                     <p className="text-sm text-gray-500 mt-2">Os registros financeiros históricos permanecerão nos pedidos, mas o cadastro será removido.</p>
                  </div>
                  <div className="flex gap-3 mt-6">
                     <button onClick={() => setDriverToDelete(null)} className="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-medium transition">Cancelar</button>
                     <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition">Sim, excluir</button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};
