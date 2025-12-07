
import React, { useState } from 'react';
import { Employee, EmployeeAdvance } from '../types';
import { Plus, Trash2, Edit2, User, Printer, DollarSign, Calendar, FileText, AlertTriangle, Briefcase, MapPin } from 'lucide-react';

interface TeamManagementProps {
   employees: Employee[];
   setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const TeamManagement: React.FC<TeamManagementProps> = ({ employees, setEmployees }) => {
   const [isEditing, setIsEditing] = useState(false);
   const [activeSubTab, setActiveSubTab] = useState<'info' | 'advances'>('info');
   const [currentEmployee, setCurrentEmployee] = useState<Partial<Employee>>({});

   // Modal States
   const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

   // --- CRUD Operations ---

   const handleSave = async () => {
      if (!currentEmployee.name || !currentEmployee.cpf) {
         alert("Nome e CPF são obrigatórios.");
         return;
      }

      try {
         const isUpdate = !!currentEmployee.id;
         const method = isUpdate ? 'PUT' : 'POST';
         const url = isUpdate
            ? `${API_URL}/api/employees/${currentEmployee.id}`
            : `${API_URL}/api/employees`;

         const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentEmployee)
         });

         if (res.ok) {
            const saved = await res.json();
            setEmployees(prev => isUpdate
               ? prev.map(e => e.id === saved.id ? saved : e)
               : [...prev, saved]
            );
            setIsEditing(false);
            setCurrentEmployee({});
            setActiveSubTab('info');
         } else {
            alert("Erro ao salvar colaborador no servidor.");
         }
      } catch (error) {
         console.error(error);
         alert("Erro de conexão.");
      }
   };

   const requestDelete = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setEmployeeToDelete(id);
   };

   const confirmDelete = async () => {
      if (employeeToDelete) {
         try {
            const res = await fetch(`${API_URL}/api/employees/${employeeToDelete}`, { method: 'DELETE' });
            if (res.ok) {
               setEmployees(prev => prev.filter(e => e.id !== employeeToDelete));
               setEmployeeToDelete(null);
            } else {
               alert("Erro ao excluir colaborador.");
            }
         } catch (e) {
            alert("Erro de conexão ao excluir.");
         }
      }
   };

   // --- ADVANCES LOGIC ---
   const [newAdvance, setNewAdvance] = useState<{ amount: string, desc: string }>({ amount: '', desc: '' });

   const addAdvance = async () => {
      if (!newAdvance.amount) return;

      if (!currentEmployee.id) {
         alert("Salve o colaborador primeiro antes de adicionar vales.");
         return;
      }

      try {
         const res = await fetch(`${API_URL}/api/employees/${currentEmployee.id}/advances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: newAdvance.amount, description: newAdvance.desc || 'Adiantamento' })
         });

         if (res.ok) {
            const savedAdv = await res.json();
            const updatedAdvances = [...(currentEmployee.advances || []), savedAdv];
            setCurrentEmployee({ ...currentEmployee, advances: updatedAdvances });

            // Update main list reflection
            setEmployees(prev => prev.map(e => e.id === currentEmployee.id ? { ...e, advances: updatedAdvances } : e));

            setNewAdvance({ amount: '', desc: '' });
         } else {
            alert("Erro ao registrar vale.");
         }
      } catch (e) {
         alert("Erro de conexão.");
      }
   };

   const removeAdvance = (advId: string) => {
      // Current backend does not expose delete endpoint for advances separately (only cascade delete with employee)
      // To implement calling DELETE /api/advances/:id we would need that route.
      alert("Funcionalidade indisponível no momento (requer backend update).");
   };

   // --- PRINTING LOGIC ---
   const handlePrintSheet = (employee: Employee) => {
      const printWindow = window.open('', '_blank', 'width=800,height=900');
      if (printWindow) {
         const totalAdvances = employee.advances.reduce((acc, curr) => acc + curr.amount, 0);

         printWindow.document.write(`
        <html>
          <head>
            <title>Ficha Cadastral - ${employee.name}</title>
            <style>
              body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; line-height: 1.5; }
              .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
              h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
              h2 { margin: 5px 0 0; font-size: 14px; font-weight: normal; color: #666; }
              .section { margin-bottom: 25px; }
              .section-title { font-size: 16px; font-weight: bold; background: #eee; padding: 5px 10px; border-left: 5px solid #333; margin-bottom: 15px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
              .field { margin-bottom: 5px; }
              .label { font-weight: bold; font-size: 12px; display: block; color: #555; }
              .value { font-size: 14px; border-bottom: 1px dotted #ccc; display: block; padding-bottom: 2px; }
              
              table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f9f9f9; }
              
              .signature-box { margin-top: 50px; border-top: 1px solid #333; width: 40%; padding-top: 10px; text-align: center; font-size: 12px; }
              .footer { margin-top: 50px; font-size: 10px; text-align: center; color: #999; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Ficha de Registro de Colaborador</h1>
              <h2>Documento para Fins Administrativos e Contábeis</h2>
            </div>

            <div class="section">
              <div class="section-title">DADOS PESSOAIS</div>
              <div class="grid">
                <div class="field"><span class="label">Nome Completo:</span> <span class="value">${employee.name}</span></div>
                <div class="field"><span class="label">CPF:</span> <span class="value">${employee.cpf}</span></div>
                <div class="field"><span class="label">RG:</span> <span class="value">${employee.rg || 'Não informado'}</span></div>
                <div class="field"><span class="label">Data de Nascimento:</span> <span class="value">${employee.birthDate ? new Date(employee.birthDate).toLocaleDateString() : 'Não informado'}</span></div>
                <div class="field"><span class="label">Telefone:</span> <span class="value">${employee.phone}</span></div>
                <div class="field" style="grid-column: span 2"><span class="label">Endereço Completo:</span> <span class="value">${employee.address}</span></div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">DADOS CONTRATUAIS</div>
              <div class="grid">
                <div class="field"><span class="label">Função/Cargo:</span> <span class="value">${employee.role}</span></div>
                <div class="field"><span class="label">Data de Admissão:</span> <span class="value">${employee.admissionDate ? new Date(employee.admissionDate).toLocaleDateString() : '---'}</span></div>
                <div class="field"><span class="label">Salário Base:</span> <span class="value">R$ ${employee.baseSalary.toFixed(2)}</span></div>
                <div class="field"><span class="label">Vale Transporte (Diário/Mensal):</span> <span class="value">R$ ${employee.transportVoucherValue.toFixed(2)}</span></div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">REGISTRO DE VALES E ADIANTAMENTOS (Mês Atual/Recente)</div>
              ${employee.advances.length > 0 ? `
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${employee.advances.map(adv => `
                      <tr>
                        <td>${new Date(adv.date).toLocaleDateString()}</td>
                        <td>${adv.description}</td>
                        <td>R$ ${adv.amount.toFixed(2)}</td>
                      </tr>
                    `).join('')}
                    <tr>
                      <td colspan="2" style="text-align:right; font-weight:bold;">TOTAL DE VALES:</td>
                      <td style="font-weight:bold;">R$ ${totalAdvances.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              ` : '<p style="font-style:italic; font-size:12px;">Nenhum vale registrado no sistema.</p>'}
            </div>

            <br/><br/>
            <div class="signature-box">
              Assinatura do Responsável
            </div>
            
            <div class="footer">
              Gerado pelo sistema DeliveryMaster em ${new Date().toLocaleDateString()}
            </div>
            
            <script>window.print();</script>
          </body>
        </html>
      `);
         printWindow.document.close();
      }
   };

   return (
      <div className="space-y-6">
         <div className="flex justify-between items-center">
            <div>
               <h2 className="text-2xl font-bold text-gray-800">Equipe e RH</h2>
               <p className="text-gray-500 text-sm">Gerencie colaboradores, salários e vales.</p>
            </div>
            <button
               onClick={() => {
                  setCurrentEmployee({ isActive: true, advances: [], transportVoucherValue: 0, baseSalary: 0 });
                  setIsEditing(true);
                  setActiveSubTab('info');
               }}
               className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition"
            >
               <Plus size={20} /> Novo Colaborador
            </button>
         </div>

         {!isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {employees.map(employee => {
                  const totalAdvances = employee.advances.reduce((acc, curr) => acc + curr.amount, 0);
                  return (
                     <div key={employee.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                        <div className="p-5 flex-1">
                           <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                                    <User size={20} />
                                 </div>
                                 <div>
                                    <h3 className="font-bold text-gray-800">{employee.name}</h3>
                                    <p className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full w-fit mt-1">{employee.role}</p>
                                 </div>
                              </div>
                              <div className="flex gap-1">
                                 <button onClick={() => { setCurrentEmployee(employee); setIsEditing(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded">
                                    <Edit2 size={16} />
                                 </button>
                                 <button onClick={(e) => requestDelete(e, employee.id)} className="p-1.5 text-red-300 hover:text-red-500 rounded">
                                    <Trash2 size={16} />
                                 </button>
                              </div>
                           </div>

                           <div className="space-y-2 text-sm text-gray-600 mt-4">
                              <div className="flex justify-between border-b border-gray-50 pb-1">
                                 <span>Salário Base:</span>
                                 <span className="font-medium">R$ {employee.baseSalary.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between border-b border-gray-50 pb-1">
                                 <span>Vale Transporte:</span>
                                 <span className="font-medium">R$ {employee.transportVoucherValue.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between pt-1">
                                 <span className="text-red-600 font-medium">Vales/Adiantamentos:</span>
                                 <span className="font-bold text-red-600">R$ {totalAdvances.toFixed(2)}</span>
                              </div>
                           </div>
                        </div>

                        <div className="bg-gray-50 p-3 border-t border-gray-100 flex justify-between items-center">
                           <span className="text-xs text-gray-400">Admissão: {employee.admissionDate ? new Date(employee.admissionDate).toLocaleDateString() : '--'}</span>
                           <button
                              onClick={() => handlePrintSheet(employee)}
                              className="text-xs flex items-center gap-1 bg-white border border-gray-200 px-3 py-1.5 rounded hover:bg-gray-100 text-gray-700 font-medium transition"
                           >
                              <Printer size={14} /> Ficha
                           </button>
                        </div>
                     </div>
                  );
               })}
               {employees.length === 0 && (
                  <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                     <User size={48} className="mx-auto mb-2 opacity-20" />
                     <p>Nenhum colaborador cadastrado.</p>
                  </div>
               )}
            </div>
         ) : (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden max-w-4xl mx-auto">
               {/* Form Header Tabs */}
               <div className="flex border-b border-gray-200">
                  <button
                     onClick={() => setActiveSubTab('info')}
                     className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition ${activeSubTab === 'info' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                     <User size={18} /> Dados Pessoais e Contrato
                  </button>
                  <button
                     onClick={() => setActiveSubTab('advances')}
                     className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition ${activeSubTab === 'advances' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                     <DollarSign size={18} /> Vales e Financeiro
                  </button>
               </div>

               <div className="p-6 md:p-8">
                  {activeSubTab === 'info' && (
                     <div className="space-y-6 animate-in fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                              <input type="text" className="w-full border border-gray-300 rounded-lg p-2" value={currentEmployee.name || ''} onChange={e => setCurrentEmployee({ ...currentEmployee, name: e.target.value })} />
                           </div>
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">CPF *</label>
                              <input type="text" className="w-full border border-gray-300 rounded-lg p-2" value={currentEmployee.cpf || ''} onChange={e => setCurrentEmployee({ ...currentEmployee, cpf: e.target.value })} placeholder="000.000.000-00" />
                           </div>
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">RG</label>
                              <input type="text" className="w-full border border-gray-300 rounded-lg p-2" value={currentEmployee.rg || ''} onChange={e => setCurrentEmployee({ ...currentEmployee, rg: e.target.value })} />
                           </div>
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                              <input type="date" className="w-full border border-gray-300 rounded-lg p-2" value={currentEmployee.birthDate || ''} onChange={e => setCurrentEmployee({ ...currentEmployee, birthDate: e.target.value })} />
                           </div>
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                              <input type="text" className="w-full border border-gray-300 rounded-lg p-2" value={currentEmployee.phone || ''} onChange={e => setCurrentEmployee({ ...currentEmployee, phone: e.target.value })} />
                           </div>
                           <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço Completo</label>
                              <input type="text" className="w-full border border-gray-300 rounded-lg p-2" value={currentEmployee.address || ''} onChange={e => setCurrentEmployee({ ...currentEmployee, address: e.target.value })} />
                           </div>
                        </div>

                        <hr className="border-gray-100" />
                        <h4 className="font-bold text-gray-800 flex items-center gap-2"><Briefcase size={18} /> Dados do Contrato</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Função / Cargo</label>
                              <input type="text" className="w-full border border-gray-300 rounded-lg p-2" value={currentEmployee.role || ''} onChange={e => setCurrentEmployee({ ...currentEmployee, role: e.target.value })} placeholder="Ex: Atendente, Cozinheiro" />
                           </div>
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Admissão</label>
                              <input type="date" className="w-full border border-gray-300 rounded-lg p-2" value={currentEmployee.admissionDate || ''} onChange={e => setCurrentEmployee({ ...currentEmployee, admissionDate: e.target.value })} />
                           </div>
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Salário Base (R$)</label>
                              <input type="number" className="w-full border border-gray-300 rounded-lg p-2" value={currentEmployee.baseSalary || ''} onChange={e => setCurrentEmployee({ ...currentEmployee, baseSalary: parseFloat(e.target.value) })} />
                           </div>
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Vale Transporte (R$)</label>
                              <input type="number" className="w-full border border-gray-300 rounded-lg p-2" value={currentEmployee.transportVoucherValue || ''} onChange={e => setCurrentEmployee({ ...currentEmployee, transportVoucherValue: parseFloat(e.target.value) })} placeholder="Valor mensal ou diário" />
                           </div>
                        </div>
                     </div>
                  )}

                  {activeSubTab === 'advances' && (
                     <div className="space-y-6 animate-in fade-in">
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg text-sm text-amber-800 mb-4">
                           Gerencie aqui os adiantamentos e vales que serão descontados do salário no final do mês.
                        </div>

                        <div className="flex gap-2 items-end bg-gray-50 p-4 rounded-lg border border-gray-200">
                           <div className="flex-1">
                              <label className="block text-xs font-bold text-gray-600 mb-1">Descrição</label>
                              <input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="Ex: Vale Farmácia" value={newAdvance.desc} onChange={e => setNewAdvance({ ...newAdvance, desc: e.target.value })} />
                           </div>
                           <div className="w-32">
                              <label className="block text-xs font-bold text-gray-600 mb-1">Valor (R$)</label>
                              <input type="number" className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="0.00" value={newAdvance.amount} onChange={e => setNewAdvance({ ...newAdvance, amount: e.target.value })} />
                           </div>
                           <button onClick={addAdvance} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700 h-[38px]">
                              Lançar
                           </button>
                        </div>

                        <table className="w-full text-sm text-left">
                           <thead className="bg-gray-50 border-b">
                              <tr>
                                 <th className="p-3">Data</th>
                                 <th className="p-3">Descrição</th>
                                 <th className="p-3 text-right">Valor</th>
                                 <th className="p-3 w-10"></th>
                              </tr>
                           </thead>
                           <tbody className="divide-y">
                              {(!currentEmployee.advances || currentEmployee.advances.length === 0) && (
                                 <tr><td colSpan={4} className="p-6 text-center text-gray-400">Nenhum vale registrado.</td></tr>
                              )}
                              {currentEmployee.advances?.map(adv => (
                                 <tr key={adv.id} className="hover:bg-gray-50">
                                    <td className="p-3">{new Date(adv.date).toLocaleDateString()}</td>
                                    <td className="p-3">{adv.description}</td>
                                    <td className="p-3 text-right font-bold text-red-600">R$ {adv.amount.toFixed(2)}</td>
                                    <td className="p-3">
                                       <button onClick={() => removeAdvance(adv.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                           <tfoot className="border-t bg-gray-50 font-bold">
                              <tr>
                                 <td colSpan={2} className="p-3 text-right">Total:</td>
                                 <td className="p-3 text-right text-red-600">R$ {currentEmployee.advances?.reduce((a, b) => a + b.amount, 0).toFixed(2) || '0.00'}</td>
                                 <td></td>
                              </tr>
                           </tfoot>
                        </table>
                     </div>
                  )}

                  <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                     <button onClick={() => setIsEditing(false)} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                     <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200">Salvar Dados</button>
                  </div>
               </div>
            </div>
         )}

         {/* DELETE MODAL */}
         {employeeToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
               <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm text-center">
                  <div className="bg-red-100 p-3 rounded-full text-red-600 w-fit mx-auto mb-4"><AlertTriangle size={32} /></div>
                  <h3 className="text-xl font-bold mb-2">Excluir Colaborador?</h3>
                  <p className="text-gray-500 text-sm mb-6">Todos os dados e histórico de vales serão perdidos permanentemente.</p>
                  <div className="flex gap-3">
                     <button onClick={() => setEmployeeToDelete(null)} className="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                     <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">Excluir</button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};
