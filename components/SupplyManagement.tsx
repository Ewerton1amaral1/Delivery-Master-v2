import React, { useState } from 'react';
import { SupplyItem } from '../types';
import { Plus, Trash2, AlertTriangle, ShoppingCart, Printer, Copy, RefreshCw, Minus } from 'lucide-react';

interface SupplyManagementProps {
  supplies: SupplyItem[];
  setSupplies: React.Dispatch<React.SetStateAction<SupplyItem[]>>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const SupplyManagement: React.FC<SupplyManagementProps> = ({ supplies, setSupplies }) => {
  const [newItem, setNewItem] = useState<Partial<SupplyItem>>({ unit: 'un', quantity: 0, minQuantity: 5 });

  const handleAddItem = async () => {
    if (!newItem.name) return;

    try {
      const res = await fetch(`${API_URL}/api/supplies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newItem,
          unit: newItem.unit || 'un',
          quantity: Number(newItem.quantity) || 0,
          minQuantity: Number(newItem.minQuantity) || 0
        })
      });

      if (res.ok) {
        const saved = await res.json();
        setSupplies(prev => [...prev, saved]);
        setNewItem({ unit: 'un', quantity: 0, minQuantity: 5, name: '' });
      } else {
        alert("Erro ao adicionar item.");
      }
    } catch (e) {
      alert("Erro de conexão.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Remover este item do estoque?')) {
      try {
        const res = await fetch(`${API_URL}/api/supplies/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setSupplies(prev => prev.filter(s => s.id !== id));
        } else {
          alert("Erro ao excluir.");
        }
      } catch (e) {
        alert("Erro de conexão.");
      }
    }
  };

  const updateQuantity = async (id: string, delta: number) => {
    const item = supplies.find(s => s.id === id);
    if (!item) return;

    const newQtd = Math.max(0, item.quantity + delta);

    // Optimistic Update
    setSupplies(prev => prev.map(s => s.id === id ? { ...s, quantity: newQtd } : s));

    try {
      await fetch(`${API_URL}/api/supplies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQtd })
      });
    } catch (e) {
      console.error("Failed to update qty", e);
      // Could revert here if needed
    }
  };

  // Logic for Shopping List
  const shoppingList = supplies.filter(s => s.quantity < s.minQuantity);

  const handlePrintList = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Lista de Compras</title>
            <style>
              body { font-family: sans-serif; padding: 40px; }
              h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
              ul { list-style: none; padding: 0; }
              li { padding: 10px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; font-size: 18px; }
              .check { width: 20px; height: 20px; border: 2px solid #333; display: inline-block; margin-right: 15px; }
            </style>
          </head>
          <body>
            <h1>🛒 Lista de Compras</h1>
            <p>Gerado em: ${new Date().toLocaleDateString()}</p>
            <ul>
              ${shoppingList.map(item => `
                <li>
                  <span><span class="check"></span> ${item.name}</span>
                  <strong>Faltam: ${(item.minQuantity - item.quantity).toFixed(0)} ${item.unit}</strong>
                </li>
              `).join('')}
            </ul>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleCopyList = () => {
    const text = `🛒 *LISTA DE COMPRAS* - ${new Date().toLocaleDateString()}\n\n` +
      shoppingList.map(item => `- [ ] ${item.name}: Comprar +${(item.minQuantity - item.quantity)} ${item.unit}`).join('\n');

    navigator.clipboard.writeText(text).then(() => alert('Lista copiada para o WhatsApp!'));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">

      {/* Left: Inventory Management */}
      <div className="lg:col-span-2 space-y-6">

        {/* Add Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Plus size={20} className="text-indigo-600" /> Cadastrar Novo Insumo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Item</label>
              <input
                type="text"
                placeholder="Ex: Farinha de Trigo, Tomate..."
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newItem.name || ''}
                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                value={newItem.unit}
                onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
              >
                <option value="un">Unidade (un)</option>
                <option value="kg">Quilo (kg)</option>
                <option value="L">Litro (L)</option>
                <option value="pct">Pacote (pct)</option>
                <option value="cx">Caixa (cx)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mínimo Ideal</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg p-2"
                value={newItem.minQuantity}
                onChange={e => setNewItem({ ...newItem, minQuantity: parseFloat(e.target.value) })}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleAddItem}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition"
            >
              Adicionar ao Estoque
            </button>
          </div>
        </div>

        {/* Inventory List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-700">Insumos Cadastrados ({supplies.length})</h3>
          </div>

          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {supplies.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                Nenhum insumo cadastrado ainda.
              </div>
            ) : (
              supplies.map(item => {
                const isLow = item.quantity < item.minQuantity;
                return (
                  <div key={item.id} className={`p-4 flex items-center justify-between hover:bg-gray-50 transition ${isLow ? 'bg-red-50/50' : ''}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{item.name}</span>
                        {isLow && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <AlertTriangle size={10} /> Baixo
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">Mínimo: {item.minQuantity} {item.unit}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-gray-100 rounded text-gray-600"><Minus size={16} /></button>
                        <span className={`w-12 text-center font-mono font-bold ${isLow ? 'text-red-600' : 'text-gray-700'}`}>
                          {item.quantity}
                        </span>
                        <span className="text-xs text-gray-400 mr-1">{item.unit}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-gray-100 rounded text-green-600"><Plus size={16} /></button>
                      </div>

                      <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500 p-2">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right: Shopping List */}
      <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 h-fit sticky top-6 flex flex-col">
        <h3 className="text-xl font-bold text-indigo-900 mb-6 flex items-center gap-2">
          <ShoppingCart size={24} /> Lista de Compras
        </h3>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex-1 min-h-[300px]">
          {shoppingList.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center py-10">
              <div className="bg-green-100 p-3 rounded-full mb-3 text-green-600">
                <RefreshCw size={24} />
              </div>
              <p className="font-medium text-gray-600">Tudo certo!</p>
              <p className="text-sm">Nenhum item abaixo do estoque mínimo.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {shoppingList.map(item => (
                <li key={item.id} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0">
                  <span className="text-gray-700 font-medium">{item.name}</span>
                  <div className="text-right">
                    <span className="block text-red-600 font-bold text-sm">Falta: {(item.minQuantity - item.quantity).toFixed(0)} {item.unit}</span>
                    <span className="text-xs text-gray-400">Atual: {item.quantity}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={handlePrintList}
            disabled={shoppingList.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition disabled:opacity-50"
          >
            <Printer size={18} /> Imprimir Lista
          </button>
          <button
            onClick={handleCopyList}
            disabled={shoppingList.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition shadow-lg shadow-green-200 disabled:opacity-50"
          >
            <Copy size={18} /> Copiar para WhatsApp
          </button>
        </div>
      </div>

    </div>
  );
};