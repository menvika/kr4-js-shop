"use strict";

/* ==========================================================
   catalog.js — карточки товаров, поиск, фильтры, сортировка

   Что здесь происходит:
   1. createProductCard()  — собирает карточку из объекта товара
   2. filterProducts()     — поиск, категория, цена, наличие, избранное
   3. sortProducts()       — сортировка КОПИИ массива
   4. renderCatalog()      — выводит результат: карточки, счётчик,
                             пустое состояние, пагинацию
   5. initCatalogPage()    — подключает события к элементам страницы
   Главная страница использует createProductCard() для блока
   «Популярные товары».
   ========================================================== */

const PAGE_SIZE = 6; // товаров на одной странице каталога

const SORT_KEYS = ["default", "price-asc", "price-desc", "title-asc", "title-desc", "rating-desc"];

// Значения фильтров по умолчанию (используются и для сброса).
function getDefaultCatalogState() {
  return {
    query: "",
    category: "all",
    priceFrom: "",
    priceTo: "",
    onlyAvailable: false,
    onlyFavorites: false,
    sort: "default",
    page: 1,
  };
}

let catalogState = getDefaultCatalogState();

/* ---------- Карточка товара ---------- */

const BADGE_TEXT = { hit: "Хит", new: "Новинка" };

function createProductCard(product, options = {}) {
  const id = String(product.id);
  const sizes = options.sizes || "(max-width: 599px) calc(100vw - 64px), (max-width: 899px) 45vw, 330px";

  const card = createElement("article", {
    className: "product-card" + (product.isAvailable ? "" : " product-card--unavailable"),
    dataset: { id, category: product.category },
  });

  // Бейдж: «Нет в наличии» важнее, чем «Хит» или «Новинка».
  const badgeKey = product.isAvailable ? product.badge : "out";
  const badgeText = product.isAvailable ? BADGE_TEXT[product.badge] : "Нет в наличии";
  const media = createElement("div", { className: "product-card__media" });
  if (badgeText) {
    media.append(
      createElement("span", {
        className: `product-card__badge product-card__badge--${badgeKey}`,
        text: badgeText,
      })
    );
  }

  const favorite = createElement("button", {
    className: "favorite-button",
    attrs: {
      type: "button",
      "aria-pressed": String(isFavorite(product.id)),
      "aria-label": `В избранное: ${product.title}`,
    },
    dataset: { action: "toggle-favorite", id },
    children: [createIcon("icon-heart")],
  });
  favorite.classList.toggle("is-active", isFavorite(product.id));

  media.append(createProductPicture(product, { className: "product-card__image", sizes }), favorite);

  const rating = createElement("p", {
    className: "product-card__rating",
    text: `★ ${product.rating.toFixed(1)} (${product.reviews})`,
  });

  const stock = createElement("p", {
    className: "product-card__stock" + (product.isAvailable ? "" : " is-out"),
    text: product.isAvailable ? "В наличии" : "Нет в наличии",
  });

  const detailsButton = createElement("button", {
    className: "button product-card__details",
    text: "Подробнее",
    attrs: { type: "button", "aria-label": `Подробнее: ${product.title}` },
    dataset: { action: "open-details", id },
  });

  const cartButton = createElement("button", {
    className: "cart-button",
    attrs: {
      type: "button",
      "aria-label": product.isAvailable ? `Добавить в корзину: ${product.title}` : "Нет в наличии",
    },
    dataset: { action: "add-to-cart", id },
    children: [createIcon("icon-cart")],
  });
  cartButton.disabled = !product.isAvailable;

  card.append(
    media,
    createElement("p", { className: "product-card__category", text: getCategoryLabel(product.category) }),
    createElement("h3", { text: product.title }),
    rating,
    createElement("p", { className: "product-price", text: `Цена: ${formatPrice(product.price)}` }),
    stock,
    createElement("div", { className: "product-card__actions", children: [detailsButton, cartButton] })
  );
  return card;
}

/* ---------- Поиск, фильтрация, сортировка ---------- */

// Поиск по названию: каждое слово запроса должно встретиться в названии.
function matchesQuery(product, query) {
  const title = normalizeText(product.title);
  return normalizeText(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => title.includes(word));
}

// Возвращает диапазон цен или null, если поля пустые/некорректные.
function getPriceRange(state) {
  const from = state.priceFrom === "" ? null : Number(state.priceFrom);
  const to = state.priceTo === "" ? null : Number(state.priceTo);
  if (from !== null && to !== null && from > to) return { invalid: true };
  return { from, to, invalid: false };
}

function filterProducts(list, state) {
  const range = getPriceRange(state);

  return list.filter((product) => {
    if (state.query && !matchesQuery(product, state.query)) return false;
    if (state.category !== "all" && product.category !== state.category) return false;
    if (state.onlyAvailable && !product.isAvailable) return false;
    if (state.onlyFavorites && !isFavorite(product.id)) return false;
    if (!range.invalid) {
      if (range.from !== null && product.price < range.from) return false;
      if (range.to !== null && product.price > range.to) return false;
    }
    return true;
  });
}

// Сортировка выполняется над КОПИЕЙ ([...list]), поэтому исходный
// массив products остаётся в прежнем порядке.
function sortProducts(list, sortKey) {
  const sorted = [...list];
  switch (sortKey) {
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "title-asc":
      return sorted.sort((a, b) => a.title.localeCompare(b.title, "ru"));
    case "title-desc":
      return sorted.sort((a, b) => b.title.localeCompare(a.title, "ru"));
    case "rating-desc":
      return sorted.sort((a, b) => b.rating - a.rating);
    default:
      return sorted; // порядок из data.js
  }
}

/* ---------- Вывод результата ---------- */

function renderEmptyState(container, state) {
  container.textContent = "";

  const hasQuery = state.query.trim() !== "";
  const text = hasQuery
    ? `По запросу «${state.query.trim()}» товаров не нашлось.`
    : "Под выбранные фильтры товаров нет.";

  const actions = createElement("div", { className: "empty-state__actions" });
  actions.append(
    createElement("button", {
      className: "button",
      text: "Сбросить все фильтры",
      attrs: { type: "button" },
      dataset: { emptyAction: "reset" },
    })
  );
  categories.forEach((category) => {
    actions.append(
      createElement("button", {
        className: "chip",
        text: category.label,
        attrs: { type: "button" },
        dataset: { emptyAction: "category", category: category.value },
      })
    );
  });

  container.append(
    createElement("h3", { className: "empty-state__title", text: "Ничего не найдено" }),
    createElement("p", { text }), // запрос пользователя вставлен как текст, а не как HTML
    createElement("p", { text: "Измените запрос, ослабьте фильтры или посмотрите категории:" }),
    actions
  );
}

function renderPagination(container, totalPages, currentPage) {
  container.textContent = "";
  container.hidden = totalPages <= 1;
  if (totalPages <= 1) return;

  for (let page = 1; page <= totalPages; page += 1) {
    const button = createElement("button", {
      text: String(page),
      attrs: { type: "button", "aria-label": `Страница ${page}` },
      dataset: { page: String(page) },
    });
    if (page === currentPage) button.setAttribute("aria-current", "page");
    container.append(button);
  }
}

function renderCatalog() {
  const grid = document.querySelector("#catalog-grid");
  if (!grid) return;

  const countBox = document.querySelector("#catalog-count");
  const emptyBox = document.querySelector("#catalog-empty");
  const pagination = document.querySelector("#catalog-pagination");
  const priceHint = document.querySelector("#price-hint");

  // 1. фильтруем, 2. сортируем копию
  const filtered = filterProducts(products, catalogState);
  const sorted = sortProducts(filtered, catalogState.sort);

  // 3. пагинация — берём «кусок» массива
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  catalogState.page = Math.min(Math.max(catalogState.page, 1), totalPages);
  const start = (catalogState.page - 1) * PAGE_SIZE;
  const pageItems = sorted.slice(start, start + PAGE_SIZE);

  // 4. карточки: очищаем контейнер и добавляем новые
  grid.textContent = "";
  grid.append(...pageItems.map((product) => createProductCard(product, { sizes: "(max-width: 599px) calc(100vw - 64px), (max-width: 1023px) 45vw, 260px" })));

  // 5. счётчик найденных товаров
  const found = sorted.length;
  countBox.textContent =
    `Найдено: ${found} ${pluralize(found, ["товар", "товара", "товаров"])}` +
    (totalPages > 1 ? ` · страница ${catalogState.page} из ${totalPages}` : "");

  // 6. пустое состояние
  grid.hidden = found === 0;
  emptyBox.hidden = found !== 0;
  if (found === 0) renderEmptyState(emptyBox, catalogState);

  renderPagination(pagination, totalPages, catalogState.page);

  // 7. подсказка про неверный диапазон цен
  const range = getPriceRange(catalogState);
  priceHint.textContent = range.invalid
    ? "Цена «От» больше цены «До» — диапазон не учитывается."
    : "";

  syncFavoriteButtons();
  syncUrl();
}

/* ---------- Адрес страницы (ссылку с фильтрами можно отправить другу) ---------- */

function syncUrl() {
  const params = new URLSearchParams();
  const defaults = getDefaultCatalogState();
  if (catalogState.query.trim()) params.set("q", catalogState.query.trim());
  if (catalogState.category !== defaults.category) params.set("category", catalogState.category);
  if (catalogState.sort !== defaults.sort) params.set("sort", catalogState.sort);
  if (catalogState.priceFrom !== "") params.set("from", catalogState.priceFrom);
  if (catalogState.priceTo !== "") params.set("to", catalogState.priceTo);
  if (catalogState.onlyAvailable) params.set("available", "1");
  if (catalogState.onlyFavorites) params.set("favorites", "1");
  if (catalogState.page > 1) params.set("page", String(catalogState.page));

  try {
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  } catch (error) {
    // На некоторых адресах (например, file://) replaceState запрещён — это не страшно.
  }
}

// Читаем начальное состояние из адреса и проверяем каждое значение.
function readStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const state = getDefaultCatalogState();

  state.query = (params.get("q") || "").slice(0, 60);
  const category = params.get("category");
  if (categories.some((item) => item.value === category)) state.category = category;
  const sort = params.get("sort");
  if (SORT_KEYS.includes(sort)) state.sort = sort;

  const from = params.get("from");
  const to = params.get("to");
  if (from !== null && from !== "" && Number(from) >= 0) state.priceFrom = String(Number(from));
  if (to !== null && to !== "" && Number(to) >= 0) state.priceTo = String(Number(to));

  state.onlyAvailable = params.get("available") === "1";
  state.onlyFavorites = params.get("favorites") === "1";
  state.page = Math.max(1, parseInt(params.get("page"), 10) || 1);
  return state;
}

/* ---------- Подключение событий ---------- */

function initCatalogPage() {
  const grid = document.querySelector("#catalog-grid");
  if (!grid) return;

  const searchInput = document.querySelector("#search-input");
  const categorySelect = document.querySelector("#category-select");
  const sortSelect = document.querySelector("#sort-select");
  const priceFrom = document.querySelector("#price-from");
  const priceTo = document.querySelector("#price-to");
  const onlyAvailable = document.querySelector("#only-available");
  const onlyFavorites = document.querySelector("#only-favorites");
  const resetButton = document.querySelector("#reset-filters");
  const form = document.querySelector("#filters-form");
  const pagination = document.querySelector("#catalog-pagination");
  const emptyBox = document.querySelector("#catalog-empty");

  // Список категорий строим из массива categories — значения совпадают
  // с product.category автоматически.
  categories.forEach((category) => {
    categorySelect.append(
      createElement("option", { text: category.label, attrs: { value: category.value } })
    );
  });

  // Показываем в полях текущее состояние (например, из адреса страницы).
  function writeControls() {
    searchInput.value = catalogState.query;
    categorySelect.value = catalogState.category;
    sortSelect.value = catalogState.sort;
    priceFrom.value = catalogState.priceFrom;
    priceTo.value = catalogState.priceTo;
    onlyAvailable.checked = catalogState.onlyAvailable;
    onlyFavorites.checked = catalogState.onlyFavorites;
  }

  // Любое изменение фильтра возвращает на первую страницу.
  function update(changes) {
    Object.assign(catalogState, changes, { page: 1 });
    renderCatalog();
  }

  // Поиск реагирует на ввод (input), остальное — на изменение (change).
  searchInput.addEventListener("input", () => update({ query: searchInput.value }));
  categorySelect.addEventListener("change", () => update({ category: categorySelect.value }));
  sortSelect.addEventListener("change", () => update({ sort: sortSelect.value }));
  priceFrom.addEventListener("input", () => update({ priceFrom: priceFrom.value }));
  priceTo.addEventListener("input", () => update({ priceTo: priceTo.value }));
  onlyAvailable.addEventListener("change", () => update({ onlyAvailable: onlyAvailable.checked }));
  onlyFavorites.addEventListener("change", () => update({ onlyFavorites: onlyFavorites.checked }));

  function resetFilters() {
    catalogState = getDefaultCatalogState();
    writeControls();
    renderCatalog();
  }
  resetButton.addEventListener("click", resetFilters);

  // Enter в поле поиска не должен перезагружать страницу.
  form.addEventListener("submit", (event) => event.preventDefault());

  // Кнопки пагинации (делегирование).
  pagination.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page]");
    if (!button) return;
    catalogState.page = Number(button.dataset.page);
    renderCatalog();
    document.querySelector("#catalog-count").scrollIntoView({ block: "start" });
  });

  // Кнопки в пустом состоянии (делегирование).
  emptyBox.addEventListener("click", (event) => {
    const button = event.target.closest("[data-empty-action]");
    if (!button) return;
    if (button.dataset.emptyAction === "reset") {
      resetFilters();
    } else {
      catalogState = Object.assign(getDefaultCatalogState(), { category: button.dataset.category });
      writeControls();
      renderCatalog();
    }
  });

  // Если пользователь убрал товар из избранного при включённом фильтре «Избранное».
  document.addEventListener("favorites:change", () => {
    if (catalogState.onlyFavorites) renderCatalog();
  });

  catalogState = readStateFromUrl();
  writeControls();
  renderCatalog();
}

/* ---------- Главная: популярные товары ---------- */

// Три лучших по рейтингу товара из тех, что есть в наличии.
function initHomePage() {
  const grid = document.querySelector("#popular-grid");
  if (!grid) return;

  const popular = sortProducts(
    products.filter((product) => product.isAvailable),
    "rating-desc"
  ).slice(0, 3);

  grid.textContent = "";
  grid.append(...popular.map((product) => createProductCard(product)));
  syncFavoriteButtons();
}
