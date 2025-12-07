import { Client, LocalAuth, Message as WpMessage } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

interface ShoppingCart {
    state: 'NAME' | 'NAME_CHECKOUT' | 'MENU' | 'ORDERING' | 'ADDRESS' | 'ADDRESS_NUMBER' | 'ADDRESS_REF' | 'PAYMENT' | 'CONFIRM' | 'PIZZA_BUILDER_1' | 'PIZZA_BUILDER_2';
    items: Array<{
        productId: string;
        name: string;
        price: number;
        quantity: number;
        isHalfHalf?: boolean;
        secondFlavorName?: string;
    }>;
    tempPizza?: { flavor1?: any; flavor2?: any };
    address?: string;
    location?: { lat: number; lng: number };
    deliveryFee?: number;
    total?: number;
    paymentMethod?: 'CASH' | 'CARD' | 'PIX';
}

// Fallback coordinates (Central São Paulo) if not in DB
const DEFAULT_LAT = -23.550520;
const DEFAULT_LNG = -46.633308;

class WhatsappService {
    private client: Client;
    private qrCodeData: string | null = null;
    private status: 'DISCONNECTED' | 'CONNECTED' | 'QR_READY' = 'DISCONNECTED';

    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            }
        });

        this.initialize();
    }

    private initialize() {
        this.client.on('qr', async (qr) => {
            console.log('QR RECEIVED', qr);
            this.qrCodeData = await qrcode.toDataURL(qr);
            this.status = 'QR_READY';
        });

        this.client.on('ready', () => {
            console.log('WhatsApp Client is ready!');
            this.status = 'CONNECTED';
            this.qrCodeData = null;
        });

        this.client.on('message', async (msg) => {
            if (msg.fromMe) return;
            this.handleMessage(msg);
        });

        this.client.initialize();
    }

    private async handleMessage(msg: WpMessage) {
        let chat;
        try {
            chat = await msg.getChat();
        } catch (error) {
            console.error('Failed to get chat', error);
            return;
        }

        const remoteJid = chat.id._serialized;

        // SAFE CONTACT RETRIEVAL
        let contactName = 'Cliente';
        let phoneNumber = remoteJid.split('@')[0];

        try {
            const contact = await msg.getContact();
            contactName = contact.pushname || contact.name || 'Cliente';
            phoneNumber = contact.number || phoneNumber;
        } catch (e) {
            console.log('Error fetching contact details', e);
        }

        // 0. SYNC CLIENT
        let client = await prisma.client.findFirst({ where: { phone: phoneNumber } });
        if (!client) {
            console.log(`[Bot] New Client detected: ${contactName} (${phoneNumber})`);
            client = await prisma.client.create({
                data: { name: contactName, phone: phoneNumber }
            });
        }

        // 1. Find or Create Chat
        let dbChat = await prisma.chat.findUnique({ where: { remoteJid } });
        if (!dbChat) {
            dbChat = await prisma.chat.create({
                data: {
                    remoteJid,
                    contactName: contactName,
                    botStatus: 'ACTIVE',
                    // @ts-ignore
                    tempData: JSON.stringify({ state: 'MENU', items: [] })
                }
            });
        }

        // 2. Save Message Log
        await prisma.message.create({
            data: {
                body: msg.body,
                fromMe: false,
                chatId: dbChat.id,
                timestamp: new Date(msg.timestamp * 1000)
            }
        });

        // 3. Bot Logic
        if (dbChat.botStatus === 'ACTIVE') {
            await this.runBotLogic(msg, dbChat, client);
        }
    }

    // Helper to send reply AND save to DB
    private async replyAndSave(msg: WpMessage, body: string, dbChatId: string) {
        await msg.reply(body);
        await prisma.message.create({
            data: {
                body: body,
                fromMe: true,
                chatId: dbChatId,
                timestamp: new Date()
            }
        });
    }

    private async runBotLogic(msg: WpMessage, dbChat: any, client: any) {
        const body = msg.body.trim();
        const lowerBody = body.toLowerCase();

        // Fetch Store Settings for Branding and Location
        const settings = await prisma.storeSettings.findFirst();
        const storeName = settings?.name || 'Delivery Master';
        // @ts-ignore - We will add these fields to schema next
        const storeLat = settings?.latitude ? Number(settings.latitude) : DEFAULT_LAT;
        // @ts-ignore
        const storeLng = settings?.longitude ? Number(settings.longitude) : DEFAULT_LNG;

        // Load Cart State
        // @ts-ignore
        let cart: ShoppingCart = dbChat.tempData
            // @ts-ignore
            ? JSON.parse(dbChat.tempData)
            : { state: 'MENU', items: [] };

        // --- GLOBAL COMMANDS ---
        if (['cancelar', 'reiniciar', 'menu', 'oi', 'ola'].includes(lowerBody)) {
            // Check if we know the name
            if (client.name === 'Cliente' || client.name === client.phone) {
                cart = { state: 'NAME', items: [] };
                await this.saveCart(dbChat.id, cart);
                await this.replyAndSave(msg, `👋 Olá! Bem-vindo ao *${storeName}*.\n\nPara começarmos, por favor digite seu *NOME*:`, dbChat.id);
                return;
            }

            cart = { state: 'MENU', items: [] };
            await this.saveCart(dbChat.id, cart);
            await this.replyAndSave(msg, `👋 Olá *${client.name.split(' ')[0]}*! Bem-vindo ao *${storeName}* 🍕.\n\nSou seu assistente virtual. Digite o número da opção:\n\n1️⃣ *Ver Cardápio*\n2️⃣ *Falar com Atendente*`, dbChat.id);
            return;
        }

        if (lowerBody === '2') {
            await this.pauseBot(dbChat.id, msg);
            return;
        }

        // --- STATE MACHINE ---
        switch (cart.state) {
            case 'NAME':
                if (body.length < 3) {
                    await this.replyAndSave(msg, 'Nome muito curto. Por favor, digite seu nome completo ou apelido.', dbChat.id);
                } else {
                    // Update Client in DB
                    await prisma.client.update({ where: { id: client.id }, data: { name: body } });
                    client.name = body;

                    cart.state = 'MENU';
                    await this.saveCart(dbChat.id, cart);
                    await this.replyAndSave(msg, `Prazer, *${body}*! Agora sim.\n\nDigite o número da opção:\n\n1️⃣ *Ver Cardápio*\n2️⃣ *Falar com Atendente*`, dbChat.id);
                }
                break;

            case 'NAME_CHECKOUT':
                if (body.length < 3) {
                    await this.replyAndSave(msg, 'Nome muito curto. Tente novamente.', dbChat.id);
                } else {
                    await prisma.client.update({ where: { id: client.id }, data: { name: body } });
                    client.name = body;
                    cart.state = 'ADDRESS';
                    await this.saveCart(dbChat.id, cart);
                    await this.replyAndSave(msg, `Obrigado, *${body}*! \n\n📍 *Entrega:* Envie sua *LOCALIZAÇÃO* do WhatsApp ou digite seu Endereço completo.`, dbChat.id);
                }
                break;

            case 'MENU':
                if (lowerBody === '1' || lowerBody === 'ver cardapio') {
                    await this.showMenu(msg, dbChat.id, storeName);
                    cart.state = 'ORDERING';
                    await this.saveCart(dbChat.id, cart);
                } else {
                    await this.replyAndSave(msg, 'Digite *1* para ver o cardápio ou *2* para ajuda.', dbChat.id);
                }
                break;

            case 'ORDERING':
                if (lowerBody === 'finalizar' || lowerBody === 'fechar pedido') {
                    if (cart.items.length === 0) {
                        await this.replyAndSave(msg, 'Seu carrinho está vazio! Peça algo antes de finalizar.', dbChat.id);
                    } else {
                        // FORCE NAME CHECK
                        if (client.name === 'Cliente' || client.name === client.phone) {
                            cart.state = 'NAME_CHECKOUT';
                            await this.saveCart(dbChat.id, cart);
                            await this.replyAndSave(msg, '📝 Antes de continuar, digite seu *NOME*:', dbChat.id);
                            return;
                        }

                        cart.state = 'ADDRESS';
                        await this.saveCart(dbChat.id, cart);
                        await this.replyAndSave(msg, '📍 *Entrega:* Envie sua *LOCALIZAÇÃO* do WhatsApp (clipe -> Localização) ou digite seu Endereço completo.', dbChat.id);
                    }
                    return;
                }

                // TRIGGER HALF-HALF
                if (lowerBody.includes('meia') || lowerBody.includes('metade')) {
                    cart.state = 'PIZZA_BUILDER_1';
                    cart.tempPizza = {};
                    await this.saveCart(dbChat.id, cart);
                    await this.replyAndSave(msg, '🍕 *Montar Pizza Meio a Meio*\n\nDigite o nome do **1º SABOR**:', dbChat.id);
                    return;
                }

                // Improved Fuzzy Matching
                const products = await prisma.product.findMany({}); // Show all products

                // Helper to remove accents
                const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                const cleanBody = normalize(msg.body);

                // Find best match
                const matchedProduct = products.find(p => {
                    const cleanName = normalize(p.name);
                    if (cleanBody.includes(cleanName)) return true;
                    // Check if user typed enough significant words
                    const tokens = cleanName.split(' ').filter(t => t.length > 2);
                    return tokens.length > 0 && tokens.every(t => cleanBody.includes(t));
                });

                if (matchedProduct) {
                    // INTERCEPT PIZZA for Half-Half
                    if (matchedProduct.category === 'PIZZA') {
                        cart.tempPizza = { flavor1: matchedProduct };
                        cart.state = 'PIZZA_BUILDER_2';
                        await this.saveCart(dbChat.id, cart);
                        await this.replyAndSave(msg, `🍕 Você escolheu *${matchedProduct.name}*.\n\nQuer adicionar um 2º sabor (Meio a Meio)?\nDigite o nome do 2º sabor ou *"NÃO"* para pedir inteira.`, dbChat.id);
                        return;
                    }

                    const qtyMatch = lowerBody.match(/(\d+)/);
                    const quantity = qtyMatch ? parseInt(qtyMatch[0]) : 1;

                    cart.items.push({
                        productId: matchedProduct.id,
                        name: matchedProduct.name,
                        price: matchedProduct.price,
                        quantity: quantity
                    });

                    await this.saveCart(dbChat.id, cart);
                    const total = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

                    await this.replyAndSave(msg, `✅ *Adicionado:* ${quantity}x ${matchedProduct.name}\n🛒 *Total Parcial:* R$ ${total.toFixed(2)}\n\nDigite o nome de mais produtos ou *FINALIZAR*.`, dbChat.id);
                } else {
                    if (lowerBody.length > 3 && !['ok', 'sim'].includes(lowerBody)) {
                        await this.replyAndSave(msg, '🤔 Não encontrei esse produto no cardápio.\n\nDigite o nome do lanche (ex: "X-Burger") ou *FINALIZAR*.', dbChat.id);
                    }
                }
                break;

            case 'PIZZA_BUILDER_1':
                {
                    const products = await prisma.product.findMany({ where: { category: 'PIZZA' } });
                    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                    const cleanBody = normalize(msg.body);
                    // Loose matching
                    const matched = products.find(p => normalize(p.name).includes(cleanBody));

                    if (matched) {
                        cart.tempPizza = { flavor1: matched };
                        cart.state = 'PIZZA_BUILDER_2';
                        await this.saveCart(dbChat.id, cart);
                        await this.replyAndSave(msg, `✔️ 1º Sabor: ${matched.name}\n\nAgora digite o **2º SABOR**:`, dbChat.id);
                    } else {
                        await this.replyAndSave(msg, '❌ Sabor não encontrado nas Pizzas. Tente novamente ou digite *CANCELAR*.', dbChat.id);
                    }
                }
                break;

            case 'PIZZA_BUILDER_2':
                {
                    const products = await prisma.product.findMany({ where: { category: 'PIZZA' } });
                    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                    const cleanBody = normalize(msg.body);

                    // ALLOW "NO/NAO" to skip 2nd flavor (Single Flavor Pizza)
                    if (['nao', 'nao quero', 'unica', 'inteira', 'so uma', '1', 'no'].includes(cleanBody)) {
                        const p1 = cart.tempPizza?.flavor1;
                        if (p1) {
                            cart.items.push({
                                productId: p1.id,
                                name: p1.name,
                                price: p1.price,
                                quantity: 1
                            });

                            cart.state = 'ORDERING';
                            cart.tempPizza = undefined;
                            await this.saveCart(dbChat.id, cart);
                            await this.replyAndSave(msg, `✅ Adicionado: 1x ${p1.name}\n💲 R$ ${p1.price.toFixed(2)}\n\nMais alguma coisa? Digite o nome ou *FINALIZAR*.`, dbChat.id);
                        } else {
                            // Recovery
                            cart.state = 'ORDERING';
                            await this.saveCart(dbChat.id, cart);
                            await this.replyAndSave(msg, 'Erro interno. Escolha o sabor novamente.', dbChat.id);
                        }
                        break;
                    }

                    const matched = products.find(p => normalize(p.name).includes(cleanBody));

                    if (matched) {
                        const p1 = cart.tempPizza?.flavor1;
                        if (!p1) {
                            await this.replyAndSave(msg, '⚠️ Erro técnico: Sabor 1 perdido. Por favor, reinicie o pedido digitando MENU.', dbChat.id);
                            cart.state = 'MENU';
                            await this.saveCart(dbChat.id, cart);
                            return;
                        }
                        const p2 = matched;
                        const finalPrice = Math.max(p1.price, p2.price);

                        cart.items.push({
                            productId: p1.price >= p2.price ? p1.id : p2.id, // ID of most expensive 
                            name: `Meia ${p1.name} / Meia ${p2.name}`,
                            price: finalPrice,
                            quantity: 1,
                            isHalfHalf: true,
                            secondFlavorName: p2.name
                        });

                        cart.state = 'ORDERING';
                        cart.tempPizza = undefined;
                        await this.saveCart(dbChat.id, cart);
                        await this.replyAndSave(msg, `🍕 Pizza Montada!\n\n1/2 ${p1.name} & 1/2 ${p2.name}\n💲 Valor: R$ ${finalPrice.toFixed(2)}\n\nDigite mais produtos ou *FINALIZAR*.`, dbChat.id);
                    } else {
                        await this.replyAndSave(msg, '❌ Sabor não encontrado. Digite o nome do 2º sabor ou *"NÃO"* para pedir inteira.', dbChat.id);
                    }
                }
                break;

            case 'ADDRESS':
                if (msg.location) {
                    const lat = Number(msg.location.latitude);
                    const lng = Number(msg.location.longitude);
                    const dist = this.calculateDistrict(lat, lng, storeLat, storeLng);
                    cart.location = { lat, lng };
                    // Dynamic Delivery Fee Logic based on Distance
                    let deliveryFee = 0;

                    // Parse ranges from settings
                    let ranges: any[] = [];
                    try {
                        if (settings?.deliveryRanges) {
                            ranges = JSON.parse(settings.deliveryRanges);
                        }
                    } catch (e) {
                        console.error("Error parsing delivery ranges", e);
                    }

                    // Find matching range
                    const match = ranges.find((r: any) => dist >= r.minKm && dist <= r.maxKm);

                    if (match) {
                        deliveryFee = Number(match.price);
                    } else {
                        // Fallback logic if no range matches (e.g. too far, or no ranges configured)
                        if (dist <= 2) deliveryFee = 5.00; // Default fallback
                        else if (dist <= 5) deliveryFee = 8.00;
                        else if (dist <= 10) deliveryFee = 15.00;
                        else deliveryFee = 20.00;
                    }

                    cart.deliveryFee = deliveryFee;
                    cart.address = '📍 Localização Maps';
                    cart.state = 'ADDRESS_NUMBER';
                    await this.saveCart(dbChat.id, cart);
                    await this.replyAndSave(msg, `✅ Localização recebida (Frete: R$ ${deliveryFee.toFixed(2)}).\n\nAgora digite o *NÚMERO DA CASA* e complemento (se houver):`, dbChat.id);
                } else {
                    cart.address = body;
                    cart.deliveryFee = 10.00; // Fixed fee for text addresses (fallback)
                    cart.state = 'ADDRESS_NUMBER';
                    await this.saveCart(dbChat.id, cart);
                    await this.replyAndSave(msg, `Certo! Agora digite o *NÚMERO DA CASA* e complemento:`, dbChat.id);
                }
                break;

            case 'ADDRESS_NUMBER':
                cart.address = `${cart.address}, ${body}`;
                cart.state = 'ADDRESS_REF';
                await this.saveCart(dbChat.id, cart);
                await this.replyAndSave(msg, `Ok. Tem algum *PONTO DE REFERÊNCIA*? (Ou digite 'Não')`, dbChat.id);
                break;

            case 'ADDRESS_REF':
                if (!['nao', 'não', 'no', 'nd'].includes(lowerBody)) {
                    cart.address = `${cart.address} (Ref: ${body})`;
                }

                const subtotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                cart.total = subtotal + (cart.deliveryFee || 0);

                cart.state = 'PAYMENT';
                await this.saveCart(dbChat.id, cart);
                await this.replyAndSave(msg, `💳 *Forma de Pagamento*\n\nEscolha a opção:\n\n1️⃣ *Pix* (Chave enviada no final)\n2️⃣ *Dinheiro*\n3️⃣ *Cartão* (Maquininha)`, dbChat.id);
                break;

            case 'PAYMENT':
                {
                    const methodMap: any = { '1': 'PIX', '2': 'CASH', '3': 'CARD', 'pix': 'PIX', 'dinheiro': 'CASH', 'cartao': 'CARD', 'cartão': 'CARD' };
                    const selected = methodMap[lowerBody] || null;
                    if (!selected) {
                        await this.replyAndSave(msg, '❌ Opção inválida. Digite:\n1️⃣ Pix\n2️⃣ Dinheiro\n3️⃣ Cartão', dbChat.id);
                        return;
                    }
                    cart.paymentMethod = selected;
                    cart.state = 'CONFIRM';
                    await this.saveCart(dbChat.id, cart);

                    const payLabel = selected === 'PIX' ? 'Pix' : selected === 'CASH' ? 'Dinheiro' : 'Cartão';

                    await this.replyAndSave(msg, `📝 *Resumo do Pedido*\n\n` +
                        cart.items.map(i => `${i.quantity}x ${i.name}`).join('\n') +
                        `\n\n🛵 Entrega: R$ ${cart.deliveryFee?.toFixed(2)}` +
                        `\n💳 Pagamento: ${payLabel}` +
                        `\n💰 *Total: R$ ${cart.total?.toFixed(2)}*` +
                        `\n\n📍 Endereço: ${cart.address}` +
                        `\n\n✅ Digite *OK* para confirmar ou *CANCELAR*.`, dbChat.id);
                }
                break;

            case 'CONFIRM':
                if (['ok', 'sim', 'confirmar'].includes(lowerBody)) {
                    await this.createOrder(msg, cart, client, dbChat.id);
                    cart = { state: 'MENU', items: [] };
                    await this.saveCart(dbChat.id, cart);
                } else {
                    await this.replyAndSave(msg, 'Pedido Cancelado. Digite *MENU* para começar de novo.', dbChat.id);
                    cart = { state: 'MENU', items: [] };
                    await this.saveCart(dbChat.id, cart);
                }
                break;
        }
    }

    private calculateDistrict(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private async showMenu(msg: WpMessage, dbChatId: string, storeName: string) {
        const products = await prisma.product.findMany({
            orderBy: { category: 'asc' }
        });

        console.log(`[Bot] showMenu: Found ${products.length} products in DB.`);

        if (products.length === 0) {
            await this.replyAndSave(msg, '😔 Cardápio vazio.', dbChatId);
            return;
        }

        let menuText = `*🍕 CARDÁPIO ${storeName.toUpperCase()} 🥤*\n\n`;
        const grouped: any = {};
        products.forEach(p => {
            if (!grouped[p.category]) grouped[p.category] = [];
            grouped[p.category].push(p);
        });

        const ProductCategoryLabels: Record<string, string> = {
            'SNACK': '🍔 Lanches',
            'PIZZA': '🍕 Pizzas',
            'DRINK': '🥤 Bebidas',
            'DESSERT': '🍰 Sobremesas'
        };

        for (const cat in grouped) {
            const label = ProductCategoryLabels[cat] || cat;
            menuText += `*${label}*\n`;
            grouped[cat].forEach((p: any) => menuText += `- ${p.name}: R$ ${p.price}\n`);
            menuText += '\n';
        }
        await this.replyAndSave(msg, menuText + '\n📝 *Como pedir:* Digite o nome do produto e a quantidade.', dbChatId);
    }

    private async saveCart(chatId: string, cart: ShoppingCart) {
        await prisma.chat.update({
            where: { id: chatId },
            // @ts-ignore
            data: { tempData: JSON.stringify(cart) }
        });
    }

    private async pauseBot(chatId: string, msg: WpMessage) {
        await prisma.chat.update({
            where: { id: chatId },
            data: { botStatus: 'PAUSED' }
        });
        await this.replyAndSave(msg, '✅ Atendente chamado! Aguarde um momento.', chatId);
    }

    private async createOrder(msg: WpMessage, cart: ShoppingCart, client: any, chatId: string) {
        // Create Order logic
        const order = await prisma.order.create({
            data: {
                clientId: client.id,
                clientName: client.name,
                clientPhone: client.phone,
                deliveryAddress: cart.address || 'Não informado',
                subtotal: cart.items.reduce((acc, i) => acc + (i.price * i.quantity), 0),
                deliveryFee: cart.deliveryFee || 0,
                total: cart.total || 0,
                paymentMethod: cart.paymentMethod || 'CASH',
                source: 'WHATSAPP_BOT',
                status: 'PENDING',
                items: {
                    create: cart.items.map(i => ({
                        productName: i.name,
                        quantity: i.quantity,
                        unitPrice: i.price,
                        productId: i.productId,
                        isHalfHalf: i.isHalfHalf || false,
                        secondFlavorName: i.secondFlavorName || null
                    }))
                }
            }
        });

        await this.replyAndSave(msg, `🎉 *Pedido #${order.id.slice(0, 4)} Recebido!* \n\nA cozinha já está preparando. Te aviso quando sair para entrega! 🛵`, chatId);
        console.log(`[KITCHEN] New Order #${order.id} from ${client.name}`);
    }

    public getStatus() { return { status: this.status, qrCode: this.qrCodeData }; }

    public async sendMessage(chatId: string, message: string) {
        const chat = await prisma.chat.findUnique({ where: { id: chatId } });
        if (!chat) throw new Error('Chat not found');

        await this.client.sendMessage(chat.remoteJid, message);

        await prisma.message.create({
            data: {
                body: message,
                fromMe: true,
                chatId: chat.id
            }
        });

        if (chat.botStatus === 'ACTIVE') {
            await prisma.chat.update({
                where: { id: chatId },
                data: { botStatus: 'PAUSED' }
            });
        }
    }

    public async sendDriverNotification(driverPhone: string, orderDetails: any) {
        if (!driverPhone) return;
        const cleanPhone = driverPhone.replace(/\D/g, '');
        const finalPhone = cleanPhone.length <= 11 ? '55' + cleanPhone : cleanPhone;
        const driverJid = `${finalPhone}@c.us`;

        const message = `🛵 *Nova Entrega para Você!*\n\n` +
            `*Pedido #:* ${orderDetails.id.slice(0, 8)}\n` +
            `*Cliente:* ${orderDetails.clientName}\n` +
            `*Endereço:* ${orderDetails.deliveryAddress}\n` +
            `*Total:* R$ ${orderDetails.total.toFixed(2)}\n\n` +
            `Por favor, confirme o recebimento no app.`;
        try {
            await this.client.sendMessage(driverJid, message);
        } catch (e) {
            console.error('Error sending driver notification', e);
        }
    }
}

export const whatsappService = new WhatsappService();
