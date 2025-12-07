
import React, { useState, useEffect } from 'react';
import { StoreAccount, StoreSettings } from '../types';
import { Search, ShoppingBag, ArrowRight, MapPin, Star, Store, Utensils, UtensilsCrossed, Clock, ChefHat, Bike } from 'lucide-react';

interface StoreSelectorProps {
  onSelectStore: (storeId: string) => void;
  onBackToLogin: () => void;
}

export const StoreSelector: React.FC<StoreSelectorProps> = ({ onSelectStore, onBackToLogin }) => {
  const [stores, setStores] = useState<StoreAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Load stores from SaaS accounts
    const accountsStr = localStorage.getItem('dm_accounts');
    if (accountsStr) {
      const accounts: StoreAccount[] = JSON.parse(accountsStr);
      // Only active stores
      setStores(accounts.filter(a => a.isActive));
    } else {
        // Fallback for demo if no accounts exist
        setStores([{ 
            id: 'demo_store', 
            name: 'Loja Demonstração', 
            username: 'demo', 
            password: '93342325Al@', 
            isActive: true, 
            createdAt: new Date().toISOString() 
        }]);
    }
  }, []);

  // Helper to get store specific settings (like logo)
  const getStoreLogo = (storeId: string) => {
      const settingsStr = localStorage.getItem(`dm_${storeId}_settings`);
      if (settingsStr) {
          const settings: StoreSettings = JSON.parse(settingsStr);
          return settings.logoUrl;
      }
      return null;
  };
  
  const getStoreAddress = (storeId: string) => {
      const settingsStr = localStorage.getItem(`dm_${storeId}_settings`);
      if (settingsStr) {
          const settings: StoreSettings = JSON.parse(settingsStr);
          return settings.address;
      }
      return null;
  };

  const filteredStores = stores.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* HERO SECTION */}
      <div className="relative bg-gray-900 h-[280px] md:h-[350px] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
         {/* Abstract Background */}
         <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1974&auto=format&fit=crop')] bg-cover bg-center"></div>
         <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-black/50"></div>
         
         <div className="relative z-10 animate-in fade-in zoom-in duration-700">
             <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-indigo-500/30 transform rotate-3">
                 <Bike size={32} />
             </div>
             <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-2">
                 Bateu a fome?
             </h1>
             <p className="text-gray-300 text-sm md:text-lg max-w-lg mx-auto">
                 Descubra os melhores restaurantes e faça seu pedido em poucos cliques.
             </p>
         </div>

         <div className="absolute top-4 right-4 z-20">
             <button onClick={onBackToLogin} className="text-xs md:text-sm text-white/70 hover:text-white font-medium border border-white/20 px-4 py-2 rounded-full hover:bg-white/10 transition">
                 Sou Lojista / Login
             </button>
         </div>
      </div>

      {/* SEARCH BAR (Floating) */}
      <div className="px-4 -mt-7 relative z-20 w-full max-w-2xl mx-auto">
         <div className="relative group">
            <div className="absolute inset-0 bg-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition"></div>
            <div className="relative bg-white rounded-2xl shadow-xl flex items-center p-2">
                <Search className="text-gray-400 ml-3" size={24} />
                <input 
                  type="text" 
                  placeholder="Buscar restaurante por nome..." 
                  className="w-full p-3 md:p-4 text-gray-700 text-base md:text-lg outline-none bg-transparent placeholder-gray-400"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
         </div>
      </div>

      {/* STORES GRID */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 mt-4">
         
         <div className="flex items-center gap-2 mb-6 text-gray-800">
            <Store size={20} className="text-indigo-600"/>
            <h2 className="text-xl font-bold">Restaurantes Disponíveis</h2>
            <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">{filteredStores.length}</span>
         </div>

         {filteredStores.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                 <Utensils size={48} className="mx-auto text-gray-300 mb-4" />
                 <h3 className="text-lg font-bold text-gray-800">Nenhum restaurante encontrado</h3>
                 <p className="text-gray-500">Tente buscar por outro nome.</p>
             </div>
         ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredStores.map(store => {
                    const logo = getStoreLogo(store.id);
                    const address = getStoreAddress(store.id);
                    const rating = (4.0 + Math.random()).toFixed(1); // Simulação de nota

                    return (
                        <button 
                            key={store.id}
                            onClick={() => onSelectStore(store.id)}
                            className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col text-left h-full"
                        >
                            {/* Card Header / Cover */}
                            <div className="h-32 bg-gray-100 relative overflow-hidden">
                                {logo ? (
                                    <>
                                       <div className="absolute inset-0 bg-cover bg-center blur-sm opacity-50" style={{backgroundImage: `url(${logo})`}}></div>
                                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                    </>
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600"></div>
                                )}
                                
                                <div className="absolute bottom-3 left-3 flex items-end">
                                    <div className="w-16 h-16 rounded-xl bg-white p-1 shadow-md">
                                        {logo ? (
                                            <img src={logo} alt={store.name} className="w-full h-full object-cover rounded-lg" />
                                        ) : (
                                            <div className="w-full h-full bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500">
                                                <Store size={24} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-gray-800 flex items-center gap-1 shadow-sm">
                                    <Clock size={12} className="text-green-600"/> 30-45 min
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-4 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-lg text-gray-800 group-hover:text-indigo-600 transition line-clamp-1 pr-2">
                                        {store.name}
                                    </h3>
                                    <div className="flex items-center gap-1 text-xs font-bold bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-100">
                                        <Star size={10} fill="currentColor" /> {rating}
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Aberto agora
                                        <span className="mx-1 text-gray-300">|</span>
                                        Lanches • Bebidas
                                    </p>
                                    {address && (
                                        <p className="text-xs text-gray-400 flex items-start gap-1 line-clamp-2 leading-relaxed">
                                            <MapPin size={12} className="mt-0.5 flex-shrink-0" /> {address}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between text-indigo-600 text-sm font-bold group-hover:underline decoration-2 underline-offset-4">
                                    <span>Ver Cardápio</span>
                                    <ArrowRight size={16} className="transform group-hover:translate-x-1 transition" />
                                </div>
                            </div>
                        </button>
                    );
                })}
             </div>
         )}
      </main>
      
      <footer className="bg-white border-t border-gray-100 py-8 text-center mt-auto">
          <p className="text-sm font-bold text-gray-800 flex items-center justify-center gap-2 mb-2">
              <Bike size={16} className="text-indigo-600"/> DeliveryMaster
          </p>
          <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} Plataforma de Pedidos. Todos os direitos reservados.
          </p>
      </footer>
    </div>
  );
};
