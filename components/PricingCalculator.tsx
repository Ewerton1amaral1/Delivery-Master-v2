import React, { useState } from 'react';
import { Plus, Trash2, Calculator, AlertCircle, PieChart as PieIcon, DollarSign } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface IngredientCost {
  id: string;
  name: string;
  cost: number;
}

export const PricingCalculator: React.FC = () => {
  // Inputs
  const [productName, setProductName] = useState('');
  const [ingredients, setIngredients] = useState<IngredientCost[]>([]);
  const [packagingCost, setPackagingCost] = useState<number>(0);
  const [fixedCostPerc, setFixedCostPerc] = useState<number>(10); // Rent, electricity, etc.
  const [platformFeePerc, setPlatformFeePerc] = useState<number>(12); // iFood, Card fees
  const [profitMarginPerc, setProfitMarginPerc] = useState<number>(20); // Desired net profit
  
  // Temp ingredient inputs
  const [tempIngName, setTempIngName] = useState('');
  const [tempIngCost, setTempIngCost] = useState('');

  // Calculations
  const totalIngredients = ingredients.reduce((acc, curr) => acc + curr.cost, 0);
  const totalDirectCost = totalIngredients + packagingCost;
  
  // Formula: Price = DirectCost / (1 - (Fixed% + Platform% + Profit%) / 100)
  // This is the "Markup on Sales" method, ensuring the % is taken from the final price, not added to cost.
  const totalPercBurdens = fixedCostPerc + platformFeePerc + profitMarginPerc;
  const divisor = 1 - (totalPercBurdens / 100);
  
  let suggestedPrice = 0;
  let isRisky = false;

  if (divisor <= 0) {
    suggestedPrice = 0;
    isRisky = true;
  } else {
    suggestedPrice = totalDirectCost / divisor;
  }

  // Breakdown for Chart
  const fixedCostValue = suggestedPrice * (fixedCostPerc / 100);
  const platformFeeValue = suggestedPrice * (platformFeePerc / 100);
  const profitValue = suggestedPrice * (profitMarginPerc / 100);

  const chartData = [
    { name: 'Ingredientes + Emb.', value: totalDirectCost },
    { name: 'Custos Fixos', value: fixedCostValue },
    { name: 'Taxas/Apps', value: platformFeeValue },
    { name: 'Lucro Líquido', value: profitValue },
  ].filter(d => d.value > 0);

  const COLORS = ['#ef4444', '#f59e0b', '#6366f1', '#10b981'];

  const addIngredient = () => {
    if (!tempIngName || !tempIngCost) return;
    setIngredients([...ingredients, { id: Date.now().toString(), name: tempIngName, cost: parseFloat(tempIngCost) }]);
    setTempIngName('');
    setTempIngCost('');
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(i => i.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
      
      {/* Left Column: Inputs */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calculator size={20} className="text-indigo-600"/> 
            Composição de Custos
          </h3>

          <div className="mb-4">
             <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto (para referência)</label>
             <div className="flex gap-2">
               <input 
                 type="text" 
                 placeholder="Ex: Hambúrguer Artesanal"
                 className="flex-1 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                 value={productName}
                 onChange={e => setProductName(e.target.value)}
               />
             </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Ingredientes</label>
            <div className="flex gap-2 mb-3">
              <input 
                type="text" 
                placeholder="Item (ex: Carne 150g)"
                className="flex-[2] border border-gray-300 rounded-lg p-2 text-sm"
                value={tempIngName}
                onChange={e => setTempIngName(e.target.value)}
              />
              <input 
                type="number" 
                placeholder="R$ Custo"
                className="flex-1 border border-gray-300 rounded-lg p-2 text-sm"
                value={tempIngCost}
                onChange={e => setTempIngCost(e.target.value)}
              />
              <button 
                onClick={addIngredient}
                className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {ingredients.map(ing => (
                <div key={ing.id} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100 text-sm">
                  <span>{ing.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-gray-700">R$ {ing.cost.toFixed(2)}</span>
                    <button onClick={() => removeIngredient(ing.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {ingredients.length === 0 && <p className="text-gray-400 text-xs italic text-center">Nenhum ingrediente adicionado.</p>}
            </div>
            
            <div className="flex justify-between items-center mt-3 pt-2 border-t font-semibold text-gray-700">
               <span>Total Ingredientes:</span>
               <span>R$ {totalIngredients.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-xs font-medium text-gray-600 mb-1">Custo Embalagem (R$)</label>
               <input 
                 type="number" 
                 className="w-full border border-gray-300 rounded-lg p-2"
                 value={packagingCost}
                 onChange={e => setPackagingCost(parseFloat(e.target.value) || 0)}
               />
             </div>
             <div>
               <label className="block text-xs font-medium text-gray-600 mb-1">Custos Fixos (%)</label>
               <input 
                 type="number" 
                 className="w-full border border-gray-300 rounded-lg p-2"
                 value={fixedCostPerc}
                 onChange={e => setFixedCostPerc(parseFloat(e.target.value) || 0)}
                 title="Porcentagem para aluguel, energia, água, etc."
               />
             </div>
             <div>
               <label className="block text-xs font-medium text-gray-600 mb-1">Taxas App/Cartão (%)</label>
               <input 
                 type="number" 
                 className="w-full border border-gray-300 rounded-lg p-2"
                 value={platformFeePerc}
                 onChange={e => setPlatformFeePerc(parseFloat(e.target.value) || 0)}
               />
             </div>
             <div>
               <label className="block text-xs font-medium text-blue-600 mb-1">Margem de Lucro (%)</label>
               <input 
                 type="number" 
                 className="w-full border-blue-200 bg-blue-50 text-blue-800 font-bold rounded-lg p-2"
                 value={profitMarginPerc}
                 onChange={e => setProfitMarginPerc(parseFloat(e.target.value) || 0)}
               />
             </div>
          </div>
        </div>
      </div>

      {/* Right Column: Results */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign size={100} />
          </div>
          
          <h3 className="text-gray-500 font-medium mb-1">Preço de Venda Sugerido</h3>
          {isRisky ? (
            <div className="flex items-center gap-2 text-red-600 font-bold text-lg">
              <AlertCircle />
              <span>Margens Inválidas (Total &gt; 100%)</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-indigo-700">R$ {suggestedPrice.toFixed(2)}</span>
              <span className="text-gray-400 text-sm">/ unidade</span>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
             <div className="bg-red-50 p-3 rounded-lg border border-red-100">
               <p className="text-red-600 text-xs font-bold uppercase">Custo Direto Total</p>
               <p className="font-mono text-lg font-bold text-red-700">R$ {totalDirectCost.toFixed(2)}</p>
               <p className="text-xs text-red-400">{((totalDirectCost/suggestedPrice)*100).toFixed(1)}% do preço</p>
             </div>
             <div className="bg-green-50 p-3 rounded-lg border border-green-100">
               <p className="text-green-600 text-xs font-bold uppercase">Lucro Líquido Real</p>
               <p className="font-mono text-lg font-bold text-green-700">R$ {profitValue.toFixed(2)}</p>
               <p className="text-xs text-green-500">{profitMarginPerc}% do preço</p>
             </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
             <PieIcon size={16} /> Para onde vai o dinheiro?
           </h3>
           <div className="h-64 w-full">
             {!isRisky && suggestedPrice > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={chartData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                   >
                     {chartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                   <Legend />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                 Adicione custos para visualizar o gráfico
               </div>
             )}
           </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg text-xs text-gray-500 space-y-2 border border-gray-200">
          <p><strong>Fórmula utilizada:</strong> Markup Divisor (Margem sobre a Venda).</p>
          <p>Esta metodologia garante que, se você vender por <strong>R$ {suggestedPrice.toFixed(2)}</strong>, exatamente <strong>{profitMarginPerc}%</strong> desse valor sobrará no seu bolso após pagar fornecedores, embalagens, aluguel e taxas.</p>
        </div>
      </div>

    </div>
  );
};