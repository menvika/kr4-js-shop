"use strict";

/* ==========================================================
   data.js — данные магазина

   Здесь хранится только информация: массив товаров, список
   категорий и промокоды. Никакой логики отображения в файле нет.

   У всех товаров ОДИНАКОВАЯ структура:
     id          — уникальный номер (число)
     title       — название
     category    — значение из списка categories (совпадает с фильтром)
     price       — цена числом (не строкой!)
     isAvailable — есть ли товар в наличии
   Дополнительные свойства: rating, reviews, badge, description,
   specs (характеристики) и image (данные для <picture>).
   ========================================================== */

// Категории. Значение value совпадает с product.category,
// а фильтр в каталоге строится из этого же массива.
const categories = [
  { value: "mono", label: "Моно-букеты" },
  { value: "mixed", label: "Авторские букеты" },
  { value: "basket", label: "Букеты в корзине" },
];

const products = [
  {
    id: 1,
    title: "Весенний букет",
    category: "mixed",
    price: 7200,
    isAvailable: true,
    rating: 4.8,
    reviews: 42,
    badge: "hit",
    description:
      "Букет из тюльпанов и нарциссов в нежной весенней палитре, отлично подходит для подарка на праздник или день рождения.",
    specs: [
      ["Состав", "тюльпаны, нарциссы"],
      ["Высота", "45 см"],
      ["Упаковка", "крафт-бумага"],
    ],
    image: { name: "fl1", widths: [400, 640, 654], width: 654, height: 872 },
  },
  {
    id: 2,
    title: "Моно-букет",
    category: "mono",
    price: 8100,
    isAvailable: true,
    rating: 4.9,
    reviews: 58,
    badge: "hit",
    description:
      "Пионы нежно-розового оттенка в премиальном оформлении — роскошный и очень стильный вариант для романтического подарка.",
    specs: [
      ["Состав", "пионы, 21 шт."],
      ["Высота", "50 см"],
      ["Упаковка", "премиальная бумага и лента"],
    ],
    image: { name: "fl2", widths: [400, 640, 960, 1052], width: 1052, height: 1402 },
  },
  {
    id: 3,
    title: "Букет в корзине",
    category: "basket",
    price: 12700,
    isAvailable: true,
    rating: 4.7,
    reviews: 19,
    badge: null,
    description:
      "Нежное ассорти в корзине — гармоничный микс цветов с уютной и элегантной подачей для любого случая.",
    specs: [
      ["Состав", "микс сезонных цветов"],
      ["Высота", "40 см"],
      ["Упаковка", "плетёная корзина"],
    ],
    image: { name: "fl3", widths: [400, 640, 900], width: 900, height: 1200 },
  },
  {
    id: 4,
    title: "Розовый букет",
    category: "mixed",
    price: 11500,
    isAvailable: true,
    rating: 4.6,
    reviews: 27,
    badge: "new",
    description:
      "Розовый букет из роз и пионов в классическом оформлении для торжественных событий, юбилеев и романтических сюрпризов.",
    specs: [
      ["Состав", "розы, пионы"],
      ["Высота", "55 см"],
      ["Упаковка", "атласная лента"],
    ],
    image: { name: "fl4", widths: [400, 640, 960, 1080], width: 1080, height: 1440 },
  },
  {
    id: 5,
    title: "Дофаминовый букет",
    category: "mixed",
    price: 9000,
    isAvailable: true,
    rating: 4.5,
    reviews: 15,
    badge: "new",
    description:
      "Ассорти из ярких и нежных цветов, которое поднимает настроение и выглядит эффектно как в интерьере, так и в руках у получателя.",
    specs: [
      ["Состав", "яркий микс цветов"],
      ["Высота", "45 см"],
      ["Упаковка", "цветная бумага"],
    ],
    image: { name: "fl5", widths: [400, 631], width: 631, height: 841 },
  },
  {
    id: 6,
    title: "Моно-букет кустовых роз",
    category: "mono",
    price: 9500,
    isAvailable: true,
    rating: 4.8,
    reviews: 23,
    badge: null,
    description:
      "Нежный моно-букет светло-розовых кустовых роз с лаконичной композицией и премиальной упаковкой.",
    specs: [
      ["Состав", "кустовые розы, 15 шт."],
      ["Высота", "50 см"],
      ["Упаковка", "премиальная бумага"],
    ],
    image: { name: "fl6", widths: [400, 640, 736], width: 736, height: 982 },
  },
  {
    id: 7,
    title: "Букет альстромерий",
    category: "mono",
    price: 3500,
    isAvailable: true,
    rating: 4.4,
    reviews: 31,
    badge: null,
    description:
      "Миниатюрный букет из альстромерий — лёгкий, воздушный и очень свежий вариант для подарка без излишеств.",
    specs: [
      ["Состав", "альстромерии, 9 шт."],
      ["Высота", "35 см"],
      ["Упаковка", "крафт-бумага"],
    ],
    image: { name: "fl7", widths: [400, 640, 736], width: 736, height: 981 },
  },
  {
    id: 8,
    title: "Ранункулюсы в корзине",
    category: "basket",
    price: 20000,
    isAvailable: false, // демонстрирует состояние «нет в наличии»
    rating: 5.0,
    reviews: 8,
    badge: null,
    description:
      "Моно-букет ранункулюсов в корзине, созданный для элегантного подарка с акцентом на текстуру и объём цветка.",
    specs: [
      ["Состав", "ранункулюсы, 25 шт."],
      ["Высота", "40 см"],
      ["Упаковка", "плетёная корзина"],
    ],
    image: { name: "fl8", widths: [400, 640, 713], width: 713, height: 951 },
  },
];

// Промокоды. type: "percent" — скидка в процентах, "fixed" — в рублях.
// minTotal — минимальная сумма товаров, при которой промокод действует.
const promoCodes = {
  SPRING10: { type: "percent", value: 10, minTotal: 0, label: "Скидка 10%" },
  FLOWERS500: { type: "fixed", value: 500, minTotal: 5000, label: "Скидка 500 руб." },
};

// Поиск товара по id. Возвращает объект или null.
function getProductById(id) {
  return products.find((product) => product.id === id) || null;
}

// Название категории по её значению.
function getCategoryLabel(value) {
  const category = categories.find((item) => item.value === value);
  return category ? category.label : "";
}
