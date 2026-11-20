"use strict";

/* ==========================================================
   utils.js — общие вспомогательные функции

   Безопасная работа с DOM (createElement + textContent),
   форматирование, localStorage и всплывающие сообщения (тост).
   Файл подключается сразу после data.js.
   ========================================================== */

// Ключи localStorage в одном месте, чтобы не путаться в строках.
const STORAGE_KEYS = {
  cart: "kr4-cart",
  favorites: "kr4-favorites",
  theme: "kr4-theme",
  promo: "kr4-promo",
};

/* ---------- localStorage ---------- */

// Чтение из localStorage. Если данных нет или JSON повреждён,
// возвращаем запасное значение (приложение не должно падать).
function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

// Запись в localStorage. В приватном режиме браузера запись может
// быть запрещена, поэтому оборачиваем в try/catch.
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

/* ---------- Безопасное создание DOM-элементов ---------- */

// createElement("h3", { className: "a b", text: "Текст", attrs: {...},
//                       dataset: {...}, children: [...] })
// Текст всегда вставляется через textContent, поэтому любые «<script>»
// и «<img onerror>» из данных будут показаны как обычный текст.
function createElement(tag, options = {}) {
  const element = document.createElement(tag);

  if (options.className) {
    element.classList.add(...options.className.split(" ").filter(Boolean));
  }
  if (options.text !== undefined) {
    element.textContent = options.text;
  }
  if (options.attrs) {
    Object.entries(options.attrs).forEach(([name, value]) => {
      element.setAttribute(name, value);
    });
  }
  if (options.dataset) {
    Object.entries(options.dataset).forEach(([name, value]) => {
      element.dataset[name] = value;
    });
  }
  if (options.children) {
    element.append(...options.children);
  }
  return element;
}

// SVG-иконка из спрайта, который лежит в начале каждой страницы.
function createIcon(iconId) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(ns, "use");
  use.setAttribute("href", "#" + iconId);
  svg.append(use);
  return svg;
}

// <picture> с WebP/JPG и srcset — адаптивные изображения из КР №3.
function createProductPicture(product, options = {}) {
  const { name, widths, width, height } = product.image;
  const sizes = options.sizes || "100vw";
  const toSrcset = (ext) =>
    widths.map((w) => `images/${name}-${w}.${ext} ${w}w`).join(", ");
  const fallbackWidth = widths.includes(640) ? 640 : widths[widths.length - 1];

  const source = createElement("source", {
    attrs: { type: "image/webp", srcset: toSrcset("webp"), sizes },
  });
  const image = createElement("img", {
    className: options.className || "",
    attrs: {
      src: `images/${name}-${fallbackWidth}.jpg`,
      srcset: toSrcset("jpg"),
      sizes,
      alt: options.alt === undefined ? product.title : options.alt,
      width,
      height,
      loading: options.eager ? "eager" : "lazy",
    },
  });
  if (options.eager) {
    image.setAttribute("fetchpriority", "high");
  }

  return createElement("picture", { children: [source, image] });
}

/* ---------- Форматирование ---------- */

// 12700 -> «12 700 руб.»
function formatPrice(value) {
  return new Intl.NumberFormat("ru-RU").format(value) + " руб.";
}

// Склонение: pluralize(2, ["товар", "товара", "товаров"]) -> «товара»
function pluralize(count, forms) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

// Для поиска: приводим к нижнему регистру, «ё» считаем как «е».
function normalizeText(text) {
  return String(text).toLowerCase().replace(/ё/g, "е").trim();
}

/* ---------- Тост (всплывающее сообщение) ---------- */

let toastTimer = null;

function showToast(message) {
  const toast = document.querySelector("#toast");
  const toastText = document.querySelector("#toast-text");
  if (!toast || !toastText) return;

  // Гифка тоста подгружается только при первом показе (быстрее страница).
  const toastImage = toast.querySelector("img[data-src]");
  if (toastImage) {
    toastImage.src = toastImage.dataset.src;
    toastImage.removeAttribute("data-src");
  }

  toastText.textContent = message;
  toast.classList.add("is-visible");

  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2500);
}
