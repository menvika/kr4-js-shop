"use strict";

/* ==========================================================
   main.js — общая инициализация проекта

   Подключается последним, когда все остальные файлы уже
   загружены. Здесь:
   - один обработчик кликов по кнопкам с data-action
     (делегирование событий);
   - меню, FAQ, сворачиваемый фильтр;
   - запуск кода нужной страницы. Каждая init-функция сама
   проверяет, есть ли на странице её элементы, поэтому на других
   страницах ничего не ломается.
   ========================================================== */

/* ---------- Действия кнопок (data-action) ---------- */

// Количество для «В корзину»: если кнопка указывает на поле (data-qty-source),
// берём значение из него и исправляем его до допустимого.
function readQuantity(button) {
  if (!button.dataset.qtySource) return 1;
  const input = document.querySelector(button.dataset.qtySource);
  if (!input) return 1;

  const qty = Math.max(1, Math.min(parseInt(input.value, 10) || 1, CART_MAX_QTY));
  input.value = String(qty);
  return qty;
}

function handleAddToCart(button, productId) {
  const result = addToCart(productId, readQuantity(button));
  showToast(result.message);

  if (result.ok) {
    button.classList.add("is-added");
    window.setTimeout(() => button.classList.remove("is-added"), 600);
  }
}

function initActionButtons() {
  // Вместо onclick="..." в HTML: один обработчик на документ смотрит,
  // по какой кнопке кликнули, и читает её data-атрибуты.
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;

    const productId = Number(button.dataset.id);
    const product = getProductById(productId);
    if (!product) return;

    switch (button.dataset.action) {
      case "add-to-cart":
        handleAddToCart(button, productId);
        break;
      case "toggle-favorite": {
        const added = toggleFavorite(productId);
        showToast(added ? `«${product.title}» в избранном` : `«${product.title}» убран из избранного`);
        break;
      }
      case "open-details":
        openProductModal(product);
        break;
      default:
        break;
    }
  });

  // Состояние кнопок «сердечко» обновляется при любом изменении избранного.
  document.addEventListener("favorites:change", syncFavoriteButtons);
}

/* ---------- Навигация, FAQ, фильтры ---------- */

// Мобильное меню (бургер). Без JS список ссылок остаётся раскрытым.
function initNav() {
  const nav = document.querySelector(".site-nav");
  const toggle = nav && nav.querySelector(".nav-toggle");
  const list = nav && nav.querySelector(".site-nav__list");
  if (!toggle || !list) return;

  toggle.hidden = false;
  nav.classList.add("is-collapsible");

  function setOpen(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  }

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  // Esc закрывает меню и возвращает фокус на кнопку.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      toggle.focus();
    }
  });

  // Клик вне меню закрывает его.
  document.addEventListener("click", (event) => {
    if (!nav.contains(event.target)) setOpen(false);
  });

  window.matchMedia("(min-width: 768px)").addEventListener("change", () => setOpen(false));
}

// Раскрывающиеся вопросы: открыт только один.
function initFaq() {
  const items = document.querySelectorAll(".faq-item");
  items.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      items.forEach((other) => {
        if (other !== item) other.removeAttribute("open");
      });
    });
  });
}

// Фильтры каталога: на телефоне свёрнуты, на desktop всегда раскрыты.
function initFiltersToggle() {
  const details = document.querySelector(".filters-toggle");
  if (!details) return;

  const summary = details.querySelector("summary");
  const mq = window.matchMedia("(min-width: 1024px)");

  function sync() {
    details.open = mq.matches;
    if (summary) summary.tabIndex = mq.matches ? -1 : 0;
  }

  sync();
  mq.addEventListener("change", sync);
  details.addEventListener("toggle", () => {
    if (mq.matches && !details.open) details.open = true;
  });
}

/* ---------- Запуск ---------- */

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initModals();
  initActionButtons();
  initNav();
  initFaq();
  initFiltersToggle();

  updateCartBadge();

  // Код отдельных страниц (каждая функция проверяет наличие своих элементов).
  initHomePage();
  initCatalogPage();
  initProductPage();
  initCartPage();
  initOrderPage();
  initContactForm();

  syncFavoriteButtons();
});

// Если корзину или избранное изменили в другой вкладке — обновляем эту.
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEYS.cart || event.key === STORAGE_KEYS.promo) {
    cartItems = loadCart();
    appliedPromoCode = loadPromoCode();
    updateCartBadge();
    document.dispatchEvent(new CustomEvent("cart:change"));
  }
  if (event.key === STORAGE_KEYS.favorites) {
    favoriteIds = loadFavorites();
    document.dispatchEvent(new CustomEvent("favorites:change"));
  }
});
