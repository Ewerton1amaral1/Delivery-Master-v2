
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Order, OrderStatus } from '../types';
import { TrendingUp, DollarSign, ShoppingBag, Calendar, Trophy, Bike, Wallet } from 'lucide-react';

interface DashboardProps {
  orders: Order[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const Dashboard: React.FC<DashboardProps> = ({ orders }) => {
  // Date Filter State
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Stats Calculations (Overall)
  // Filter out cancelled orders for financial stats
  const validOrders = orders.filter(o => o.status !== OrderStatus.CANCELLED);

  const totalRevenue = validOrders.reduce((acc, order) => acc + order.total, 0);
  const totalOrders = validOrders.length;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // NEW: Total Driver Cost (Sum of driverFee)
  const totalDriverCost = validOrders.reduce((acc, order) => acc + (order.driverFee || 0), 0);
  
  // Daily Stats Calculation
  const dailyOrders = validOrders.filter(o => o.createdAt.startsWith(selectedDate));
  const dailyRevenue = dailyOrders.reduce((acc, o) => acc + o.total, 0);
  const dailyDriverCost = dailyOrders.reduce((acc, o) => acc + (o.driverFee || 0), 0);

  // Best Clients Logic
  const clientMap = new Map<string, {name: string, count: number, total: number}>();
  validOrders.forEach(order => {
      const current = clientMap.get(order.clientId) || { name: order.clientName, count: 0, total: 0 };
      clientMap.set(order.clientId, {
          name: order.clientName,
          count: current.count + 1,
          total: current.total + order.total
      });
  });
  const topClients = Array.from(clientMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

  // Status Distribution for Pie Chart
  const statusData = Object.values(OrderStatus).map(status => ({
    name: status,
    value: orders.filter(o => o.status === status).length
  })).filter(d => d.value > 0);

  // Monthly Revenue Chart Data (Group by Day)
  const currentMonth = new Date().getMonth();
  const salesByDate = validOrders
    .filter(o => new Date(o.createdAt).getMonth() === currentMonth)
    .reduce((acc: any, order) => {
        const day = new Date(order.createdAt).getDate();
        acc[day] = (acc[day] || 0) + order.total;
        return acc;
    }, {});

  const barData = Object.keys(salesByDate).map(day => ({
    date: `Dia ${day}`,
    revenue: salesByDate[day]
  })).sort((a, b) => parseInt(a.date.split(' ')[1]) - parseInt(b.date.split(' ')[1]));

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat Cards */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between transition-colors">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Receita Total</p>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">R$ {totalRevenue.toFixed(2)}</h3>
          </div>
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
            <DollarSign size={24} />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between transition-colors">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Pedidos</p>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{totalOrders}</h3>
          </div>
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
            <ShoppingBag size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between transition-colors">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Custo Entregadores</p>
            <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">R$ {totalDriverCost.toFixed(2)}</h3>
            <p className="text-xs text-gray-400">Total acumulado</p>
          </div>
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
            <Bike size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between transition-colors">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Ticket Médio</p>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">R$ {avgTicket.toFixed(2)}</h3>
          </div>
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* Date Filter & Daily Stats */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <Calendar size={20} className="text-indigo-600 dark:text-indigo-400"/> Resumo Diário
              </h3>
              <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
               <div className="flex items-center gap-4 border-r border-gray-200 dark:border-gray-600 last:border-0 pr-4">
                   <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-full text-indigo-600 dark:text-indigo-400"><DollarSign size={20}/></div>
                   <div>
                       <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Faturamento</p>
                       <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">R$ {dailyRevenue.toFixed(2)}</p>
                   </div>
               </div>
               <div className="flex items-center gap-4 border-r border-gray-200 dark:border-gray-600 last:border-0 pr-4">
                   <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-full text-red-600 dark:text-red-400"><Bike size={20}/></div>
                   <div>
                       <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Pago a Entregadores</p>
                       <p className="text-xl font-bold text-red-600 dark:text-red-400">R$ {dailyDriverCost.toFixed(2)}</p>
                   </div>
               </div>
               <div className="flex items-center gap-4">
                   <div className="p-2 bg-gray-200 dark:bg-gray-600 rounded-full text-gray-600 dark:text-gray-300"><ShoppingBag size={20}/></div>
                   <div>
                       <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Pedidos do Dia</p>
                       <p className="text-xl font-bold text-gray-700 dark:text-gray-200">{dailyOrders.length}</p>
                   </div>
               </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Faturamento Mensal (Por Dia)</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} interval={0} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}}/>
                    <Tooltip 
                      cursor={{fill: '#1f2937'}} 
                      contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff'}}
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']}
                    />
                    <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
                </ResponsiveContainer>
            </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Status dos Pedidos (Geral)</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    >
                    {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    </Pie>
                    <Tooltip contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff'}} />
                    <Legend />
                </PieChart>
                </ResponsiveContainer>
            </div>
            </div>
        </div>

        {/* Top Clients */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-fit transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                <Trophy size={20} className="text-amber-500"/> Melhores Clientes
            </h3>
            <div className="space-y-4">
                {topClients.length === 0 ? (
                    <p className="text-gray-400 text-sm">Sem dados suficientes.</p>
                ) : (
                    topClients.map((client, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b border-gray-50 dark:border-gray-700 pb-2 last:border-0">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                    {idx + 1}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{client.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{client.count} pedidos</p>
                                </div>
                            </div>
                            <span className="text-sm font-mono font-medium text-indigo-600 dark:text-indigo-400">R$ {client.total.toFixed(0)}</span>
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>
    </div>
  );
};
