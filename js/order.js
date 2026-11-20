"use strict";

/* ==========================================================
   order.js — формы: страница заявки и форма обратной связи

   Валидация описана в validation.js, здесь — сценарий:
   состав заказа из корзины, имитация отправки (setTimeout вместо
   сервера), сообщение об успехе. Все значения из формы попадают
   на страницу только через textContent.
   ========================================================== */

const SEND_DELAY_MS = 900; // имитация ожидания ответа сервера

/* ---------- Страница order.html ---------- */

// Состав заказа: из корзины, а если она пуста — из выбранного в форме букета.
function collectOrder(form) {
  if (getCartCount() > 0) {
    const totals = calculateCartTotals();
    return {
      fromCart: true,
      items: getCartDetails().map(({ product, qty }) => ({
        title: product.title,
        qty,
        sum: product.price * qty,
      })),
      discount: totals.discount,
      promoCode: totals.promoCode,
      total: totals.total,
    };
  }

  const product = getProductById(Number(form.elements.product.value));
  const qty = Number(form.elements.qty.value);
  return {
    fromCart: false,
    items: [{ title: product.title, qty, sum: product.price * qty }],
    discount: 0,
    promoCode: "",
    total: product.price * qty,
  };
}

function formatDate(isoDate) {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Итоговая карточка «Заявка подготовлена». Строится заново при каждой отправке.
function renderOrderResult(container, order, customer) {
  container.textContent = "";

  const itemsList = createElement("ul", { className: "order-result__list" });
  order.items.forEach((item) => {
    itemsList.append(
      createElement("li", { text: `${item.title} × ${item.qty} — ${formatPrice(item.sum)}` })
    );
  });

  const delivery =
    customer.delivery === "pickup"
      ? "Самовывоз из шоу-рума"
      : `Курьером: ${customer.address}`;

  const backButton = createElement("button", {
    className: "button button--outline",
    text: "Оформить ещё одну заявку",
    attrs: { type: "button" },
    dataset: { orderAction: "again" },
  });

  container.append(
    createElement("h2", { className: "order-result__title", text: "Заявка подготовлена" }),
    createElement("p", {
      text: `Спасибо, ${customer.name}! Номер заявки: ${customer.number}. Мы свяжемся с вами по телефону ${customer.phone} для подтверждения.`,
    }),
    createElement("h3", { className: "order-result__subtitle", text: "Состав заказа" }),
    itemsList,
    order.discount > 0
      ? createElement("p", { text: `Скидка по промокоду ${order.promoCode}: −${formatPrice(order.discount)}` })
      : createElement("p", { className: "visually-hidden", text: "Скидка не применялась" }),
    createElement("p", { className: "order-result__total", text: `Итого: ${formatPrice(order.total)}` }),
    createElement("p", { text: `${delivery}. Дата: ${formatDate(customer.date)}.` }),
    createElement("div", {
      className: "order-result__actions",
      children: [
        createElement("a", { className: "button", text: "В каталог", attrs: { href: "catalog.html" } }),
        backButton,
      ],
    })
  );
}

// Блок «Состав заказа из корзины» вместо выбора одного букета.
function renderOrderCartBox() {
  const box = document.querySelector("#order-cart-box");
  const single = document.querySelector("#order-single-box");
  if (!box || !single) return;

  const hasCart = getCartCount() > 0;
  box.hidden = !hasCart;
  single.hidden = hasCart;
  if (!hasCart) return;

  const list = document.querySelector("#order-cart-list");
  list.textContent = "";
  getCartDetails().forEach(({ product, qty }) => {
    list.append(
      createElement("li", {
        text: `${product.title} × ${qty} — ${formatPrice(product.price * qty)}`,
      })
    );
  });

  const totals = calculateCartTotals();
  document.querySelector("#order-cart-total").textContent =
    totals.discount > 0
      ? `Итого: ${formatPrice(totals.total)} (скидка ${formatPrice(totals.discount)})`
      : `Итого: ${formatPrice(totals.total)}`;
}

function initOrderPage() {
  const form = document.querySelector("#order-form");
  if (!form) return;

  const summary = document.querySelector("#order-errors");
  const status = document.querySelector("#order-status");
  const result = document.querySelector("#order-result");
  const submit = document.querySelector("#order-submit");
  const productSelect = document.querySelector("#order-product");
  const dateInput = document.querySelector("#order-date");
  const addressField = document.querySelector("#address-field");
  const addressInput = document.querySelector("#order-address");
  const comment = document.querySelector("#order-comment");
  const counter = document.querySelector("#comment-counter");

  // Список букетов строится из массива products.
  products.forEach((product) => {
    const option = createElement("option", {
      text: `${product.title} — ${formatPrice(product.price)}` + (product.isAvailable ? "" : " (нет в наличии)"),
      attrs: { value: String(product.id) },
    });
    option.disabled = !product.isAvailable;
    productSelect.append(option);
  });

  // Предвыбор из ссылки order.html?product=ID
  const wanted = new URLSearchParams(window.location.search).get("product");
  if (wanted && getProductById(Number(wanted))) {
    productSelect.value = wanted;
  }

  // Нельзя выбрать дату в прошлом.
  const now = new Date();
  dateInput.min = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  // Адрес нужен только при доставке курьером.
  function syncDelivery() {
    const pickup = form.elements.delivery.value === "pickup";
    addressField.hidden = pickup;
    addressInput.required = !pickup;
    if (pickup) clearFieldError(addressInput);
  }
  form.querySelectorAll('input[name="delivery"]').forEach((radio) => {
    radio.addEventListener("change", syncDelivery);
  });

  // Счётчик символов комментария.
  function updateCounter() {
    const length = comment.value.length;
    counter.textContent = `${length} / 300`;
    counter.classList.toggle("is-error", length > 300);
  }
  comment.addEventListener("input", updateCounter);

  form.addEventListener("reset", () => {
    // reset срабатывает до очистки полей, поэтому обновляем интерфейс чуть позже
    window.setTimeout(() => {
      syncDelivery();
      updateCounter();
    }, 0);
  });

  document.addEventListener("cart:change", renderOrderCartBox);

  // Кнопка «Оформить ещё одну» в карточке результата (делегирование).
  result.addEventListener("click", (event) => {
    if (!event.target.closest('[data-order-action="again"]')) return;
    result.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });

  initFormValidation(form, {
    summary,
    onValid() {
      // Данные собираем ДО очистки формы.
      const order = collectOrder(form);
      const customer = {
        name: form.elements.name.value.trim(),
        phone: form.elements.phone.value.trim(),
        delivery: form.elements.delivery.value,
        address: addressInput.value.trim(),
        date: dateInput.value,
        number: String(Date.now()).slice(-6),
      };

      // Имитация отправки: блокируем кнопку, чтобы не отправить дважды.
      submit.disabled = true;
      submit.textContent = "Отправляем…";
      status.textContent = "Подготавливаем заявку…";

      window.setTimeout(() => {
        if (order.fromCart) {
          clearCart();
          removePromoCode();
        }
        form.reset();
        renderOrderResult(result, order, customer);
        form.hidden = true;
        result.hidden = false;
        result.focus();

        submit.disabled = false;
        submit.textContent = "Отправить заявку";
        status.textContent = "";
      }, SEND_DELAY_MS);
    },
  });

  syncDelivery();
  updateCounter();
  renderOrderCartBox();
}

/* ---------- Форма обратной связи на contacts.html ---------- */

function initContactForm() {
  const dialog = document.querySelector("#contact-order-dialog");
  const form = document.querySelector("#contact-order-form");
  const success = document.querySelector("#success-message");
  if (!dialog || !form || !success) return;

  const submit = form.querySelector('[type="submit"]');
  const opener = document.querySelector("#open-order-dialog");

  function resetDialog() {
    form.reset();
    success.hidden = true;
  }
  if (opener) opener.addEventListener("click", resetDialog);
  dialog.addEventListener("close", () => {
    success.hidden = true;
  });

  initFormValidation(form, {
    onValid() {
      submit.disabled = true;
      submit.textContent = "Отправляем…";

      window.setTimeout(() => {
        form.reset();
        submit.disabled = false;
        submit.textContent = "Отправить заявку";
        success.hidden = false;
        success.focus();
      }, SEND_DELAY_MS);
    },
  });
}
