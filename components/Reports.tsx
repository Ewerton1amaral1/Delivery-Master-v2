
import React, { useState, useMemo } from 'react';
import { Order, OrderStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { Calendar, Clock, Package, Filter, ChevronDown, TrendingUp, DollarSign, List, Search, FileText } from 'lucide-react';

interface ReportsProps {
  orders: Order[];
}

export const Reports: React.FC<ReportsProps> = ({ orders }) => {
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  // View Control
  const [activeTab, setActiveTab] = useState<'charts' | 'list'>('charts');
  const [reportType, setReportType] = useState<'products' | 'hourly' | 'weekly'>('products');
  
  // Search State for List View
  const [searchTerm, setSearchTerm] = useState('');

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const orderDate = o.createdAt.split('T')[0];
      return orderDate >= startDate && orderDate <= endDate && o.status !== OrderStatus.CANCELLED;
    });
  }, [orders, startDate, endDate]);

  // --- AGGREGATION LOGIC ---

  // 1. By Product
  const productData = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const key = item.productName;
        const current = map.get(key) || { name: key, quantity: 0, revenue: 0 };
        map.set(key, {
          name: key,
          quantity: current.quantity + item.quantity,
          revenue: current.revenue + (item.unitPrice * item.quantity)
        });
      });
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  // 2. By Hour of Day
  const hourlyData = useMemo(() => {
    const hours = Array(24).fill(0).map((_, i) => ({ hour: `${i}h`, orders: 0, revenue: 0 }));
    filteredOrders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hours[hour].orders += 1;
      hours[hour].revenue += order.total;
    });
    return hours;
  }, [filteredOrders]);

  // 3. By Day of Week
  const weeklyData = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const data = days.map(d => ({ day: d, orders: 0, revenue: 0 }));
    filteredOrders.forEach(order => {
      const dayIndex = new Date(order.createdAt).getDay();
      data[dayIndex].orders += 1;
      data[dayIndex].revenue += order.total;
    });
    return data;
  }, [filteredOrders]);

  // --- LIST SEARCH LOGIC ---
  const tableData = useMemo(() => {
    if (!searchTerm) return filteredOrders;
    const lowerTerm = searchTerm.toLowerCase();
    return filteredOrders.filter(o => 
      o.clientName.toLowerCase().includes(lowerTerm) || 
      o.id.includes(lowerTerm) ||
      o.deliveryAddress.toLowerCase().includes(lowerTerm)
    );
  }, [filteredOrders, searchTerm]);

  const totalRevenuePeriod = filteredOrders.reduce((acc, o) => acc + o.total, 0);

  // Status Badge Helper
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.COMPLETED: return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Concluído</span>;
      case OrderStatus.CANCELLED: return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">Cancelado</span>;
      default: return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in h-full flex flex-col">
      
      {/* Header & Controls */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Filter size={20} className="text-indigo-600"/> Filtros do Relatório
          </h2>
          <p className="text-sm text-gray-500">Analise o desempenho em períodos específicos.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
            <Calendar size={16} className="text-gray-500"/>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="bg-transparent text-sm outline-none text-gray-700"
            />
            <span className="text-gray-400">-</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent text-sm outline-none text-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-gray-200">
         <button 
           onClick={() => setActiveTab('charts')}
           className={`px-6 py-3 font-medium text-sm transition border-b-2 ${activeTab === 'charts' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
         >
           <div className="flex items-center gap-2"><TrendingUp size={16}/> Análise Gráfica</div>
         </button>
         <button 
           onClick={() => setActiveTab('list')}
           className={`px-6 py-3 font-medium text-sm transition border-b-2 ${activeTab === 'list' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
         >
           <div className="flex items-center gap-2"><List size={16}/> Histórico Detalhado</div>
         </button>
      </div>

      {/* --- CHARTS VIEW --- */}
      {activeTab === 'charts' && (
        <>
            {/* Report Type Sub-Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                onClick={() => setReportType('products')}
                className={`p-4 rounded-xl border transition flex items-center justify-between group ${reportType === 'products' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-gray-100 text-gray-600 hover:border-indigo-300'}`}
                >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${reportType === 'products' ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
                        <Package size={24} />
                    </div>
                    <div className="text-left">
                    <span className="block font-bold text-sm">Por Produto</span>
                    <span className="text-xs opacity-80">Itens mais vendidos</span>
                    </div>
                </div>
                {reportType === 'products' && <ChevronDown className="rotate-90 md:rotate-0" />}
                </button>

                <button 
                onClick={() => setReportType('hourly')}
                className={`p-4 rounded-xl border transition flex items-center justify-between group ${reportType === 'hourly' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-gray-100 text-gray-600 hover:border-indigo-300'}`}
                >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${reportType === 'hourly' ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
                        <Clock size={24} />
                    </div>
                    <div className="text-left">
                    <span className="block font-bold text-sm">Por Horário</span>
                    <span className="text-xs opacity-80">Picos de atendimento</span>
                    </div>
                </div>
                {reportType === 'hourly' && <ChevronDown className="rotate-90 md:rotate-0" />}
                </button>

                <button 
                onClick={() => setReportType('weekly')}
                className={`p-4 rounded-xl border transition flex items-center justify-between group ${reportType === 'weekly' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-gray-100 text-gray-600 hover:border-indigo-300'}`}
                >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${reportType === 'weekly' ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
                        <Calendar size={24} />
                    </div>
                    <div className="text-left">
                    <span className="block font-bold text-sm">Dia da Semana</span>
                    <span className="text-xs opacity-80">Melhores dias</span>
                    </div>
                </div>
                {reportType === 'weekly' && <ChevronDown className="rotate-90 md:rotate-0" />}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Chart Area */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <TrendingUp size={20} className="text-green-500"/>
                    {reportType === 'products' && 'Top 10 Produtos (Receita)'}
                    {reportType === 'hourly' && 'Fluxo de Vendas por Horário'}
                    {reportType === 'weekly' && 'Performance por Dia da Semana'}
                </h3>

                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        {reportType === 'products' ? (
                        <BarChart data={productData.slice(0, 10)} layout="vertical" margin={{ left: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                            <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} cursor={{fill: '#f9fafb'}} />
                            <Bar dataKey="revenue" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                        ) : reportType === 'hourly' ? (
                        <AreaChart data={hourlyData}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="hour" tick={{fontSize: 12}} interval={2}/>
                            <YAxis tickLine={false} axisLine={false} />
                            <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Faturamento']} />
                            <Area type="monotone" dataKey="revenue" stroke="#4f46e5" fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                        ) : (
                        <BarChart data={weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="day" tick={{fontSize: 14, fontWeight: 'bold'}} />
                            <YAxis tickLine={false} axisLine={false} />
                            <Tooltip cursor={{fill: '#f9fafb'}} formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                            <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
                </div>

                {/* Summary Side Panel */}
                <div className="space-y-6">
                {/* KPI Card */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-xl text-white shadow-lg shadow-indigo-200">
                    <p className="text-indigo-100 text-sm font-medium mb-1">Faturamento no Período</p>
                    <h3 className="text-3xl font-bold flex items-center gap-2">
                        <DollarSign size={24} className="text-indigo-200"/>
                        R$ {totalRevenuePeriod.toFixed(2)}
                    </h3>
                    <p className="text-xs text-indigo-200 mt-2">
                        {filteredOrders.length} pedidos realizados
                    </p>
                </div>

                {/* Detailed List */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 max-h-[300px] overflow-y-auto custom-scrollbar">
                    <h4 className="font-bold text-gray-700 text-sm mb-3 sticky top-0 bg-white pb-2 border-b">Detalhamento</h4>
                    
                    {reportType === 'products' && (
                        <div className="space-y-3">
                        {productData.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">{idx + 1}</span>
                                <span className="text-gray-700 truncate max-w-[120px]" title={item.name}>{item.name}</span>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-indigo-600">R$ {item.revenue.toFixed(0)}</span>
                                <span className="text-xs text-gray-400">{item.quantity} un</span>
                            </div>
                            </div>
                        ))}
                        </div>
                    )}

                    {reportType === 'hourly' && (
                        <div className="space-y-2">
                        {hourlyData.filter(h => h.orders > 0).map((h, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded">
                                <span className="font-bold text-gray-700 flex items-center gap-2"><Clock size={14}/> {h.hour}</span>
                                <span className="text-indigo-600 font-medium">R$ {h.revenue.toFixed(2)}</span>
                            </div>
                        ))}
                        {hourlyData.filter(h => h.orders > 0).length === 0 && <p className="text-gray-400 text-xs">Sem dados no período.</p>}
                        </div>
                    )}

                    {reportType === 'weekly' && (
                        <div className="space-y-2">
                            {weeklyData.map((d, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded border-b border-gray-50 last:border-0">
                                <span className="font-bold text-gray-700 w-10">{d.day}</span>
                                <div className="flex-1 mx-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${totalRevenuePeriod > 0 ? (d.revenue / totalRevenuePeriod) * 100 : 0}%` }}></div>
                                </div>
                                <span className="text-green-700 font-medium text-xs">R$ {d.revenue.toFixed(0)}</span>
                            </div>
                            ))}
                        </div>
                    )}
                </div>
                </div>

            </div>
        </>
      )}

      {/* --- LIST VIEW --- */}
      {activeTab === 'list' && (
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Search Bar */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nome, endereço ou ID do pedido..." 
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-500">Total Listado</p>
                    <p className="text-lg font-bold text-indigo-600">R$ {tableData.reduce((acc, o) => acc + o.total, 0).toFixed(2)}</p>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 font-semibold text-gray-600">ID</th>
                            <th className="px-6 py-3 font-semibold text-gray-600">Data/Hora</th>
                            <th className="px-6 py-3 font-semibold text-gray-600">Cliente</th>
                            <th className="px-6 py-3 font-semibold text-gray-600">Endereço</th>
                            <th className="px-6 py-3 font-semibold text-gray-600">Itens</th>
                            <th className="px-6 py-3 font-semibold text-gray-600 text-center">Status</th>
                            <th className="px-6 py-3 font-semibold text-gray-600 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tableData.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-gray-400 flex flex-col items-center justify-center">
                                    <FileText size={48} className="mb-2 opacity-20"/>
                                    <p>Nenhum pedido encontrado para o filtro selecionado.</p>
                                </td>
                            </tr>
                        ) : (
                            tableData.map(order => (
                                <tr key={order.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 font-bold text-gray-800">#{order.id}</td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {new Date(order.createdAt).toLocaleDateString()} <br/>
                                        <span className="text-xs">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-800">{order.clientName}</div>
                                        <div className="text-xs text-gray-500">{order.clientPhone}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 truncate max-w-[200px]" title={order.deliveryAddress}>
                                        {order.deliveryAddress}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 text-xs">
                                        {order.items.length} itens <br/>
                                        <span className="text-gray-400 italic">
                                            {order.items[0]?.productName} {order.items.length > 1 ? `+${order.items.length - 1}` : ''}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {getStatusBadge(order.status)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-indigo-600">
                                        R$ {order.total.toFixed(2)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

    </div>
  );
};
