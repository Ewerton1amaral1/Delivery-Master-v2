const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export const api = {
  // --- PRODUCTS ---
  async getProducts(storeId?: string) {
    const query = storeId ? `?storeId=${storeId}` : '';
    const res = await fetch(`${API_URL}/products${query}`);
    return res.json();
  },
  async createProduct(storeId: string, product: any) {
    const res = await fetch(`${API_URL}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });
    return res.json();
  },
  async updateProduct(id: string, updates: any) {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return res.json();
  },
  async deleteProduct(id: string) {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: "DELETE",
    });
    return res.json();
  },

  // --- CLIENTS ---
  async getClients(storeId?: string) {
    const res = await fetch(`${API_URL}/clients`);
    return res.json();
  },
  async createClient(storeId: string, client: any) {
    const res = await fetch(`${API_URL}/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(client),
    });
    return res.json();
  },

  // --- ORDERS ---
  async getOrders(storeId?: string) {
    const res = await fetch(`${API_URL}/orders`);
    return res.json();
  },
  async createOrder(storeId: string, order: any) {
    const res = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    return res.json();
  },
  async updateOrder(storeId: string, orderId: string, updates: any) {
    const res = await fetch(`${API_URL}/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  // --- SETTINGS ---
  async getSettings(storeId?: string) {
    const res = await fetch(`${API_URL}/settings`);
    return res.json();
  },
  async saveSettings(storeId: string, settings: any) {
    const res = await fetch(`${API_URL}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  // --- DRIVERS ---
  async getDrivers(storeId?: string) {
    const res = await fetch(`${API_URL}/drivers`);
    return res.json();
  },
  async createDriver(storeId: string, driver: any) {
    const res = await fetch(`${API_URL}/drivers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(driver),
    });
    return res.json();
  },

  // --- WHATSAPP ---
  async getWhatsappStatus() {
    const res = await fetch(`${API_URL}/whatsapp/status`);
    return res.json();
  },
  async getChats() {
    const res = await fetch(`${API_URL}/whatsapp/chats`);
    return res.json();
  },
  async getMessages(chatId: string) {
    const res = await fetch(`${API_URL}/whatsapp/chats/${chatId}/messages`);
    return res.json();
  },
  async sendMessage(chatId: string, message: string) {
    const res = await fetch(`${API_URL}/whatsapp/chats/${chatId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    return res.json();
  }
};
