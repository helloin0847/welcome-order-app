(function () {
  const SUPABASE_URL = "https://cenigdvpcxphljrravnb.supabase.co";
  const SUPABASE_KEY = "sb_publishable_z2-0LtZBDYOljZAqjS59QQ_kCotrZmI";
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json"
  };

  async function request(path, options = {}) {
    const response = await fetch(`${SUPABASE_URL}${path}`, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) }
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`保存先エラー（${response.status}）${detail ? `: ${detail}` : ""}`);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  window.welcomeOrders = {
    async create(data) {
      const rows = await request("/rest/v1/welcome_supply_orders", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(data)
      });
      return rows[0];
    },
    async list(store) {
      const query = new URLSearchParams({
        store: `eq.${store}`,
        select: "*",
        order: "created_at.desc",
        limit: "10"
      });
      return request(`/rest/v1/welcome_supply_orders?${query}`);
    },
    async adminList(pin) {
      return request("/rest/v1/rpc/welcome_admin_list_orders", {
        method: "POST",
        body: JSON.stringify({ p_pin: pin })
      });
    },
    async adminUpdateStatus(pin, orderId, status) {
      return request("/rest/v1/rpc/welcome_admin_update_status", {
        method: "POST",
        body: JSON.stringify({ p_pin: pin, p_order_id: orderId, p_status: status })
      });
    }
  };
})();
