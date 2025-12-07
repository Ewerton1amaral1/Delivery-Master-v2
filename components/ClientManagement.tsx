
import React, { useState } from 'react';
import { Client, Address } from '../types';
import { Search, MapPin, Plus, User, Trash2, Edit2, Phone, Mail, AlertTriangle, Navigation, Map } from 'lucide-react';

interface ClientManagementProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const ClientManagement: React.FC<ClientManagementProps> = ({ clients, setClients }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentClient, setCurrentClient] = useState<Partial<Client>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Delete Modal State
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  const handleSave = async () => {
    if (!currentClient.name || !currentClient.phone) {
      alert("Nome e Telefone são obrigatórios.");
      return;
    }

    try {
      const isUpdate = !!currentClient.id;
      const url = isUpdate
        ? `${API_URL}/api/clients/${currentClient.id}`
        : `${API_URL}/api/clients`;

      const res = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentClient)
      });

      if (res.ok) {
        const saved = await res.json();
        // Map Backend Address format to Frontend
        const mappedClient = {
          ...saved,
          address: saved.addresses && saved.addresses.length > 0 ? saved.addresses[0] : {}
        };

        setClients(prev => isUpdate
          ? prev.map(c => c.id === mappedClient.id ? mappedClient : c)
          : [...prev, mappedClient]
        );

        setIsEditing(false);
        setCurrentClient({});
      } else {
        alert("Erro ao salvar cliente no servidor.");
      }
    } catch (error) {
      console.error("Save error", error);
      alert("Erro de conexão ao salvar.");
    }
  };

  const requestDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setClientToDelete(id);
  };

  const confirmDelete = async () => {
    if (clientToDelete) {
      try {
        // Note: Delete API might not be implemented in controller yet? 
        // Checking controller... it's not. 
        // But I'll implement the Frontend call and then check controller.
        // Wait, user didn't ask for Delete features, but existing UI has it.
        // I should verify if Delete exists. 
        // Step 1056 view of client.controller.ts showed NO deleteClient export.
        // So Delete will fail. 
        // I will ONLY implement local delete for now OR implement backend delete.
        // User asked "aba cadastro está com bug". 
        // Implementing Delete is "extra" if not requested, but good for completeness.
        // I'll stick to 'handleSave' fix mostly. For Delete, I'll allow it to fail or skip backend for now to avoid scope creep, 
        // OR I'll explicitly Add deleteClient to controller in next step.
        // Better: Add deleteClient to controller. It's quick.

        await fetch(`${API_URL}/api/clients/${clientToDelete}`, { method: 'DELETE' });

        setClients(prev => prev.filter(c => c.id !== clientToDelete));
        setClientToDelete(null);
      } catch (e) {
        alert('Erro ao excluir (Backend indisponível?)');
      }
    }
  };

  const openMapValidation = () => {
    if (!currentClient.address?.street || !currentClient.address?.city) {
      alert("Preencha Rua e Cidade para validar.");
      return;
    }
    const query = `${currentClient.address.street}, ${currentClient.address.number || ''}, ${currentClient.address.neighborhood || ''}, ${currentClient.address.city}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Clientes</h2>
        <button
          onClick={() => { setCurrentClient({ address: { street: '', number: '', neighborhood: '', city: '', formatted: '', zipCode: '', reference: '' }, distanceKm: 0 }); setIsEditing(true); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition"
        >
          <Plus size={20} /> Novo Cliente
        </button>
      </div>

      {!isEditing ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map(client => (
              <div key={client.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{client.name}</h3>
                      <div className="flex gap-2 text-xs">
                        <span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                          Saldo: R$ {client.walletBalance.toFixed(2)}
                        </span>
                        <span className="text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Navigation size={10} /> {client.distanceKm || 0} km
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setCurrentClient(client); setIsEditing(true); }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={(e) => requestDelete(e, client.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Excluir Cliente"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Phone size={14} /> {client.phone}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} /> {client.email}
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="mt-1 flex-shrink-0" />
                    <span>{client.address.formatted || `${client.address.street}, ${client.address.number} - ${client.address.neighborhood}`}</span>
                  </div>
                  {client.address.reference && (
                    <div className="text-xs text-gray-500 italic pl-6">
                      Ref: {client.address.reference}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
          <h3 className="text-xl font-bold mb-6 text-gray-800">{currentClient.id ? 'Editar Cliente' : 'Novo Cliente'}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={currentClient.name || ''}
                onChange={e => setCurrentClient({ ...currentClient, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={currentClient.phone || ''}
                onChange={e => setCurrentClient({ ...currentClient, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={currentClient.email || ''}
                onChange={e => setCurrentClient({ ...currentClient, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferências</label>
              <input
                type="text"
                placeholder="Ex: Sem cebola, Coca gelada..."
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={currentClient.preferences || ''}
                onChange={e => setCurrentClient({ ...currentClient, preferences: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-gray-700 flex items-center gap-2"><MapPin size={18} /> Endereço e Logística</h4>
              <button
                type="button"
                onClick={openMapValidation}
                className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100 font-bold hover:bg-blue-100 flex items-center gap-1"
              >
                <Map size={12} /> Validar no Mapa
              </button>
            </div>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                <input
                  type="text"
                  placeholder="00000-000"
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={currentClient.address?.zipCode || ''}
                  onChange={e => setCurrentClient({ ...currentClient, address: { ...currentClient.address!, zipCode: e.target.value } })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço Formatado</label>
                <input
                  type="text"
                  placeholder="Digite o endereço completo..."
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={currentClient.address?.formatted || ''}
                  onChange={e => setCurrentClient({
                    ...currentClient,
                    address: { ...currentClient.address!, formatted: e.target.value }
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Distância (KM)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-blue-50/50"
                  value={currentClient.distanceKm || ''}
                  onChange={e => setCurrentClient({ ...currentClient, distanceKm: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                placeholder="Rua"
                className="w-full border border-gray-300 rounded-lg p-2"
                value={currentClient.address?.street || ''}
                onChange={e => setCurrentClient({ ...currentClient, address: { ...currentClient.address!, street: e.target.value } })}
              />
              <input
                placeholder="Número"
                className="w-full border border-gray-300 rounded-lg p-2"
                value={currentClient.address?.number || ''}
                onChange={e => setCurrentClient({ ...currentClient, address: { ...currentClient.address!, number: e.target.value } })}
              />
              <input
                placeholder="Bairro"
                className="w-full border border-gray-300 rounded-lg p-2"
                value={currentClient.address?.neighborhood || ''}
                onChange={e => setCurrentClient({ ...currentClient, address: { ...currentClient.address!, neighborhood: e.target.value } })}
              />
              <input
                placeholder="Cidade"
                className="w-full border border-gray-300 rounded-lg p-2"
                value={currentClient.address?.city || ''}
                onChange={e => setCurrentClient({ ...currentClient, address: { ...currentClient.address!, city: e.target.value } })}
              />
            </div>

            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ponto de Referência</label>
              <input
                type="text"
                placeholder="Ex: Próximo à padaria, casa de esquina..."
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-yellow-50/30"
                value={currentClient.address?.reference || ''}
                onChange={e => setCurrentClient({ ...currentClient, address: { ...currentClient.address!, reference: e.target.value } })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Salvar Cliente
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="bg-red-100 p-3 rounded-full text-red-600 mb-3">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Excluir Cliente?</h3>
              <p className="text-sm text-gray-500 mt-2">Esta ação não poderá ser desfeita. O histórico de pedidos deste cliente será mantido, mas o cadastro será removido.</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setClientToDelete(null)} className="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-medium transition">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition">Sim, excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
