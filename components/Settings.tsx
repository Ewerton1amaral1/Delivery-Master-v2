
import React, { useState } from 'react';
import { StoreSettings, DeliveryRange, Order, OrderStatus, PaymentMethod } from '../types';
import { Save, Lock, Store, MapPin, Image, LogOut, Truck, Plus, Trash2, Globe, MessageCircle, Wallet, QrCode, ExternalLink, CheckCircle, Upload, Download, FileText, Smartphone, Wifi, RefreshCw } from 'lucide-react';

interface SettingsProps {
    settings: StoreSettings;
    onSave: (settings: StoreSettings) => void;
    onLogout?: () => void;
    onBackup: () => void;
    onRestore: (file: File) => void;
    onImportOrders: (orders: Order[]) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const Settings: React.FC<SettingsProps> = ({ settings, onSave, onLogout, onBackup, onRestore, onImportOrders }) => {
    const [formData, setFormData] = useState<StoreSettings>({
        ...settings,
        isStoreOpen: settings.isStoreOpen !== undefined ? settings.isStoreOpen : true,
        whatsappStatus: settings.whatsappStatus || 'DISCONNECTED',
        integrations: settings.integrations || { ifoodEnabled: false, whatsappEnabled: false },
        driverFeeRanges: settings.driverFeeRanges || []
    });
    const [showPassword, setShowPassword] = useState(false);
    const [savedMessage, setSavedMessage] = useState('');

    // WhatsApp QR State
    const [qrState, setQrState] = useState<'IDLE' | 'GENERATING' | 'READY'>('IDLE');

    // Local state for adding a new range (Client)
    const [newRange, setNewRange] = useState<Partial<DeliveryRange>>({ minKm: 0, maxKm: 0, price: 0 });
    // Local state for adding a new range (Driver)
    const [newDriverRange, setNewDriverRange] = useState<Partial<DeliveryRange>>({ minKm: 0, maxKm: 0, price: 0 });

    const handleSave = () => {
        onSave(formData);
        setSavedMessage('Configurações salvas com sucesso!');
        setTimeout(() => setSavedMessage(''), 3000);
    };

    // Helper to open Digital Menu
    const openDigitalMenu = () => {
        const sessionStr = localStorage.getItem('dm_session');
        let currentStoreId = 'demo_store';
        if (sessionStr) {
            const session = JSON.parse(sessionStr);
            if (session.storeId) currentStoreId = session.storeId;
        }

        const url = `${window.location.origin}${window.location.pathname}?mode=menu&store=${currentStoreId}`;
        window.open(url, '_blank');
    };

    // --- WHATSAPP CONNECTION LOGIC (REAL) ---
    const [realQr, setRealQr] = useState<string | null>(null);

    React.useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch(`${API_URL}/api/whatsapp/status`);
                const data = await res.json();
                if (data) {
                    setFormData(prev => ({ ...prev, whatsappStatus: data.status }));
                    setRealQr(data.qrCode);
                }
            } catch (error) {
                console.error("Error checking WA status", error);
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleConnectWhatsApp = () => {
        alert("O backend inicia a conexão automaticamente. Aguarde o QR Code.");
    };

    const handleDisconnectWhatsApp = () => {
        alert("Desconexão deve ser feita pelo Celular ou Reiniciando o Backend.");
    };

    // --- CLIENT FEE LOGIC ---
    const addRange = () => {
        if (newRange.minKm === undefined || newRange.maxKm === undefined || !newRange.price) return;

        const range: DeliveryRange = {
            id: Date.now().toString(),
            minKm: Number(newRange.minKm),
            maxKm: Number(newRange.maxKm),
            price: Number(newRange.price)
        };

        const currentRanges = formData.deliveryRanges || [];
        setFormData({ ...formData, deliveryRanges: [...currentRanges, range].sort((a, b) => a.minKm - b.minKm) });
        setNewRange({ minKm: 0, maxKm: 0, price: 0 });
    };

    const removeRange = (id: string) => {
        const currentRanges = formData.deliveryRanges || [];
        setFormData({ ...formData, deliveryRanges: currentRanges.filter(r => r.id !== id) });
    };

    // --- DRIVER FEE LOGIC ---
    const addDriverRange = () => {
        if (newDriverRange.minKm === undefined || newDriverRange.maxKm === undefined || !newDriverRange.price) return;

        const range: DeliveryRange = {
            id: Date.now().toString(),
            minKm: Number(newDriverRange.minKm),
            maxKm: Number(newDriverRange.maxKm),
            price: Number(newDriverRange.price)
        };

        const currentRanges = formData.driverFeeRanges || [];
        setFormData({ ...formData, driverFeeRanges: [...currentRanges, range].sort((a, b) => a.minKm - b.minKm) });
        setNewDriverRange({ minKm: 0, maxKm: 0, price: 0 });
    };

    const removeDriverRange = (id: string) => {
        const currentRanges = formData.driverFeeRanges || [];
        setFormData({ ...formData, driverFeeRanges: currentRanges.filter(r => r.id !== id) });
    };

    // --- IMPORT LOGIC ---
    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const parsedOrders = parseImportText(text);
            if (parsedOrders.length > 0) {
                onImportOrders(parsedOrders);
            } else {
                alert('Não foi possível identificar pedidos no arquivo. Verifique o formato.');
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    };

    const parseImportText = (text: string): Order[] => {
        const lines = text.split('\n');
        const orders: Order[] = [];

        const rowRegex = /^(.+?)\s+(\d+)\s+(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2})\s+(\w+)\s+(\d+)\s+(\w+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/;

        for (const line of lines) {
            if (!line.trim() || line.includes('NOME DA LOJA')) continue;

            const match = line.match(rowRegex);
            if (match) {
                const dateTimeStr = match[3];
                const shortId = match[5];
                const statusStr = match[6];
                const totalVal = parseFloat(match[8].replace(',', '.'));
                const feeVal = parseFloat(match[9].replace(',', '.'));

                // Converter data
                const [datePart, timePart] = dateTimeStr.split(' ');
                const [day, month, year] = datePart.split('/');
                const isoDate = `${year}-${month}-${day}T${timePart}`;

                let status = OrderStatus.COMPLETED;
                if (statusStr === 'CANCELADO') status = OrderStatus.CANCELLED;

                // Criar Pedido
                const order: Order = {
                    id: `ifood_${shortId}_${day}${month}${year}`,
                    source: 'IFOOD',
                    clientId: `cli_ifood_${shortId}`, // Placeholder client
                    clientName: `Cliente iFood #${shortId}`,
                    clientPhone: '',
                    deliveryAddress: 'Endereço iFood (Importado)',
                    items: [
                        {
                            productId: 'ifood_item',
                            productName: `Pedido iFood #${shortId}`,
                            quantity: 1,
                            unitPrice: totalVal
                        }
                    ],
                    subtotal: totalVal,
                    deliveryFee: feeVal,
                    discount: 0,
                    total: totalVal,
                    status: status,
                    paymentMethod: PaymentMethod.CARD, // Assumindo online
                    paymentStatus: 'Paid',
                    createdAt: isoDate,
                    updatedAt: new Date().toISOString()
                };
                orders.push(order);
            }
        }
        return orders;
    };

    const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onRestore(file);
        e.target.value = '';
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">

            <div className="space-y-6 animate-in fade-in">
                {/* --- DIGITAL MENU SECTION --- */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 rounded-xl shadow-lg text-white">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                                <QrCode /> Seu Cardápio Digital
                            </h2>
                            <p className="text-indigo-100 max-w-md">
                                Envie este link para seus clientes. Eles poderão ver seus produtos e fazer pedidos diretamente pelo celular sem precisar baixar nada.
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- WHATSAPP CONNECTION SECTION --- */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Smartphone className="text-green-600" /> Conexão WhatsApp
                    </h2>
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                        <div className="flex-1">
                            <p className="text-gray-600 mb-4">
                                Conecte seu WhatsApp para que o <strong>Robô de Auto-Atendimento</strong> possa funcionar.
                                Escaneie o QR Code abaixo com seu celular.
                            </p>
                            <ol className="list-decimal list-inside text-sm text-gray-500 space-y-1 mb-4">
                                <li>Abra o WhatsApp no seu celular</li>
                                <li>Toque em Menu (⋮) ou Configurações</li>
                                <li>Selecione "Dispositivos Conectados"</li>
                                <li>Toque em "Conectar um Aparelho"</li>
                            </ol>

                            {formData.whatsappStatus === 'CONNECTED' ? (
                                <button
                                    onClick={handleDisconnectWhatsApp}
                                    className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-bold hover:bg-red-200 transition"
                                >
                                    Desconectar
                                </button>
                            ) : (
                                <button
                                    onClick={handleConnectWhatsApp}
                                    disabled={formData.whatsappStatus === 'PAIRING'}
                                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-lg shadow-green-200 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {formData.whatsappStatus === 'PAIRING' ? 'Gerando QR Code...' : 'Gerar QR Code de Conexão'}
                                </button>
                            )}
                        </div>

                        <div className="flex-1 flex justify-center">
                            {/* QR Display Area */}
                            <div className="w-64 h-64 border-2 border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center relative overflow-hidden">
                                {formData.whatsappStatus === 'CONNECTED' ? (
                                    <div className="text-center animate-in fade-in">
                                        <div className="bg-green-100 p-4 rounded-full text-green-600 w-fit mx-auto mb-2">
                                            <Wifi size={40} />
                                        </div>
                                        <p className="font-bold text-green-600">WhatsApp Conectado!</p>
                                        <p className="text-xs text-gray-400">Pronto para receber mensagens.</p>
                                    </div>
                                ) : realQr ? (
                                    <div className="text-center animate-in zoom-in">
                                        <img
                                            src={realQr}
                                            alt="QR Code"
                                            className="w-48 h-48"
                                        />
                                        <p className="text-xs text-gray-500 mt-2 animate-pulse">Escaneie com o WhatsApp</p>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400">
                                        <QrCode size={48} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-xs">Aguardando QR Code...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Store className="text-indigo-600" /> Dados da Loja
                    </h2>

                    {/* ... Rest of the settings form (Identity, Address, Fees, etc.) ... */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Identidade */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-700 border-b pb-2">Identidade Visual</h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Estabelecimento</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">URL do Logo</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Image className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="https://..."
                                            className="w-full pl-10 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={formData.logoUrl || ''}
                                            onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Endereço */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-700 border-b pb-2">Localização</h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço Completo (para cálculo de frete)</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                    <textarea
                                        className="w-full pl-10 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Rua, Número, Bairro, Cidade - UF"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Essencial para geolocalização e rotas.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.latitude || ''}
                                        onChange={e => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                                        placeholder="-23.550520"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.longitude || ''}
                                        onChange={e => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                                        placeholder="-46.633308"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-400">
                                * Pegue essas coordenadas no Google Maps (clique com botão direito no mapa).
                            </p>
                        </div>

                        {/* CUSTOMER Delivery Ranges */}
                        <div className="space-y-4 md:col-span-2">
                            <h3 className="font-semibold text-gray-700 border-b pb-2 flex items-center gap-2">
                                <Truck size={18} /> Taxa de Entrega (Cobrada do Cliente)
                            </h3>

                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="flex flex-wrap items-end gap-3 mb-4">
                                    <div className="flex-1 min-w-[100px]">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">De (km)</label>
                                        <input
                                            type="number"
                                            className="w-full border border-gray-300 rounded-lg p-2"
                                            placeholder="0"
                                            value={newRange.minKm}
                                            onChange={e => setNewRange({ ...newRange, minKm: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[100px]">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Até (km)</label>
                                        <input
                                            type="number"
                                            className="w-full border border-gray-300 rounded-lg p-2"
                                            placeholder="2"
                                            value={newRange.maxKm}
                                            onChange={e => setNewRange({ ...newRange, maxKm: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[100px]">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Valor (R$)</label>
                                        <input
                                            type="number"
                                            className="w-full border border-gray-300 rounded-lg p-2"
                                            placeholder="5.00"
                                            value={newRange.price}
                                            onChange={e => setNewRange({ ...newRange, price: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <button
                                        onClick={addRange}
                                        className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {formData.deliveryRanges?.map(range => (
                                        <div key={range.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                            <span className="text-gray-700 text-sm">
                                                <strong>{range.minKm} km</strong> até <strong>{range.maxKm} km</strong>
                                            </span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-indigo-600 font-bold">R$ {range.price.toFixed(2)}</span>
                                                <button onClick={() => removeRange(range.id)} className="text-red-400 hover:text-red-600">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* DRIVER Fee Ranges */}
                        <div className="space-y-4 md:col-span-2">
                            <h3 className="font-semibold text-gray-700 border-b pb-2 flex items-center gap-2">
                                <Wallet size={18} /> Taxa de Pagamento ao Entregador (Custo Interno)
                            </h3>

                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <div className="flex flex-wrap items-end gap-3 mb-4">
                                    <div className="flex-1 min-w-[100px]">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">De (km)</label>
                                        <input
                                            type="number"
                                            className="w-full border border-gray-300 rounded-lg p-2"
                                            placeholder="0"
                                            value={newDriverRange.minKm}
                                            onChange={e => setNewDriverRange({ ...newDriverRange, minKm: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[100px]">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Até (km)</label>
                                        <input
                                            type="number"
                                            className="w-full border border-gray-300 rounded-lg p-2"
                                            placeholder="2"
                                            value={newDriverRange.maxKm}
                                            onChange={e => setNewDriverRange({ ...newDriverRange, maxKm: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[100px]">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Pagar (R$)</label>
                                        <input
                                            type="number"
                                            className="w-full border border-gray-300 rounded-lg p-2"
                                            placeholder="4.00"
                                            value={newDriverRange.price}
                                            onChange={e => setNewDriverRange({ ...newDriverRange, price: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <button
                                        onClick={addDriverRange}
                                        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {formData.driverFeeRanges?.map(range => (
                                        <div key={range.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                            <span className="text-gray-700 text-sm">
                                                <strong>{range.minKm} km</strong> até <strong>{range.maxKm} km</strong>
                                            </span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-blue-600 font-bold">R$ {range.price.toFixed(2)}</span>
                                                <button onClick={() => removeDriverRange(range.id)} className="text-red-400 hover:text-red-600">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Data Management Section */}
                        <div className="space-y-4 md:col-span-2">
                            <h3 className="font-semibold text-gray-700 border-b pb-2 flex items-center gap-2">
                                <Save size={18} /> Dados e Importação
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Backup/Restore */}
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><Download size={16} /> Backup & Restauração</h4>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={onBackup}
                                            className="bg-indigo-600 text-white text-sm py-2 px-4 rounded hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                                        >
                                            <Download size={14} /> Fazer Backup (JSON)
                                        </button>
                                        <div className="relative mt-2">
                                            <input
                                                type="file"
                                                accept=".json"
                                                onChange={handleRestoreFile}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <button className="w-full bg-white border border-gray-300 text-gray-700 text-sm py-2 px-4 rounded hover:bg-gray-100 transition flex items-center justify-center gap-2">
                                                <Upload size={14} /> Restaurar Backup
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* iFood Import */}
                                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                    <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2"><FileText size={16} /> Importar iFood (Relatório)</h4>
                                    <p className="text-xs text-red-600 mb-3">Carregue o arquivo de texto ou CSV do relatório de pedidos.</p>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept=".txt,.csv"
                                            onChange={handleImportFile}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <button className="w-full bg-white border border-red-300 text-red-700 text-sm py-2 px-4 rounded hover:bg-red-50 transition flex items-center justify-center gap-2">
                                            <Upload size={14} /> Selecionar Arquivo (.txt)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Segurança */}
                        <div className="space-y-4 md:col-span-2">
                            <h3 className="font-semibold text-gray-700 border-b pb-2 flex items-center gap-2">
                                <Lock size={18} /> Segurança e Gerência
                            </h3>

                            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-bold text-red-800">Senha do Gerente</label>
                                    <button
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-xs text-red-600 hover:underline"
                                    >
                                        {showPassword ? 'Ocultar' : 'Mostrar'}
                                    </button>
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="w-full border border-red-200 rounded-lg p-2 focus:ring-2 focus:ring-red-500 outline-none bg-white"
                                    value={formData.managerPassword || ''}
                                    onChange={e => setFormData({ ...formData, managerPassword: e.target.value })}
                                    placeholder="Defina uma senha para cancelamentos"
                                />
                                <p className="text-xs text-red-600 mt-2">
                                    Esta senha será solicitada para <strong>cancelar pedidos</strong> e realizar ações administrativas sensíveis. Deixe em branco para desativar.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t bg-gray-50 p-4 rounded-xl">
                {savedMessage && <span className="text-green-600 font-medium animate-pulse flex items-center gap-1"><CheckCircle size={16} /> {savedMessage}</span>}
                {onLogout && (
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 text-red-600 hover:text-red-800 px-4 py-3 rounded-xl font-bold hover:bg-red-50 transition mr-auto"
                    >
                        <LogOut size={20} /> Sair
                    </button>
                )}
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                >
                    <Save size={20} /> Salvar Configurações
                </button>
            </div>
        </div>
    );
};
