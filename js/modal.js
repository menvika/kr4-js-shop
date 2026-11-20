"use strict";

/* ==========================================================
   modal.js — модальные окна

   Используется встроенный элемент <dialog>: он сам удерживает
   фокус внутри окна, закрывается по Esc и возвращает фокус на
   кнопку, открывшую окно.
   Управление через data-атрибуты:
     data-open-modal="id"  — кнопка открывает окно с этим id
     data-close-modal      — кнопка закрывает окно, в котором лежит
   ========================================================== */

function openModal(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", ""); // запасной вариант для старых браузеров
  }
}

function closeModal(dialog) {
  if (dialog && dialog.open) dialog.close();
}

// Заполняет окно товара данными из массива products.
// Все значения вставляются через textContent / setAttribute.
function openProductModal(product) {
  const dialog = document.querySelector("#product-dialog");
  if (!dialog) return;

  const image = dialog.querySelector("#product-dialog-image");
  const widths = product.image.widths;
  const width = widths.includes(640) ? 640 : widths[widths.length - 1];
  image.src = `images/${product.image.name}-${width}.jpg`;
  image.alt = product.title;

  dialog.querySelector("#product-dialog-eyebrow").textContent = getCategoryLabel(product.category);
  dialog.querySelector("#product-dialog-title").textContent = product.title;
  dialog.querySelector("#product-dialog-rating").textContent =
    `★ ${product.rating.toFixed(1)} · ${product.reviews} ${pluralize(product.reviews, ["отзыв", "отзыва", "отзывов"])}`;
  dialog.querySelector("#product-dialog-description").textContent = product.description;
  dialog.querySelector("#product-dialog-price").textContent = formatPrice(product.price);

  const stock = dialog.querySelector("#product-dialog-stock");
  stock.textContent = product.isAvailable ? "В наличии" : "Нет в наличии";
  stock.classList.toggle("is-out", !product.isAvailable);

  dialog.querySelector("#product-dialog-link").setAttribute("href", `product.html?id=${product.id}`);

  const cartButton = dialog.querySelector("#product-dialog-cart");
  cartButton.dataset.id = String(product.id);
  cartButton.disabled = !product.isAvailable;
  cartButton.setAttribute(
    "aria-label",
    product.isAvailable ? `Добавить в корзину: ${product.title}` : "Нет в наличии"
  );

  const favoriteButton = dialog.querySelector("#product-dialog-favorite");
  favoriteButton.dataset.id = String(product.id);
  favoriteButton.setAttribute("aria-label", `В избранное: ${product.title}`);
  syncFavoriteButtons();

  openModal(dialog);
}

function initModals() {
  // Один обработчик на весь документ (делегирование событий).
  document.addEventListener("click", (event) => {
    const opener = event.target.closest("[data-open-modal]");
    if (opener) {
      openModal(document.getElementById(opener.dataset.openModal));
      return;
    }

    const closer = event.target.closest("[data-close-modal]");
    if (closer) {
      closeModal(closer.closest("dialog"));
      return;
    }

    // Клик по тёмному фону (сам <dialog>, а не его содержимое) закрывает окно.
    if (event.target instanceof HTMLDialogElement) {
      closeModal(event.target);
    }
  });
}
