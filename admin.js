const admin$ = id => document.getElementById(id);
const adminEscape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);

let adminPin = "";
let allOrders = [];
let refreshTimer = null;

function orderItems(row) {
  return [
    row.card_quantity && `新規カード ${row.card_quantity}枚`,
    row.free_quantity && `フリー券 ${row.free_quantity}枚`,
    row.set_quantity && `セット券 ${row.set_quantity}枚`,
    row.receipt_quantity && `領収書 ${row.receipt_quantity}冊`,
    row.handwritten_male_quantity && `手書き名札（男性用）${row.handwritten_male_quantity}枚`,
    row.handwritten_female_quantity && `手書き名札（女性用）${row.handwritten_female_quantity}枚`
  ].filter(Boolean).join(" ／ ") || "数量指定なし";
}

function nameTagText(row) {
  return (row.name_tags || []).map(tag =>
    `${tag.name}（${tag.gender}${tag.extra ? `・${tag.extra}` : ""}）${tag.quantity}枚`
  ).join(" ／ ");
}

function statusClass(status) {
  if (status === "完了") return "status-complete";
  if (status === "手配中") return "status-working";
  return "status-new";
}

function renderOrders() {
  const store = admin$("storeFilter").value;
  const status = admin$("statusFilter").value;
  const rows = allOrders.filter(row => (!store || row.store === store) && (!status || row.status === status));
  admin$("visibleCount").textContent = `${rows.length}件`;
  admin$("newCount").textContent = allOrders.filter(row => row.status === "未手配").length;
  admin$("workingCount").textContent = allOrders.filter(row => row.status === "手配中").length;
  admin$("completeCount").textContent = allOrders.filter(row => row.status === "完了").length;
  admin$("ordersStatus").textContent = rows.length ? "" : "該当する発注はありません。";
  admin$("ordersList").innerHTML = rows.map(row => `
    <article class="admin-order ${row.status === "完了" ? "is-complete" : ""}" data-id="${adminEscape(row.order_id)}">
      <div class="order-meta">
        <span class="order-store">${adminEscape(row.store)}</span>
        <span class="order-date">発注日 ${adminEscape(row.order_date)}</span>
        <span class="order-id">${adminEscape(row.order_id)}</span>
      </div>
      <div class="order-detail">
        <h3>担当：${adminEscape(row.staff)}　／　納品：${adminEscape(row.delivery_type)}${row.delivery_date ? `（${adminEscape(row.delivery_date)}）` : ""}</h3>
        <p class="order-products">${adminEscape(orderItems(row))}</p>
        ${nameTagText(row) ? `<p><b>名札：</b>${adminEscape(nameTagText(row))}</p>` : ""}
        ${row.notes ? `<p><b>備考：</b>${adminEscape(row.notes)}</p>` : ""}
      </div>
      <div class="status-control">
        <label for="status-${adminEscape(row.id)}">対応状況</label>
        <select id="status-${adminEscape(row.id)}" class="status-select ${statusClass(row.status)}" data-order-id="${adminEscape(row.order_id)}">
          <option ${row.status === "未手配" ? "selected" : ""}>未手配</option>
          <option ${row.status === "手配中" ? "selected" : ""}>手配中</option>
          <option ${row.status === "完了" ? "selected" : ""}>完了</option>
        </select>
        <span class="status-note">${row.completed_at ? `完了：${new Date(row.completed_at).toLocaleString("ja-JP")}` : ""}</span>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".status-select").forEach(select => {
    select.addEventListener("change", async event => {
      const control = event.currentTarget;
      control.disabled = true;
      const note = control.closest(".status-control").querySelector(".status-note");
      note.textContent = "更新中…";
      try {
        await window.welcomeOrders.adminUpdateStatus(adminPin, control.dataset.orderId, control.value);
        await loadOrders(false);
      } catch (error) {
        note.textContent = "更新できませんでした";
        console.error(error);
      } finally {
        control.disabled = false;
      }
    });
  });
}

async function loadOrders(showLoading = true) {
  if (showLoading) admin$("ordersStatus").textContent = "読み込んでいます…";
  try {
    allOrders = await window.welcomeOrders.adminList(adminPin);
    renderOrders();
    admin$("lastUpdated").textContent = `最終更新：${new Date().toLocaleString("ja-JP")}`;
  } catch (error) {
    if (showLoading) admin$("ordersStatus").textContent = "発注一覧を読み込めませんでした。";
    throw error;
  }
}

admin$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  adminPin = admin$("adminPin").value;
  admin$("loginStatus").textContent = "確認しています…";
  try {
    await loadOrders();
    admin$("loginPanel").hidden = true;
    admin$("dashboard").hidden = false;
    refreshTimer = setInterval(() => loadOrders(false).catch(console.error), 30000);
  } catch (error) {
    adminPin = "";
    admin$("loginStatus").textContent = "PINが違うか、保存先の設定が完了していません。";
    console.error(error);
  }
});
admin$("storeFilter").addEventListener("change", renderOrders);
admin$("statusFilter").addEventListener("change", renderOrders);
admin$("refreshButton").addEventListener("click", () => loadOrders().catch(console.error));
window.addEventListener("beforeunload", () => clearInterval(refreshTimer));
