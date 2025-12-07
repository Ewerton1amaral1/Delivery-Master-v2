import React, { useState, useEffect } from 'react';
import { StoreAccount } from '../types';
import { Users, Plus, Trash2, Power, LogOut, Search, Store } from 'lucide-react';

interface AdminPanelProps {
  onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
  const [accounts, setAccounts] = useState<StoreAccount[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('dm_accounts');
    if (saved) {
      setAccounts(JSON.parse(saved));
    }
  }, []);

  const saveAccounts = (updated: StoreAccount[]) => {
    setAccounts(updated);
    localStorage.setItem('dm_accounts', JSON.stringify(updated));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newAccount: StoreAccount = {
      id: `store_${Date.now()}`,
      name: newName,
      username: newUsername,
      password: newPassword,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    saveAccounts([...accounts, newAccount]);
    setIsCreating(false);
    setNewName('');
    setNewUsername('');
    setNewPassword('');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza? Isso apagará o acesso da loja, mas os dados (pedidos) permanecerão no banco de dados ocultos.')) {
      saveAccounts(accounts.filter(a => a.id !== id));
    }
  };

  const toggleStatus = (id: string) => {
    saveAccounts(accounts.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-gray-900 p-2 rounded-lg text-white">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Painel do Administrador</h1>
            <p className="text-xs text-gray-500">Gestão de Lojas e Acessos</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 text-gray-600 hover:text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition"
        >
          <LogOut size={18} /> Sair
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-8">
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 font-bold uppercase">Total de Lojas</p>
            <p className="text-3xl font-bold text-indigo-600">{accounts.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 font-bold uppercase">Lojas Ativas</p>
            <p className="text-3xl font-bold text-green-600">{accounts.filter(a => a.isActive).length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 font-bold uppercase">Lojas Bloqueadas</p>
            <p className="text-3xl font-bold text-red-500">{accounts.filter(a => !a.isActive).length}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Store size={20} /> Lojas Cadastradas
          </h2>
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-lg shadow-indigo-200"
          >
            <Plus size={20} /> Nova Loja
          </button>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Nome da Loja</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Usuário de Acesso</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Criado em</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">Nenhuma loja cadastrada. Crie a primeira!</td>
                </tr>
              ) : (
                accounts.map(account => (
                  <tr key={account.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-800">{account.name}</td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-sm">{account.username}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${account.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {account.isActive ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{new Date(account.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button 
                        onClick={() => toggleStatus(account.id)}
                        className={`p-2 rounded hover:bg-gray-200 ${account.isActive ? 'text-green-600' : 'text-gray-400'}`}
                        title={account.isActive ? "Bloquear Acesso" : "Ativar Acesso"}
                      >
                        <Power size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(account.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Nova Loja</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Estabelecimento</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuário para Login</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha Inicial</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold"
                >
                  Criar Loja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};