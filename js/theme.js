"use strict";

/* ==========================================================
   theme.js — тёмная тема

   Выбор темы хранится в localStorage. Если пользователь ещё
   ничего не выбирал, берём системную настройку (prefers-color-scheme).
   Тема включается атрибутом data-theme на <html>; сами цвета
   описаны в css/style.css.
   (Маленький скрипт в <head> каждой страницы ставит тему до
   отрисовки, чтобы не было «вспышки» светлой темы.)
   ========================================================== */

function getSavedTheme() {
  const saved = loadFromStorage(STORAGE_KEYS.theme, null);
  return saved === "dark" || saved === "light" ? saved : null;
}

function getCurrentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;

  const button = document.querySelector("#theme-toggle");
  if (button) {
    const isDark = theme === "dark";
    button.setAttribute("aria-pressed", String(isDark));
    button.setAttribute("aria-label", isDark ? "Выключить тёмную тему" : "Включить тёмную тему");
  }
}

function initTheme() {
  const prefersDark =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(getSavedTheme() || (prefersDark ? "dark" : "light"));

  const button = document.querySelector("#theme-toggle");
  if (!button) return;

  button.addEventListener("click", () => {
    const next = getCurrentTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    saveToStorage(STORAGE_KEYS.theme, next);
  });
}
