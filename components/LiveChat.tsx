import React, { useState, useEffect } from 'react';
import { Send, User, MessageCircle, Clock, Search, PauseCircle, PlayCircle, Trash2 } from 'lucide-react';

interface Message {
    id: string;
    body: string;
    fromMe: boolean;
    timestamp: string;
}

interface Chat {
    id: string;
    contactName: string;
    remoteJid: string;
    botStatus: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
    lastMessageAt: string;
    messages: Message[];
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function LiveChat() {
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Fetch Chats
    useEffect(() => {
        fetch(`${API_URL}/api/whatsapp/chats`)
            .then(res => res.json())
            .then(data => setChats(data))
            .catch(err => console.error(err));

        // Poll for new chats every 5s
        const interval = setInterval(() => {
            setRefreshTrigger(prev => prev + 1);
        }, 5000);
        return () => clearInterval(interval);
    }, [refreshTrigger]);

    // Fetch Messages when chat selected
    useEffect(() => {
        if (!selectedChatId) return;

        fetch(`${API_URL}/api/whatsapp/chats/${selectedChatId}/messages`)
            .then(res => res.json())
            .then(data => setMessages(data))
            .catch(err => console.error(err));
    }, [selectedChatId, refreshTrigger]); // Auto-refresh messages too 

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedChatId || !newMessage.trim()) return;

        try {
            await fetch(`${API_URL}/api/whatsapp/chats/${selectedChatId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: newMessage })
            });

            setNewMessage('');
            setRefreshTrigger(prev => prev + 1); // Refresh UI
        } catch (error) {
            console.error('Failed to send', error);
        }
    };

    const handleDeleteMessage = async (msgId: string) => {
        if (!confirm('Apagar esta mensagem?')) return;
        try {
            await fetch(`${API_URL}/api/whatsapp/messages/${msgId}`, { method: 'DELETE' });
            // Remove from local state immediately
            setMessages(prev => prev.filter(m => m.id !== msgId));
        } catch (error) {
            console.error('Failed to delete', error);
        }
    };

    const selectedChat = chats.find(c => c.id === selectedChatId);

    return (
        <div className="flex h-[calc(100vh-100px)] border rounded-xl overflow-hidden bg-white shadow-sm mt-4 mx-4">
            {/* Sidebar List */}
            <div className="w-1/3 border-r border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-indigo-600" />
                        Conversas
                    </h2>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {chats.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            Nenhuma conversa iniciada.
                        </div>
                    ) : (
                        chats.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => setSelectedChatId(chat.id)}
                                className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${selectedChatId === chat.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-semibold text-slate-800">{chat.contactName}</h3>
                                    <span className="text-xs text-slate-400">
                                        {new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 truncate">
                                    {/* Show last message logic here if returned by API */}
                                    {chat.messages?.[0]?.body || 'Nova conversa...'}
                                </p>
                                <div className="mt-2 flex gap-2">
                                    {chat.botStatus === 'ACTIVE' ? (
                                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                                            <PlayCircle className="w-3 h-3" /> Robô Ativo
                                        </span>
                                    ) : (
                                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                                            <PauseCircle className="w-3 h-3" /> Pausado
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Window */}
            <div className="w-2/3 flex flex-col bg-slate-50/50">
                {selectedChat ? (
                    <>
                        {/* Header */}
                        <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{selectedChat.contactName}</h3>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        {selectedChat.botStatus === 'ACTIVE' ? 'Robô respondendo...' : 'Você assumiu o controle'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.length === 0 ? (
                                <div className="text-center mt-20 text-slate-400">Início da conversa</div>
                            ) : (
                                messages.map(msg => (
                                    <div key={msg.id} className={`group flex ${msg.fromMe ? 'justify-end' : 'justify-start'} items-center gap-2`}>

                                        {!msg.fromMe && (
                                            <button
                                                onClick={() => handleDeleteMessage(msg.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-opacity"
                                                title="Apagar mensagem"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}

                                        <div className={`max-w-[70%] p-3 rounded-xl shadow-sm ${msg.fromMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-slate-700 rounded-bl-none'}`}>
                                            <p className="text-sm">{msg.body}</p>
                                            <span className={`text-[10px] block mt-1 text-right ${msg.fromMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        {msg.fromMe && (
                                            <button
                                                onClick={() => handleDeleteMessage(msg.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-opacity"
                                                title="Apagar mensagem"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-slate-200">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Digite uma mensagem..."
                                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button
                                    type="submit"
                                    className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                        <MessageCircle className="w-16 h-16 mb-4" />
                        <p className="text-lg">Selecione uma conversa ao lado</p>
                    </div>
                )}
            </div>
        </div>
    );
}
