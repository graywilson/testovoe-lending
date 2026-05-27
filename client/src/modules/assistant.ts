/**
 * Плавающий AI-ассистент.
 *
 * Отвечает на вопросы о Вадиме: стек, опыт, проекты. Ответ приходит стримом
 * (токен за токеном) — для этого фронтенд читает SSE с /api/ai/chat.
 * Каркас виджета — статичная разметка (доверенные строки), пользовательский
 * текст всегда подставляется через textContent.
 */
import { streamChat, type ChatTurn } from '../api/client';
import { assistantSuggestions } from '../data/content';

// Статичные SVG-иконки (без пользовательских данных).
const ICON_SPARK =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15l-1.9-4.1L5.5 9l4.6-1.4L12 3z" fill="currentColor"/></svg>';
const ICON_SEND =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 12l15-7.5-7 15-1.8-5.7L4.5 12z" fill="currentColor"/></svg>';

export function initAssistant(): void {
  const root = document.createElement('div');
  root.className = 'assistant';
  root.innerHTML = `
    <button class="assistant__fab" type="button" aria-label="Открыть AI-ассистента">
      ${ICON_SPARK}<span class="assistant__fab-label">Спросить AI</span>
    </button>
    <div class="assistant__panel" role="dialog" aria-label="AI-ассистент о Вадиме" hidden>
      <header class="assistant__header">
        <div class="assistant__header-title">
          <span class="assistant__header-avatar">${ICON_SPARK}</span>
          <span>AI-ассистент<small>спросите обо мне</small></span>
        </div>
        <button class="assistant__close" type="button" aria-label="Закрыть">&times;</button>
      </header>
      <div class="assistant__messages" id="assistantMessages"></div>
      <div class="assistant__suggests" id="assistantSuggests" hidden></div>
      <form class="assistant__form" id="assistantForm">
        <input class="assistant__input" id="assistantInput" type="text" autocomplete="off"
               placeholder="Спросите про стек, опыт, проекты…" maxlength="500" />
        <button class="assistant__send" type="submit" aria-label="Отправить">${ICON_SEND}</button>
      </form>
      <p class="assistant__disclaimer">Ответы генерирует AI (Groq) — возможны неточности.</p>
    </div>`;
  document.body.append(root);

  // Ссылки на элементы виджета.
  const fab = root.querySelector<HTMLButtonElement>('.assistant__fab')!;
  const panel = root.querySelector<HTMLElement>('.assistant__panel')!;
  const closeBtn = root.querySelector<HTMLButtonElement>('.assistant__close')!;
  const messagesEl = root.querySelector<HTMLElement>('#assistantMessages')!;
  const suggestsEl = root.querySelector<HTMLElement>('#assistantSuggests')!;
  const formEl = root.querySelector<HTMLFormElement>('#assistantForm')!;
  const inputEl = root.querySelector<HTMLInputElement>('#assistantInput')!;
  const sendBtn = root.querySelector<HTMLButtonElement>('.assistant__send')!;

  // История диалога, которая уходит в API (system-промпт добавляет сервер).
  const history: ChatTurn[] = [];
  let streaming = false;
  let greeted = false;
  let abortController: AbortController | null = null;

  // ---------- Рендер сообщений ----------
  const scrollDown = (): void => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const addBubble = (kind: 'bot' | 'user' | 'error', text: string): HTMLElement => {
    const bubble = document.createElement('div');
    bubble.className = `msg msg--${kind}`;
    bubble.textContent = text;
    messagesEl.append(bubble);
    scrollDown();
    return bubble;
  };

  const renderSuggestions = (): void => {
    suggestsEl.innerHTML = '';
    suggestsEl.hidden = false;
    for (const question of assistantSuggestions) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.textContent = question;
      chip.addEventListener('click', () => {
        if (!streaming) void send(question);
      });
      suggestsEl.append(chip);
    }
  };

  const setStreaming = (on: boolean): void => {
    streaming = on;
    inputEl.disabled = on;
    sendBtn.disabled = on;
  };

  // ---------- Открытие / закрытие ----------
  const open = (): void => {
    panel.hidden = false;
    fab.classList.add('is-hidden');
    // Класс на следующий кадр — чтобы сработала transition-анимация.
    requestAnimationFrame(() => panel.classList.add('is-open'));
    if (!greeted) {
      greeted = true;
      addBubble(
        'bot',
        'Привет! Я AI-ассистент Вадима. Могу рассказать про его стек, опыт и проекты. Что интересует? 👋',
      );
      renderSuggestions();
    }
    window.setTimeout(() => inputEl.focus(), 200);
  };

  const close = (): void => {
    panel.classList.remove('is-open');
    fab.classList.remove('is-hidden');
    abortController?.abort(); // прерываем активный стрим, если есть
    window.setTimeout(() => {
      panel.hidden = true;
    }, 250);
  };

  // ---------- Отправка сообщения ----------
  async function send(text: string): Promise<void> {
    const message = text.trim();
    if (!message || streaming) return;

    suggestsEl.hidden = true;
    addBubble('user', message);
    history.push({ role: 'user', content: message });
    inputEl.value = '';

    // Пузырь бота с индикатором «печатает…».
    const bot = addBubble('bot', '');
    bot.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';
    let answer = '';
    let firstToken = true;

    setStreaming(true);
    abortController = new AbortController();
    try {
      await streamChat(history, {
        signal: abortController.signal,
        onToken: (token) => {
          if (firstToken) {
            bot.textContent = ''; // убираем индикатор на первом токене
            firstToken = false;
          }
          answer += token;
          bot.textContent = answer;
          scrollDown();
        },
      });

      if (answer.trim()) {
        history.push({ role: 'assistant', content: answer });
      } else {
        bot.remove();
        addBubble('error', 'Пустой ответ. Попробуйте переформулировать вопрос.');
      }
    } catch (err) {
      bot.remove();
      // Прерывание при закрытии окна — не ошибка.
      if ((err as Error).name !== 'AbortError') {
        addBubble('error', (err as Error).message || 'Не удалось получить ответ. Попробуйте позже.');
      }
    } finally {
      setStreaming(false);
      abortController = null;
      if (!panel.hidden) inputEl.focus();
    }
  }

  // ---------- Слушатели ----------
  fab.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) close();
  });
  // Кнопки «Спросить AI обо мне» в разметке страницы.
  document.querySelectorAll('[data-open-assistant]').forEach((btn) => btn.addEventListener('click', open));

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    void send(inputEl.value);
  });
}
