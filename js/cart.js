"use strict";

/* ==========================================================
   cart.js — корзина, расчёт суммы, промокод

   Состояние корзины — массив объектов { id, qty } (только id и
   количество, а не копии товаров). Данные о товаре берутся из
   data.js по id, поэтому цена всегда актуальна.
   Корзина и промокод сохраняются в localStorage.
   ========================================================== */

const CART_MAX_QTY = 20; // максимум одинаковых букетов в заказе

let cartItems = loadCart();
let appliedPromoCode = loadPromoCode();

/* ---------- Загрузка и сохранение ---------- */

// Данные из localStorage считаем НЕнадёжными: пользователь (или другая
// программа) мог записать туда что угодно. Оставляем только корректные
// записи с существующим id и целым количеством.
function loadCart() {
  const stored = loadFromStorage(STORAGE_KEYS.cart, []);
  if (!Array.isArray(stored)) return [];

  const merged = new Map();
  stored.forEach((item) => {
    const isValid =
      item &&
      Number.isInteger(item.id) &&
      Number.isInteger(item.qty) &&
      item.qty > 0 &&
      getProductById(item.id);
    if (!isValid) return;
    const qty = Math.min((merged.get(item.id) || 0) + item.qty, CART_MAX_QTY);
    merged.set(item.id, qty);
  });
  return Array.from(merged, ([id, qty]) => ({ id, qty }));
}

function loadPromoCode() {
  const code = loadFromStorage(STORAGE_KEYS.promo, "");
  return typeof code === "string" && promoCodes[code] ? code : "";
}

// Сохраняем и сообщаем остальным частям сайта, что корзина изменилась.
function saveCart() {
  saveToStorage(STORAGE_KEYS.cart, cartItems);
  updateCartBadge();
  document.dispatchEvent(new CustomEvent("cart:change"));
}

/* ---------- Операции с корзиной ---------- */

function addToCart(productId, quantity = 1) {
  const product = getProductById(productId);
  if (!product) {
    return { ok: false, message: "Товар не найден" };
  }
  if (!product.isAvailable) {
    return { ok: false, message: `«${product.title}» сейчас нет в наличии` };
  }

  const qty = Math.max(1, Math.min(Number(quantity) || 1, CART_MAX_QTY));
  const existing = cartItems.find((item) => item.id === productId);

  if (existing) {
    existing.qty = Math.min(existing.qty + qty, CART_MAX_QTY);
  } else {
    cartItems.push({ id: productId, qty });
  }
  saveCart();
  return { ok: true, message: `«${product.title}» добавлен в корзину` };
}

function changeCartQuantity(productId, delta) {
  const item = cartItems.find((entry) => entry.id === productId);
  if (!item) return;

  const next = item.qty + delta;
  if (next < 1) {
    removeFromCart(productId);
    return;
  }
  item.qty = Math.min(next, CART_MAX_QTY);
  saveCart();
}

function removeFromCart(productId) {
  cartItems = cartItems.filter((item) => item.id !== productId);
  saveCart();
}

function clearCart() {
  cartItems = [];
  saveCart();
}

/* ---------- Расчёты ---------- */

// Товары корзины вместе с данными из data.js.
function getCartDetails() {
  return cartItems.map((item) => ({
    product: getProductById(item.id),
    qty: item.qty,
  }));
}

// Общее количество штук — через reduce.
function getCartCount() {
  return cartItems.reduce((sum, item) => sum + item.qty, 0);
}

// Сумма товаров без скидки — через reduce.
function getCartSubtotal() {
  return getCartDetails().reduce(
    (sum, { product, qty }) => sum + product.price * qty,
    0
  );
}

// Размер скидки по промокоду. Если условие не выполнено — 0 и пояснение.
function getPromoDiscount(subtotal, code) {
  const promo = promoCodes[code];
  if (!promo) return { discount: 0, active: false, note: "" };

  if (subtotal < promo.minTotal) {
    return {
      discount: 0,
      active: false,
      note: `Промокод ${code} действует при заказе от ${formatPrice(promo.minTotal)}`,
    };
  }

  const raw = promo.type === "percent" ? (subtotal * promo.value) / 100 : promo.value;
  return { discount: Math.min(Math.round(raw), subtotal), active: true, note: "" };
}

// Все итоговые цифры корзины одним объектом.
function calculateCartTotals() {
  const subtotal = getCartSubtotal();
  const promo = appliedPromoCode ? getPromoDiscount(subtotal, appliedPromoCode) : null;
  const discount = promo ? promo.discount : 0;

  return {
    count: getCartCount(),
    subtotal,
    discount,
    total: subtotal - discount,
    promoCode: appliedPromoCode,
    promoLabel: appliedPromoCode ? promoCodes[appliedPromoCode].label : "",
    promoNote: promo ? promo.note : "",
  };
}

function applyPromoCode(rawCode) {
  const code = String(rawCode).trim().toUpperCase();
  if (!code) {
    return { ok: false, message: "Введите промокод" };
  }
  if (!promoCodes[code]) {
    return { ok: false, message: "Такого промокода нет" };
  }

  const check = getPromoDiscount(getCartSubtotal(), code);
  if (!check.active) {
    return { ok: false, message: check.note };
  }

  appliedPromoCode = code;
  saveToStorage(STORAGE_KEYS.promo, code);
  document.dispatchEvent(new CustomEvent("cart:change"));
  return { ok: true, message: `Промокод ${code} применён: ${promoCodes[code].label}` };
}

function removePromoCode() {
  appliedPromoCode = "";
  saveToStorage(STORAGE_KEYS.promo, "");
  document.dispatchEvent(new CustomEvent("cart:change"));
}

/* ---------- Счётчик в шапке ---------- */

function updateCartBadge() {
  const count = getCartCount();

  document.querySelectorAll("[data-cart-count]").forEach((badge) => {
    badge.textContent = String(count);
    badge.hidden = count === 0;
  });

  const link = document.querySelector("#header-basket");
  if (link) {
    link.setAttribute(
      "aria-label",
      count > 0
        ? `Корзина: ${count} ${pluralize(count, ["товар", "товара", "товаров"])}`
        : "Корзина"
    );
  }
}

/* ---------- Страница cart.html ---------- */

// Строка товара в корзине. Все тексты — через textContent.
function createCartItem({ product, qty }) {
  const id = String(product.id);

  const picture = createProductPicture(product, {
    className: "cart-item__image",
    sizes: "88px",
  });

  const title = createElement("h3", { className: "cart-item__title" });
  title.append(
    createElement("a", {
      text: product.title,
      attrs: { href: `product.html?id=${id}` },
    })
  );

  const minus = createElement("button", {
    className: "qty__button",
    text: "−",
    attrs: { type: "button", "aria-label": `Уменьшить количество: ${product.title}` },
    dataset: { cartAction: "decrease", id },
  });
  const plus = createElement("button", {
    className: "qty__button",
    text: "+",
    attrs: { type: "button", "aria-label": `Увеличить количество: ${product.title}` },
    dataset: { cartAction: "increase", id },
  });
  const quantity = createElement("output", {
    className: "qty__value",
    text: String(qty),
    attrs: { "aria-label": `Количество: ${qty}` },
  });
  const counter = createElement("div", {
    className: "qty",
    attrs: { role: "group", "aria-label": `Количество: ${product.title}` },
    children: [minus, quantity, plus],
  });

  const remove = createElement("button", {
    className: "cart-item__remove",
    text: "Удалить",
    attrs: { type: "button", "aria-label": `Удалить из корзины: ${product.title}` },
    dataset: { cartAction: "remove", id },
  });

  return createElement("li", {
    className: "cart-item",
    dataset: { id },
    children: [
      picture,
      createElement("div", {
        className: "cart-item__info",
        children: [
          title,
          createElement("p", {
            className: "cart-item__price",
            text: `${formatPrice(product.price)} за шт.`,
          }),
        ],
      }),
      counter,
      createElement("strong", {
        className: "cart-item__sum",
        text: formatPrice(product.price * qty),
      }),
      remove,
    ],
  });
}

function renderCartPage() {
  const list = document.querySelector("#cart-list");
  const empty = document.querySelector("#cart-empty");
  const summary = document.querySelector("#cart-summary");
  if (!list || !empty || !summary) return;

  // Запоминаем, какая кнопка была в фокусе, чтобы вернуть фокус после перерисовки.
  const active = document.activeElement;
  const focusKey =
    active && active.dataset && active.dataset.cartAction
      ? { action: active.dataset.cartAction, id: active.dataset.id }
      : null;

  const details = getCartDetails();
  list.textContent = "";
  list.append(...details.map(createCartItem));

  const isEmpty = details.length === 0;
  list.hidden = isEmpty;
  empty.hidden = !isEmpty;
  summary.hidden = isEmpty;

  const totals = calculateCartTotals();
  document.querySelector("#cart-count").textContent =
    `${totals.count} ${pluralize(totals.count, ["товар", "товара", "товаров"])}`;
  document.querySelector("#cart-subtotal").textContent = formatPrice(totals.subtotal);
  document.querySelector("#cart-total").textContent = formatPrice(totals.total);

  const discountRow = document.querySelector("#cart-discount-row");
  discountRow.hidden = totals.discount === 0;
  document.querySelector("#cart-discount-label").textContent = totals.promoLabel
    ? `Скидка (${totals.promoCode})`
    : "Скидка";
  document.querySelector("#cart-discount").textContent = "−" + formatPrice(totals.discount);

  const appliedBox = document.querySelector("#promo-applied");
  appliedBox.hidden = !totals.promoCode;
  document.querySelector("#promo-applied-text").textContent = totals.promoCode
    ? `Промокод ${totals.promoCode}: ${totals.promoLabel}`
    : "";

  // Если промокод сохранён, но сумма стала меньше условия — объясняем.
  const message = document.querySelector("#promo-message");
  if (totals.promoNote) {
    message.textContent = totals.promoNote;
    message.classList.add("is-error");
    message.dataset.note = "true";
  } else if (message.dataset.note === "true") {
    message.textContent = "";
    message.classList.remove("is-error");
    delete message.dataset.note;
  }

  if (focusKey) {
    const selector = `[data-cart-action="${focusKey.action}"][data-id="${focusKey.id}"]`;
    const next = list.querySelector(selector) || list.querySelector("[data-cart-action]");
    if (next) next.focus();
  }
}

function initCartPage() {
  const list = document.querySelector("#cart-list");
  if (!list) return;

  renderCartPage();
  document.addEventListener("cart:change", renderCartPage);

  // Делегирование: один обработчик на весь список вместо трёх на каждую строку.
  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cart-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const action = button.dataset.cartAction;
    if (action === "increase") changeCartQuantity(id, 1);
    if (action === "decrease") changeCartQuantity(id, -1);
    if (action === "remove") {
      const product = getProductById(id);
      removeFromCart(id);
      if (product) showToast(`«${product.title}» удалён из корзины`);
    }
  });

  const promoForm = document.querySelector("#promo-form");
  const promoInput = document.querySelector("#promo-input");
  const promoMessage = document.querySelector("#promo-message");

  promoForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = applyPromoCode(promoInput.value);
    promoMessage.textContent = result.message;
    promoMessage.classList.toggle("is-error", !result.ok);
    if (result.ok) promoInput.value = "";
  });

  document.querySelector("#promo-remove").addEventListener("click", () => {
    removePromoCode();
    promoMessage.textContent = "Промокод удалён";
    promoMessage.classList.remove("is-error");
  });

  // Очистка в два шага вместо confirm(): первый клик просит подтверждения.
  const clearButton = document.querySelector("#cart-clear");
  let clearTimer = null;
  clearButton.addEventListener("click", () => {
    if (clearButton.dataset.confirm === "true") {
      window.clearTimeout(clearTimer);
      clearButton.dataset.confirm = "false";
      clearButton.textContent = "Очистить корзину";
      clearCart();
      showToast("Корзина очищена");
      return;
    }
    clearButton.dataset.confirm = "true";
    clearButton.textContent = "Нажмите ещё раз, чтобы очистить";
    clearTimer = window.setTimeout(() => {
      clearButton.dataset.confirm = "false";
      clearButton.textContent = "Очистить корзину";
    }, 3000);
  });
}
