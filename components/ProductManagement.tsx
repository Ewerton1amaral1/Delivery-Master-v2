
import React, { useState } from 'react';
import { Product, ProductCategory } from '../types';
import { Plus, Edit2, Trash2, Tag, Image as ImageIcon, AlertTriangle } from 'lucide-react';

interface ProductManagementProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const ProductManagement: React.FC<ProductManagementProps> = ({ products, setProducts }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
  const [filterCat, setFilterCat] = useState<string>('All');

  // Delete Modal State
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const handleSave = async () => {
    if (!currentProduct.name || !currentProduct.price) return;

    try {
      if (currentProduct.id) {
        // UPDATE
        await fetch(`${API_URL}/api/products/${currentProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentProduct)
        });
        setProducts(prev => prev.map(p => p.id === currentProduct.id ? currentProduct as Product : p));
      } else {
        // CREATE
        const res = await fetch(`${API_URL}/api/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...currentProduct,
            imageUrl: currentProduct.imageUrl || `https://picsum.photos/200/200?random=${Date.now()}`
          })
        });
        const newProduct = await res.json();

        // If backend returned the created product, use it (it has the correct DB ID)
        setProducts(prev => [...prev, newProduct]);
      }
      setIsEditing(false);
      setCurrentProduct({});
    } catch (error) {
      console.error('Failed to save product', error);
      alert('Erro ao salvar produto no servidor.');
    }
  };

  const requestDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setProductToDelete(id);
  };

  const confirmDelete = async () => {
    if (productToDelete) {
      try {
        await fetch(`${API_URL}/api/products/${productToDelete}`, {
          method: 'DELETE'
        });
        setProducts(prev => prev.filter(p => p.id !== productToDelete));
        setProductToDelete(null);
      } catch (error) {
        console.error('Failed to delete', error);
        alert('Erro ao excluir produto.');
      }
    }
  };

  const filtered = filterCat === 'All' ? products : products.filter(p => p.category === filterCat);

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Cardápio e Estoque</h2>
        <button
          onClick={() => { setCurrentProduct({ category: ProductCategory.SNACK, ingredients: [] }); setIsEditing(true); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition"
        >
          <Plus size={20} /> Novo Produto
        </button>
      </div>

      {!isEditing ? (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button onClick={() => setFilterCat('All')} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${filterCat === 'All' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Todos</button>
            {Object.values(ProductCategory).map(cat => (
              <button key={cat} onClick={() => setFilterCat(cat)} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${filterCat === cat ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{cat}</button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filtered.map(product => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-lg transition group">
                <div className="h-40 overflow-hidden relative">
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-xs font-bold text-gray-800 shadow-sm">
                    Estoque: {product.stock}
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800 line-clamp-1">{product.name}</h3>
                    <span className="text-indigo-600 font-bold whitespace-nowrap">R$ {product.price.toFixed(2)}</span>
                  </div>
                  <p className="text-gray-500 text-xs line-clamp-2 mb-3 flex-1">{product.description}</p>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-50 mt-auto">
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{product.category}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setCurrentProduct(product); setIsEditing(true); }}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={(e) => requestDelete(e, product.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition"
                        title="Excluir Produto"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
          <h3 className="text-xl font-bold mb-6 text-gray-800">{currentProduct.id ? 'Editar Produto' : 'Novo Produto'}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={currentProduct.name || ''}
                onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                value={currentProduct.category}
                onChange={e => setCurrentProduct({ ...currentProduct, category: e.target.value as ProductCategory })}
              >
                {Object.values(ProductCategory).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
              <input
                type="number"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={currentProduct.price || ''}
                onChange={e => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estoque</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={currentProduct.stock || ''}
                onChange={e => setCurrentProduct({ ...currentProduct, stock: parseInt(e.target.value) })}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ingredientes (separar por vírgula)</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={currentProduct.ingredients?.join(', ') || ''}
                onChange={e => setCurrentProduct({ ...currentProduct, ingredients: e.target.value.split(',').map(s => s.trim()) })}
              />
            </div>

            <div className="col-span-2">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
              </div>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                value={currentProduct.description || ''}
                onChange={e => setCurrentProduct({ ...currentProduct, description: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">URL da Imagem</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={currentProduct.imageUrl || ''}
                  onChange={e => setCurrentProduct({ ...currentProduct, imageUrl: e.target.value })}
                  placeholder="https://..."
                />
                {currentProduct.imageUrl && (
                  <img src={currentProduct.imageUrl} alt="Preview" className="w-10 h-10 rounded object-cover border" />
                )}
              </div>
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
              Salvar Produto
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="bg-red-100 p-3 rounded-full text-red-600 mb-3">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Excluir Produto?</h3>
              <p className="text-sm text-gray-500 mt-2">O produto será removido permanentemente do cardápio. Esta ação não pode ser desfeita.</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setProductToDelete(null)} className="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-medium transition">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition">Sim, excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
