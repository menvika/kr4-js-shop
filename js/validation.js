"use strict";

/* ==========================================================
   validation.js — валидация форм

   Поля помечаются в HTML атрибутом data-validate="имя_правила".
   Правило получает непустое значение и возвращает текст ошибки
   (или пустую строку, если всё верно). Обязательность поля берётся
   из атрибута required, а текст «поле пустое» — из
   data-required-message.
   Ошибки выводятся на страницу рядом с полем и общим списком —
   без alert().
   ========================================================== */

/* ---------- Правила ---------- */

const validationRules = {
  name(value) {
    if (value.length < 2) return "Имя должно содержать минимум 2 символа";
    if (!/^[A-Za-zА-Яа-яЁё\s'-]+$/.test(value)) {
      return "Имя может содержать только буквы, пробел и дефис";
    }
    return "";
  },

  email(value) {
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    return looksLikeEmail && value.length <= 254
      ? ""
      : "Введите e-mail в формате name@example.ru";
  },

  phone(value) {
    if (!/^\+?[\d\s\-()]+$/.test(value)) {
      return "Телефон может содержать только цифры, пробелы, скобки, + и дефис";
    }
    const digits = value.replace(/\D/g, "");
    const isRussian = digits.length === 11 && (digits[0] === "7" || digits[0] === "8");
    if (isRussian || digits.length === 10) return "";
    return "Введите телефон полностью, например +7 900 000-00-00";
  },

  // Целое число в пределах min/max, заданных в HTML.
  quantity(value, field) {
    const number = Number(value);
    const min = Number(field.min) || 1;
    const max = Number(field.max) || 99;
    if (!Number.isInteger(number)) return "Количество должно быть целым числом";
    if (number < min || number > max) return `Количество — от ${min} до ${max}`;
    return "";
  },

  // Дата доставки не раньше сегодняшнего дня.
  date(value) {
    const picked = new Date(value + "T00:00:00");
    if (Number.isNaN(picked.getTime())) return "Выберите корректную дату";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return picked < today ? "Дата доставки не может быть в прошлом" : "";
  },

  address(value) {
    return value.length >= 5 ? "" : "Укажите адрес подробнее: город, улица, дом";
  },

  comment(value) {
    return value.length <= 300 ? "" : "Комментарий не длиннее 300 символов";
  },

  // Значение select должно быть id существующего товара в наличии.
  product(value) {
    const product = getProductById(Number(value));
    if (!product) return "Выберите букет из списка";
    return product.isAvailable ? "" : "Этот букет сейчас недоступен";
  },
};

/* ---------- Проверка одного поля ---------- */

function validateField(field) {
  // Чекбокс: нужно только поставить галочку.
  if (field.type === "checkbox") {
    return field.required && !field.checked
      ? field.dataset.requiredMessage || "Подтвердите согласие"
      : "";
  }

  const value = field.value.trim();
  if (!value) {
    return field.required ? field.dataset.requiredMessage || "Заполните это поле" : "";
  }

  const rule = validationRules[field.dataset.validate];
  return rule ? rule(value, field) : "";
}

/* ---------- Вывод ошибок на страницу ---------- */

// Показывает текст ошибки под полем и помечает поле aria-invalid.
function showFieldError(field, message) {
  const wrapper = field.closest(".form-field");
  if (!wrapper) return;

  const errorId = `${field.id}-error`;
  let box = document.getElementById(errorId);
  if (!box) {
    box = createElement("small", { className: "field-error", attrs: { id: errorId } });
    wrapper.append(box);
  }
  box.textContent = message; // textContent: текст ошибки никогда не станет разметкой

  field.setAttribute("aria-invalid", "true");
  if (field.dataset.describedby === undefined) {
    field.dataset.describedby = field.getAttribute("aria-describedby") || "";
  }
  field.setAttribute("aria-describedby", `${field.dataset.describedby} ${errorId}`.trim());
}

function clearFieldError(field) {
  field.removeAttribute("aria-invalid");

  const box = document.getElementById(`${field.id}-error`);
  if (box) box.remove();

  if (field.dataset.describedby) {
    field.setAttribute("aria-describedby", field.dataset.describedby);
  } else {
    field.removeAttribute("aria-describedby");
  }
}

// Поля формы, которые нужно проверять (отключённые и скрытые пропускаем).
function getValidatableFields(form) {
  return Array.from(form.elements).filter(
    (element) => element.dataset.validate && !element.disabled && !element.closest("[hidden]")
  );
}

// Проверяет всю форму, выводит ошибки у полей и возвращает их список.
function validateForm(form) {
  const errors = [];

  getValidatableFields(form).forEach((field) => {
    const message = validateField(field);
    if (message) {
      showFieldError(field, message);
      errors.push({ field, message });
    } else {
      clearFieldError(field);
    }
  });

  return errors;
}

// Общий блок «Проверьте форму»: список ошибок со ссылками на поля.
function renderErrorSummary(container, errors) {
  container.textContent = "";
  container.hidden = errors.length === 0;
  if (errors.length === 0) return;

  const title = createElement("p", {
    className: "form-errors__title",
    text: `Проверьте форму: ${errors.length} ${pluralize(errors.length, ["ошибка", "ошибки", "ошибок"])}`,
  });

  const list = createElement("ul", { className: "form-errors__list" });
  errors.forEach(({ field, message }) => {
    const link = createElement("a", {
      text: `${field.dataset.label || field.name}: ${message}`,
      attrs: { href: `#${field.id}` },
    });
    // Переход к полю по клику (вместо прыжка по якорю).
    link.addEventListener("click", (event) => {
      event.preventDefault();
      field.focus();
    });
    list.append(createElement("li", { children: [link] }));
  });

  container.append(title, list);
}

/* ---------- Подключение проверки к форме ---------- */

// options.summary — контейнер для общего списка ошибок (необязательно)
// options.onValid — функция, которая вызывается, если ошибок нет
function initFormValidation(form, options) {
  const { summary, onValid } = options;
  form.noValidate = true; // отключаем всплывающие подсказки браузера — показываем свои

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const errors = validateForm(form);
    if (summary) renderErrorSummary(summary, errors);

    if (errors.length > 0) {
      errors[0].field.focus();
      return;
    }
    onValid(form);
  });

  // Проверка при уходе из поля. Пустое поле не ругаем, пока пользователь
  // не нажал «Отправить» — иначе ошибки появятся ещё до ввода.
  form.addEventListener("focusout", (event) => {
    const field = event.target;
    if (!field.dataset || !field.dataset.validate || field.disabled) return;
    if (field.type !== "checkbox" && !field.value.trim() && field.getAttribute("aria-invalid") !== "true") {
      return;
    }
    const message = validateField(field);
    if (message) showFieldError(field, message);
    else clearFieldError(field);
  });

  // Если поле уже подсвечено ошибкой — перепроверяем на каждый ввод.
  const recheck = (event) => {
    const field = event.target;
    if (!field.dataset || field.getAttribute("aria-invalid") !== "true") return;
    const message = validateField(field);
    if (message) showFieldError(field, message);
    else clearFieldError(field);
  };
  form.addEventListener("input", recheck);
  form.addEventListener("change", recheck);

  form.addEventListener("reset", () => {
    Array.from(form.elements).forEach((element) => {
      if (element.id) clearFieldError(element);
    });
    if (summary) renderErrorSummary(summary, []);
  });
}
