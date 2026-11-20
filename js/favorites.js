"use strict";

/* ==========================================================
   favorites.js — избранные товары

   Хранится массив id товаров. Состояние сохраняется в
   localStorage и подсвечивается на всех кнопках «сердечко».
   ========================================================== */

let favoriteIds = loadFavorites();

function loadFavorites() {
  const stored = loadFromStorage(STORAGE_KEYS.favorites, []);
  if (!Array.isArray(stored)) return [];
  // Оставляем только уникальные id реально существующих товаров.
  return stored.filter(
    (id, index) =>
      Number.isInteger(id) && getProductById(id) && stored.indexOf(id) === index
  );
}

function isFavorite(productId) {
  return favoriteIds.includes(productId);
}

// Добавляет или убирает товар. Возвращает true, если товар теперь в избранном.
function toggleFavorite(productId) {
  const wasFavorite = isFavorite(productId);
  favoriteIds = wasFavorite
    ? favoriteIds.filter((id) => id !== productId)
    : [...favoriteIds, productId];

  saveToStorage(STORAGE_KEYS.favorites, favoriteIds);
  document.dispatchEvent(new CustomEvent("favorites:change"));
  return !wasFavorite;
}

// Обновляет внешний вид всех кнопок «сердечко» на странице.
function syncFavoriteButtons() {
  document.querySelectorAll('[data-action="toggle-favorite"]').forEach((button) => {
    const active = isFavorite(Number(button.dataset.id));
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  const counter = document.querySelector("#favorites-count");
  if (counter) counter.textContent = String(favoriteIds.length);
}
