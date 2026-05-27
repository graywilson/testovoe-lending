/**
 * Точка входа фронтенда.
 *
 * Подключаем стили и инициализируем модули. Порядок важен: сначала рендерим
 * данные (создаются элементы с классом .reveal), и только потом запускаем
 * наблюдатель появления и остальной интерактив.
 */
import './styles/main.scss';

import { renderStack, renderProjects } from './modules/render';
import { initReveal } from './modules/reveal';
import { initNav } from './modules/nav';
import { initForm } from './modules/form';
import { initAssistant } from './modules/assistant';

// Запускаем шаг изолированно: ошибка в одном модуле не ломает остальные.
function safe(label: string, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    console.error(`[init] Сбой в «${label}»:`, err);
  }
}

function init(): void {
  // Текущий год в подвале.
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // 1. Данные -> разметка.
  safe('renderStack', renderStack);
  safe('renderProjects', renderProjects);

  // 2. Интерактив.
  safe('reveal', initReveal);
  safe('nav', initNav);
  safe('form', initForm);
  safe('assistant', initAssistant);
}

// Скрипт подключён как модуль (defer), но подстрахуемся на случай раннего запуска.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
