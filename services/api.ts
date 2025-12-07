// Este arquivo serve para conectar o frontend ao backend FastAPI
// Para ativar, você precisará substituir as chamadas de localStorage em StoreApp.tsx por estas funções.

const API_URL = "http://localhost:8000";

export const api = {
  // --- PRODUCTS ---
  async getProducts(storeId: string) {
    const res = await fetch(`${API_URL}/store/${storeId}/products`);
    return res.json();
  },
  async createProduct(storeId: string, product: any) {
    const res = await fetch(`${API_URL}/store/${storeId}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });
    return res.json();
  },

  // --- CLIENTS ---
  async getClients(storeId: string) {
    const res = await fetch(`${API_URL}/store/${storeId}/clients`);
    return res.json();
  },
  async createClient(storeId: string, client: any) {
    const res = await fetch(`${API_URL}/store/${storeId}/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(client),
    });
    return res.json();
  },

  // --- ORDERS ---
  async getOrders(storeId: string) {
    const res = await fetch(`${API_URL}/store/${storeId}/orders`);
    return res.json();
  },
  async createOrder(storeId: string, order: any) {
    const res = await fetch(`${API_URL}/store/${storeId}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    return res.json();
  },
  async updateOrder(storeId: string, orderId: string, updates: any) {
    const res = await fetch(`${API_URL}/store/${storeId}/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  // --- SETTINGS ---
  async getSettings(storeId: string) {
    const res = await fetch(`${API_URL}/store/${storeId}/settings`);
    return res.json();
  },
  async saveSettings(storeId: string, settings: any) {
    const res = await fetch(`${API_URL}/store/${storeId}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    return res.json();
  },
  
  // --- DRIVERS ---
  async getDrivers(storeId: string) {
    const res = await fetch(`${API_URL}/store/${storeId}/drivers`);
    return res.json();
  },
  async createDriver(storeId: string, driver: any) {
    const res = await fetch(`${API_URL}/store/${storeId}/drivers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(driver),
    });
    return res.json();
  }
};
