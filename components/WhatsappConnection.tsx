import React, { useState, useEffect } from 'react';
import { Phone, Wifi, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export function WhatsappConnection() {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const [status, setStatus] = useState<'DISCONNECTED' | 'CONNECTED' | 'QR_READY' | 'LOADING'>('LOADING');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [debugError, setDebugError] = useState<string>('');

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch(`${API_URL}/api/whatsapp/status`);
                if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

                const data = await response.json();

                setStatus(data.status);
                setQrCode(data.qrCode);
                setDebugError('');
            } catch (error: any) {
                console.error("Failed to fetch status", error);
                setStatus('DISCONNECTED');
                setDebugError(error.message || 'Unknown Error');
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 3000); // Poll every 3s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {debugError && (
                <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4 text-center text-sm font-mono border border-red-200">
                    <p className="font-bold">ERRO DE CONEXÃO:</p>
                    <p>{debugError}</p>
                    <p className="mt-2 text-xs text-red-500">
                        Certifique-se que o backend está rodando na porta 3001.
                    </p>
                </div>
            )}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Phone className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Conexão WhatsApp</h2>
                    <p className="text-slate-500 mt-2">Conecte seu número para ativar o robô de auto-atendimento</p>
                </div>

                <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">

                    {status === 'LOADING' && (
                        <div className="text-center">
                            <RefreshCw className="w-10 h-10 text-slate-400 animate-spin mx-auto mb-4" />
                            <p className="text-slate-500">Iniciando serviço...</p>
                        </div>
                    )}

                    {status === 'CONNECTED' && (
                        <div className="text-center">
                            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-green-200 shadow-lg">
                                <CheckCircle className="w-10 h-10 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">WhatsApp Conectado!</h3>
                            <p className="text-slate-500 mb-6 max-w-md mx-auto">
                                Seu sistema está pronto para responder mensagens automaticamente.
                            </p>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                <Wifi className="w-4 h-4" />
                                Online e Monitorando
                            </div>
                        </div>
                    )}

                    {status === 'QR_READY' && qrCode && (
                        <div className="text-center">
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6 inline-block">
                                {/* The backend sends a Data URL (base64 image) */}
                                <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
                            </div>
                            <div className="max-w-md mx-auto">
                                <ol className="text-left text-slate-600 space-y-3 list-decimal pl-5">
                                    <li>Abra o WhatsApp no seu celular</li>
                                    <li>Toque em <strong>Menu</strong> (Android) ou <strong>Configurações</strong> (iPhone)</li>
                                    <li>Selecione <strong>Aparelhos Conectados</strong></li>
                                    <li>Toque em <strong>Conectar um aparelho</strong></li>
                                    <li>Aponte a câmera para esta tela</li>
                                </ol>
                            </div>
                        </div>
                    )}

                    {status === 'DISCONNECTED' && !qrCode && (
                        <div className="text-center">
                            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4 text-center" />
                            <p className="text-slate-600 mb-4">Serviço desconectado ou aguardando QR Code.</p>
                            <p className="text-sm text-slate-400">Verifique se o backend está rodando.</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
