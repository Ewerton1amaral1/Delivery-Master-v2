
import React, { useState, useEffect, useRef } from 'react';
import { Product, StoreSettings, Order, OrderItem, PaymentMethod, OrderStatus, ProductCategory } from '../types';
import { Send, X, MessageCircle, Phone, Video, MoreVertical, Smile, Paperclip, Mic, QrCode, Smartphone } from 'lucide-react';

interface WhatsAppSimulatorProps {
  onClose: () => void;
  products: Product[];
  settings: StoreSettings;
  onCreateOrder: (order: Order) => void;
}

type BotStep = 'GREETING' | 'MAIN_MENU' | 'CATEGORY_SELECT' | 'PRODUCT_SELECT' | 'QUANTITY' | 'CONFIRM_CART' | 'ADDRESS' | 'PAYMENT' | 'FINISHED';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: string;
}

export const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({ onClose, products, settings, onCreateOrder }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Bot State
  const [step, setStep] = useState<BotStep>('GREETING');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check connection status logic
  const isConnected = settings.whatsappStatus === 'CONNECTED';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (isConnected) {
        // Initial Greeting only if connected
        setTimeout(() => {
        addBotMessage(`Olá! 👋 Bem-vindo(a) ao atendimento digital da *${settings.name}*.\n\nSou seu assistente virtual e vou anotar seu pedido.`);
        setTimeout(() => showMainMenu(), 1000);
        }, 500);
    }
  }, [isConnected]);

  const addBotMessage = (text: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text,
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1500); // Simulate typing delay
  };

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text,
      isBot: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const showMainMenu = () => {
    setStep('MAIN_MENU');
    addBotMessage(`Como posso ajudar hoje? Digite o número da opção:\n\n1️⃣ *Fazer Pedido*\n2️⃣ *Falar com Atendente*\n3️⃣ *Horário de Funcionamento*`);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const text = input.trim();
    addUserMessage(text);
    setInput('');
    processInput(text);
  };

  const processInput = (text: string) => {
    const choice = text.trim();

    // --- MAIN MENU ---
    if (step === 'MAIN_MENU') {
      if (choice === '1') {
        setStep('CATEGORY_SELECT');
        const categories = Array.from(new Set(products.map(p => p.category)));
        const catList = categories.map((c, i) => `${i + 1}. ${c}`).join('\n');
        addBotMessage(`Ótimo! Escolha uma categoria:\n\n${catList}`);
      } else if (choice === '2') {
        addBotMessage(`Ok! Um de nossos atendentes irá responder em breve.\n(Simulação: Fim do fluxo do robô)`);
      } else if (choice === '3') {
        addBotMessage(`Funcionamos todos os dias das 18h às 23h.`);
        setTimeout(() => showMainMenu(), 2000);
      } else {
        addBotMessage(`⚠️ Opção inválida. Digite 1, 2 ou 3.`);
      }
      return;
    }

    // --- CATEGORY SELECT ---
    if (step === 'CATEGORY_SELECT') {
      const categories = Array.from(new Set(products.map(p => p.category)));
      const index = parseInt(choice) - 1;
      
      if (index >= 0 && index < categories.length) {
        const cat = categories[index];
        setSelectedCategory(cat);
        setStep('PRODUCT_SELECT');
        
        const catProducts = products.filter(p => p.category === cat);
        const prodList = catProducts.map((p, i) => `${i + 1}. *${p.name}* - R$ ${p.price.toFixed(2)}`).join('\n');
        
        addBotMessage(`Aqui estão as opções de *${cat}*:\n\n${prodList}\n\nDigite o número do produto ou '0' para voltar.`);
      } else {
        addBotMessage(`⚠️ Categoria inválida. Tente novamente.`);
      }
      return;
    }

    // --- PRODUCT SELECT ---
    if (step === 'PRODUCT_SELECT' && selectedCategory) {
      if (choice === '0') {
        showMainMenu();
        return;
      }

      const catProducts = products.filter(p => p.category === selectedCategory);
      const index = parseInt(choice) - 1;

      if (index >= 0 && index < catProducts.length) {
        const prod = catProducts[index];
        setSelectedProduct(prod);
        setStep('QUANTITY');
        addBotMessage(`Você escolheu: *${prod.name}* (R$ ${prod.price.toFixed(2)}).\n\nQuantas unidades você deseja?`);
      } else {
        addBotMessage(`⚠️ Produto inválido.`);
      }
      return;
    }

    // --- QUANTITY ---
    if (step === 'QUANTITY' && selectedProduct) {
      const qty = parseInt(choice);
      if (qty > 0) {
        const newItem: OrderItem = {
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          quantity: qty,
          unitPrice: selectedProduct.price,
          notes: ''
        };
        
        const newCart = [...cart, newItem];
        setCart(newCart);
        setStep('CONFIRM_CART');
        
        const subtotal = newCart.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
        addBotMessage(`✅ Adicionado! Seu carrinho:\n\n${newCart.map(i => `${i.quantity}x ${i.productName}`).join('\n')}\n\n*Total: R$ ${subtotal.toFixed(2)}*\n\nDigite:\n1️⃣ Adicionar mais itens\n2️⃣ Fechar Pedido`);
      } else {
        addBotMessage(`⚠️ Quantidade inválida. Digite um número maior que 0.`);
      }
      return;
    }

    // --- CONFIRM CART ---
    if (step === 'CONFIRM_CART') {
      if (choice === '1') {
        setStep('CATEGORY_SELECT');
        const categories = Array.from(new Set(products.map(p => p.category)));
        const catList = categories.map((c, i) => `${i + 1}. ${c}`).join('\n');
        addBotMessage(`Escolha a categoria:\n\n${catList}`);
      } else if (choice === '2') {
        setStep('ADDRESS');
        addBotMessage(`Perfeito! Para entrega, por favor digite seu *Endereço Completo* (Rua, Número e Bairro).`);
      } else {
        addBotMessage(`⚠️ Opção inválida. 1 ou 2.`);
      }
      return;
    }

    // --- ADDRESS ---
    if (step === 'ADDRESS') {
      setDeliveryAddress(text);
      setStep('PAYMENT');
      addBotMessage(`Anotado! 📝\n\nQual a forma de pagamento?\n1️⃣ Pix\n2️⃣ Cartão\n3️⃣ Dinheiro`);
      return;
    }

    // --- PAYMENT & FINISH ---
    if (step === 'PAYMENT') {
      let method = PaymentMethod.CASH;
      if (choice === '1' || choice.toLowerCase().includes('pix')) method = PaymentMethod.PIX;
      else if (choice === '2' || choice.toLowerCase().includes('cart')) method = PaymentMethod.CARD;
      else if (choice === '3' || choice.toLowerCase().includes('din')) method = PaymentMethod.CASH;
      else {
        addBotMessage(`⚠️ Escolha 1, 2 ou 3.`);
        return;
      }

      setStep('FINISHED');
      
      // FINALIZE ORDER
      const subtotal = cart.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
      const deliveryFee = 5.00; // Simulação
      const total = subtotal + deliveryFee;

      const newOrder: Order = {
        id: Math.floor(Math.random() * 10000).toString(), // Temp ID, will be fixed by main app
        source: 'WHATSAPP_BOT',
        clientId: 'whatsapp_guest',
        clientName: 'Cliente via WhatsApp',
        clientPhone: '(11) 99999-9999',
        deliveryAddress: deliveryAddress,
        items: cart,
        subtotal,
        deliveryFee,
        discount: 0,
        total,
        status: OrderStatus.PENDING,
        paymentMethod: method,
        paymentStatus: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      onCreateOrder(newOrder);

      addBotMessage(`🎉 *Pedido Realizado com Sucesso!*\n\nResumo:\n${cart.map(i => `${i.quantity}x ${i.productName}`).join('\n')}\nEndereço: ${deliveryAddress}\nTotal com Entrega: R$ ${total.toFixed(2)}\n\nO restaurante já recebeu seu pedido e começará o preparo em instantes. Obrigado!`);
      return;
    }
  };

  // --- RENDER BLOCKED STATE ---
  if (!isConnected) {
      return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 text-center animate-in fade-in zoom-in">
                <div className="bg-red-100 p-4 rounded-full text-red-500 w-fit mx-auto mb-4">
                    <Smartphone size={40} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">WhatsApp Desconectado</h2>
                <p className="text-gray-500 text-sm mb-6">
                    O robô não pode funcionar sem uma conexão ativa com o seu WhatsApp.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-left text-xs text-gray-600 mb-6">
                    <p className="font-bold mb-2">Para resolver:</p>
                    <ol className="list-decimal list-inside space-y-1">
                        <li>Feche esta janela</li>
                        <li>Vá em <strong>Configurações</strong></li>
                        <li>Procure por <strong>Conexão WhatsApp</strong></li>
                        <li>Escaneie o QR Code</li>
                    </ol>
                </div>
                <button 
                    onClick={onClose}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition"
                >
                    Entendi, vou conectar
                </button>
            </div>
        </div>
      );
  }

  // --- RENDER CONNECTED STATE ---
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#efeae2] w-full max-w-md h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="bg-[#00a884] p-3 flex items-center justify-between text-white shadow-sm z-10">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
                {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-cover"/> : <MessageCircle className="text-gray-400"/>}
             </div>
             <div>
                <h3 className="font-bold text-sm leading-tight">{settings.name}</h3>
                <p className="text-xs text-white/80">Bot • Online</p>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <Video size={20} />
             <Phone size={20} />
             <MoreVertical size={20} />
             <button onClick={onClose}><X size={24} /></button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat" ref={scrollRef}>
           <div className="bg-[#ffeba0] text-gray-800 text-xs p-2 rounded-lg text-center shadow-sm mx-auto w-fit mb-4 border border-[#f5d96f]">
             🔒 As mensagens são protegidas com criptografia de ponta-a-ponta.
           </div>
           
           {messages.map((msg) => (
             <div key={msg.id} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] p-2 rounded-lg shadow-sm text-sm relative pb-5 ${msg.isBot ? 'bg-white rounded-tl-none' : 'bg-[#d9fdd3] rounded-tr-none'}`}>
                   <p className="whitespace-pre-line text-gray-800 leading-relaxed">{msg.text}</p>
                   <span className="text-[10px] text-gray-500 absolute bottom-1 right-2 flex items-center gap-1">
                      {msg.timestamp}
                      {!msg.isBot && <span className="text-blue-500 font-bold">✓✓</span>}
                   </span>
                </div>
             </div>
           ))}

           {isTyping && (
             <div className="flex justify-start animate-in fade-in">
                <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm flex gap-1">
                   <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                   <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                   <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                </div>
             </div>
           )}
        </div>

        {/* Input Area */}
        <div className="bg-[#f0f2f5] p-2 flex items-center gap-2">
           <div className="flex gap-3 text-gray-500 px-2">
              <Smile size={24} />
              <Paperclip size={24} />
           </div>
           <div className="flex-1 bg-white rounded-lg px-4 py-2 shadow-sm">
              <input 
                type="text" 
                className="w-full outline-none text-gray-700 placeholder-gray-400"
                placeholder="Digite uma mensagem"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                autoFocus
              />
           </div>
           {input.trim() ? (
             <button onClick={handleSend} className="bg-[#00a884] text-white p-2.5 rounded-full shadow-sm hover:bg-[#008f6f] transition">
                <Send size={20} />
             </button>
           ) : (
             <button className="bg-[#00a884] text-white p-2.5 rounded-full shadow-sm hover:bg-[#008f6f] transition">
                <Mic size={20} />
             </button>
           )}
        </div>

      </div>
    </div>
  );
};
