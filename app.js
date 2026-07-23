const $ = id => document.getElementById(id);
const numberValue = value => {
  const parsed = Number(String(value || "0").replace(/[^0-9]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);
const today = () => new Date().toLocaleDateString("sv-SE");
const createOrderId = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  }).formatToParts(now).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}${parts.second}`;
};

function addNameRow() {
  const row = $("nameTemplate").content.cloneNode(true);
  const nameInput = row.querySelector(".tag-name");
  const genderSelect = row.querySelector(".tag-gender");
  const extraInput = row.querySelector(".tag-extra");
  const syncRequired = () => {
    const rowHasInput = Boolean(nameInput.value.trim() || genderSelect.value || extraInput.value.trim());
    genderSelect.required = rowHasInput;
    nameInput.required = Boolean(genderSelect.value || extraInput.value.trim());
  };
  nameInput.addEventListener("input", syncRequired);
  genderSelect.addEventListener("change", syncRequired);
  extraInput.addEventListener("input", syncRequired);
  row.querySelector(".remove-button").addEventListener("click", event => {
    event.currentTarget.closest(".name-row").remove();
    if (!$("nameRows").children.length) addNameRow();
  });
  $("nameRows").append(row);
}

function collectNameTags() {
  return [...document.querySelectorAll(".name-row")]
    .map(row => ({
      name: row.querySelector(".tag-name").value.trim(),
      gender: row.querySelector(".tag-gender").value,
      extra: row.querySelector(".tag-extra").value.trim(),
      quantity: numberValue(row.querySelector(".tag-quantity").value)
    }))
    .filter(row => row.name || row.gender || row.extra);
}

function validateNameTags(rows) {
  rows.forEach((row, index) => {
    if (!row.name) throw new Error(`名札${index + 1}人目の名前を入力してください。`);
    if (!row.gender) throw new Error(`名札${index + 1}人目の性別を選択してください。`);
  });
}

function buildPayload() {
  const nameTags = collectNameTags();
  validateNameTags(nameTags);
  const deliveryType = document.querySelector("[name=delivery]:checked").value;
  return {
    order_id: createOrderId(),
    store: $("store").value,
    staff: $("staff").value.trim(),
    order_date: $("orderDate").value || today(),
    delivery_type: deliveryType,
    delivery_date: deliveryType === "至急" ? ($("deliveryDate").value || null) : null,
    card_quantity: numberValue($("cardQuantity").value),
    free_quantity: numberValue($("freeQuantity").value),
    set_quantity: numberValue($("setQuantity").value),
    receipt_quantity: numberValue($("receiptQuantity").value),
    handwritten_male_quantity: numberValue($("handwrittenMaleQuantity").value),
    handwritten_female_quantity: numberValue($("handwrittenFemaleQuantity").value),
    name_tags: nameTags,
    notes: $("notes").value.trim()
  };
}

function hasOrderContent(data) {
  return data.name_tags.length > 0 ||
    data.card_quantity > 0 ||
    data.free_quantity > 0 ||
    data.set_quantity > 0 ||
    data.receipt_quantity > 0 ||
    data.handwritten_male_quantity > 0 ||
    data.handwritten_female_quantity > 0;
}

function renderHistory(rows) {
  $("historyStatus").textContent = rows.length ? "" : "この店舗の発注履歴はまだありません。";
  $("historyList").innerHTML = rows.map(row => {
    const items = [
      `新規カード ${row.card_quantity || 0}枚`,
      `フリー券 ${row.free_quantity || 0}枚`,
      `セット券 ${row.set_quantity || 0}枚`,
      `領収書 ${row.receipt_quantity || 0}冊`,
      `手書き名札 男性用${row.handwritten_male_quantity || 0}枚・女性用${row.handwritten_female_quantity || 0}枚`
    ].join(" ／ ");
    const tags = (row.name_tags || []).map(tag =>
      `${tag.name}（${tag.gender}${tag.extra ? `・${tag.extra}` : ""}）${tag.quantity}枚`
    ).join("<br>");
    return `<article class="history-card">
      <header><strong>${escapeHtml(row.order_date)}</strong><span>${escapeHtml(row.order_id)}</span></header>
      <p>担当：${escapeHtml(row.staff)}　納品：${escapeHtml(row.delivery_type)}${row.delivery_date ? `（${escapeHtml(row.delivery_date)}）` : ""}</p>
      <p class="order-items">${escapeHtml(items)}</p>
      ${tags ? `<p><b>名札：</b><br>${tags}</p>` : ""}
      ${row.notes ? `<p><b>備考：</b>${escapeHtml(row.notes)}</p>` : ""}
    </article>`;
  }).join("");
}

$("addName").addEventListener("click", addNameRow);
$("store").addEventListener("change", () => {
  $("historyButton").hidden = !$("store").value;
  $("historyPanel").hidden = true;
  $("historyList").innerHTML = "";
});
$("historyButton").addEventListener("click", async () => {
  const store = $("store").value;
  if (!store) return;
  $("historyPanel").hidden = false;
  $("historyTitle").textContent = `${store}の発注履歴（最新10件）`;
  $("historyStatus").textContent = "読み込んでいます…";
  $("historyList").innerHTML = "";
  $("historyButton").disabled = true;
  try {
    renderHistory(await window.welcomeOrders.list(store));
  } catch (error) {
    $("historyStatus").textContent = "履歴を読み込めませんでした。しばらくしてからもう一度お試しください。";
    console.error(error);
  } finally {
    $("historyButton").disabled = false;
  }
});
$("historyClose").addEventListener("click", () => { $("historyPanel").hidden = true; });
document.querySelectorAll("[name=delivery]").forEach(radio => {
  radio.addEventListener("change", () => {
    const urgent = document.querySelector("[name=delivery]:checked").value === "至急";
    $("dateField").hidden = !urgent;
    $("deliveryDate").required = urgent;
    if (!urgent) $("deliveryDate").value = "";
  });
});
$("orderForm").addEventListener("submit", event => {
  event.preventDefault();
});
$("orderForm").addEventListener("keydown", event => {
  if (event.key === "Enter" && event.target.tagName !== "TEXTAREA") {
    event.preventDefault();
  }
});
$("submit").addEventListener("click", async () => {
  if (!$("orderForm").reportValidity()) return;
  const button = $("submit");
  button.disabled = true;
  $("status").textContent = "送信しています…";
  try {
    const payload = buildPayload();
    if (!hasOrderContent(payload)) {
      $("status").textContent = "";
      $("emptyOrderDialog").showModal();
      return;
    }
    const saved = await window.welcomeOrders.create(payload);
    $("orderId").textContent = saved.order_id;
    $("orderForm").hidden = true;
    $("success").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    $("status").textContent = error.message?.startsWith("名札") ? error.message : "送信できませんでした。入力内容と通信状況をご確認ください。";
    console.error(error);
  } finally {
    button.disabled = false;
  }
});
$("closeEmptyOrder").addEventListener("click", () => $("emptyOrderDialog").close());
$("newOrder").addEventListener("click", () => location.reload());

$("orderDate").value = today();
addNameRow();
