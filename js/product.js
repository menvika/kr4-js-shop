"use strict";

/* ==========================================================
   product.js — страница товара product.html?id=...

   Страница одна, а товаров несколько: id берётся из адреса
   (URLSearchParams), по нему находится объект в data.js, и вся
   страница строится через createElement. Без параметра id
   открывается «Моно-букет» (id = 2), как в КР №3.
   ========================================================== */

const DEFAULT_PRODUCT_ID = 2;

function createSpecsTable(product) {
  const body = createElement("tbody");
  product.specs.forEach(([name, value]) => {
    body.append(
      createElement("tr", {
        children: [
          createElement("th", { text: name, attrs: { scope: "row" } }),
          createElement("td", { text: value }),
        ],
      })
    );
  });

  return createElement("div", {
    className: "table-wrapper",
    children: [
      createElement("table", {
        className: "specs-table",
        children: [
          createElement("caption", { className: "visually-hidden", text: `Характеристики: ${product.title}` }),
          body,
        ],
      }),
    ],
  });
}

function renderProduct(root, product) {
  const id = String(product.id);

  const media = createElement("div", {
    className: "product-page__media",
    children: [
      createProductPicture(product, {
        className: "product-page__image",
        sizes: "(max-width: 767px) calc(100vw - 32px), (max-width: 1023px) 45vw, 520px",
        eager: true,
      }),
    ],
  });

  // Количество перед добавлением в корзину
  const qtyInput = createElement("input", {
    attrs: { id: "product-qty", type: "number", min: "1", max: String(CART_MAX_QTY), value: "1", inputmode: "numeric" },
  });
  const qtyField = createElement("div", {
    className: "form-field product-page__qty",
    children: [createElement("label", { text: "Количество", attrs: { for: "product-qty" } }), qtyInput],
  });

  const addButton = createElement("button", {
    className: "button",
    text: "В корзину",
    attrs: { type: "button" },
    dataset: { action: "add-to-cart", id, qtySource: "#product-qty" },
  });
  addButton.disabled = !product.isAvailable;

  const orderLink = createElement("a", {
    className: "button button--outline",
    text: "Заказать",
    attrs: { href: `order.html?product=${id}` },
  });
  if (!product.isAvailable) {
    orderLink.setAttribute("aria-disabled", "true");
    orderLink.removeAttribute("href");
  }

  const favorite = createElement("button", {
    className: "favorite-button favorite-button--inline",
    attrs: {
      type: "button",
      "aria-pressed": String(isFavorite(product.id)),
      "aria-label": `В избранное: ${product.title}`,
    },
    dataset: { action: "toggle-favorite", id },
    children: [createIcon("icon-heart")],
  });

  const stock = createElement("p", {
    className: "product-page__stock" + (product.isAvailable ? "" : " is-out"),
    text: product.isAvailable ? "В наличии" : "Нет в наличии",
  });

  const info = createElement("div", {
    className: "product-page__info",
    children: [
      createElement("p", { className: "dialog-eyebrow", text: getCategoryLabel(product.category) }),
      createElement("h1", { text: product.title }),
      createElement("p", {
        className: "product-page__rating",
        text: `★ ${product.rating.toFixed(1)} · ${product.reviews} ${pluralize(product.reviews, ["отзыв", "отзыва", "отзывов"])}`,
      }),
      createElement("p", { className: "product-page__price", text: formatPrice(product.price) }),
      stock,
      createElement("p", { text: product.description }),
      createElement("h2", { className: "product-page__subtitle", text: "Характеристики" }),
      createSpecsTable(product),
      createElement("div", {
        className: "product-page__actions",
        children: [qtyField, addButton, orderLink, favorite],
      }),
    ],
  });

  root.textContent = "";
  root.append(media, info);
}

function renderProductNotFound(root) {
  root.textContent = "";
  root.classList.remove("product-page");
  root.append(
    createElement("div", {
      className: "empty-state",
      children: [
        createElement("h1", { className: "empty-state__title", text: "Товар не найден" }),
        createElement("p", { text: "Возможно, ссылка устарела. Выберите букет в каталоге." }),
        createElement("a", { className: "button", text: "Перейти в каталог", attrs: { href: "catalog.html" } }),
      ],
    })
  );
}

function initProductPage() {
  const root = document.querySelector("#product-root");
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const rawId = params.get("id");
  const id = rawId === null ? DEFAULT_PRODUCT_ID : Number(rawId);
  const product = Number.isInteger(id) ? getProductById(id) : null;

  const breadcrumb = document.querySelector("#breadcrumb-product");

  if (!product) {
    renderProductNotFound(root);
    document.title = "Товар не найден — Учебный интернет-магазин";
    if (breadcrumb) breadcrumb.textContent = "Товар не найден";
    return;
  }

  renderProduct(root, product);
  document.title = `${product.title} — Учебный интернет-магазин`;
  if (breadcrumb) breadcrumb.textContent = product.title;

  // Похожие: сначала из той же категории, потом остальные. Берём три.
  const similarGrid = document.querySelector("#similar-grid");
  if (similarGrid) {
    const others = products.filter((item) => item.id !== product.id);
    const sameCategory = others.filter((item) => item.category === product.category);
    const rest = others.filter((item) => item.category !== product.category);
    const similar = [...sameCategory, ...rest].slice(0, 3);

    similarGrid.textContent = "";
    similarGrid.append(...similar.map((item) => createProductCard(item)));
  }

  syncFavoriteButtons();
}
