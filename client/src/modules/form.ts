/**
 * Логика формы обратной связи: клиентская валидация, состояния
 * loading/success/error и AI «волшебная палочка» для поля комментария.
 *
 * Клиентская валидация — для удобства пользователя; финальную проверку
 * всё равно делает сервер, и его ошибки по полям мы тоже показываем.
 */
import { sendContact, improveText, type ContactPayload } from '../api/client';
import { qs } from './dom';

type FieldId = 'name' | 'phone' | 'email' | 'comment';

// Правила те же, что на сервере (server/src/routes/contact.ts).
const validators: Record<FieldId, (value: string) => string> = {
  name: (v) => {
    const t = v.trim();
    if (t.length < 2) return 'Укажите имя (минимум 2 символа)';
    if (t.length > 80) return 'Слишком длинное имя';
    return '';
  },
  phone: (v) => {
    const t = v.trim();
    if (!t) return 'Укажите телефон';
    if (!/^[+\d][\d\s()\-]{4,}$/.test(t)) return 'Некорректный номер телефона';
    return '';
  },
  email: (v) => {
    const t = v.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return 'Некорректный email';
    if (t.length > 120) return 'Слишком длинный email';
    return '';
  },
  comment: (v) => {
    const t = v.trim();
    if (t.length < 5) return 'Сообщение слишком короткое (минимум 5 символов)';
    if (t.length > 3000) return 'Сообщение слишком длинное';
    return '';
  },
};

export function initForm(): void {
  const form = qs<HTMLFormElement>('#contactForm');
  if (!form) return;

  const fields: Record<FieldId, HTMLInputElement | HTMLTextAreaElement> = {
    name: qs<HTMLInputElement>('#name')!,
    phone: qs<HTMLInputElement>('#phone')!,
    email: qs<HTMLInputElement>('#email')!,
    comment: qs<HTMLTextAreaElement>('#comment')!,
  };
  const submitBtn = qs<HTMLButtonElement>('#submitBtn')!;
  const statusEl = qs<HTMLParagraphElement>('#formStatus')!;
  const wandBtn = qs<HTMLButtonElement>('#improveBtn')!;
  const hintEl = qs<HTMLParagraphElement>('#wandHint')!;

  // Исходный текст комментария до улучшения — чтобы можно было откатить.
  let originalComment: string | null = null;

  // ---------- Вспомогательные функции состояния ----------
  const setFieldError = (id: FieldId, message: string): void => {
    const errorEl = form.querySelector<HTMLElement>(`[data-error-for="${id}"]`);
    if (errorEl) errorEl.textContent = message;
    fields[id].closest('.field')?.classList.toggle('is-invalid', Boolean(message));
    fields[id].setAttribute('aria-invalid', message ? 'true' : 'false');
  };

  const validateField = (id: FieldId): boolean => {
    const message = validators[id](fields[id].value);
    setFieldError(id, message);
    return message === '';
  };

  const showStatus = (type: 'success' | 'error', message: string): void => {
    statusEl.hidden = false;
    statusEl.textContent = message;
    statusEl.classList.remove('is-success', 'is-error');
    statusEl.classList.add(type === 'success' ? 'is-success' : 'is-error');
  };
  const clearStatus = (): void => {
    statusEl.hidden = true;
    statusEl.textContent = '';
    statusEl.classList.remove('is-success', 'is-error');
  };

  const setSubmitting = (busy: boolean): void => {
    submitBtn.disabled = busy;
    submitBtn.classList.toggle('is-loading', busy);
    submitBtn.setAttribute('aria-busy', String(busy));
  };
  const setWandLoading = (busy: boolean): void => {
    wandBtn.disabled = busy;
    wandBtn.classList.toggle('is-loading', busy);
  };

  const clearHint = (): void => {
    hintEl.hidden = true;
    hintEl.textContent = '';
  };
  const showHint = (message: string): void => {
    hintEl.hidden = false;
    hintEl.textContent = message;
  };
  // Подсказка после улучшения текста — с кнопкой отката.
  const showRevertHint = (): void => {
    hintEl.hidden = false;
    hintEl.textContent = '✨ Текст оформлен с помощью AI. ';
    const revert = document.createElement('button');
    revert.type = 'button';
    revert.textContent = 'Вернуть исходный';
    revert.addEventListener('click', () => {
      if (originalComment === null) return;
      fields.comment.value = originalComment;
      originalComment = null;
      validateField('comment');
      clearHint();
    });
    hintEl.append(revert);
  };

  // ---------- Живая валидация ----------
  (Object.keys(fields) as FieldId[]).forEach((id) => {
    fields[id].addEventListener('blur', () => validateField(id));
    // Если поле уже подсвечено ошибкой — пересчитываем по мере ввода.
    fields[id].addEventListener('input', () => {
      if (fields[id].closest('.field')?.classList.contains('is-invalid')) validateField(id);
    });
  });

  // ---------- AI «волшебная палочка» ----------
  wandBtn.addEventListener('click', async () => {
    const text = fields.comment.value.trim();
    if (text.length < 5) {
      showHint('Напишите хотя бы пару слов — AI оформит их в аккуратное письмо.');
      return;
    }
    setWandLoading(true);
    clearHint();
    try {
      const improved = await improveText(text);
      originalComment = fields.comment.value;
      fields.comment.value = improved;
      validateField('comment');
      showRevertHint();
    } catch (err) {
      showHint((err as Error).message || 'Не удалось улучшить текст. Попробуйте ещё раз.');
    } finally {
      setWandLoading(false);
    }
  });

  // ---------- Отправка ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearStatus();

    const ids = Object.keys(fields) as FieldId[];
    const results = ids.map((id) => validateField(id));
    if (results.includes(false)) {
      const firstInvalid = ids.find((_, i) => !results[i]);
      if (firstInvalid) fields[firstInvalid].focus();
      showStatus('error', 'Проверьте правильность заполнения полей.');
      return;
    }

    const payload: ContactPayload = {
      name: fields.name.value.trim(),
      phone: fields.phone.value.trim(),
      email: fields.email.value.trim(),
      comment: fields.comment.value.trim(),
    };

    setSubmitting(true);
    try {
      const res = await sendContact(payload);

      if (res.status === 200 && res.ok) {
        showStatus('success', res.message || 'Заявка отправлена! Спасибо за обращение.');
        form.reset();
        originalComment = null;
        clearHint();
        ids.forEach((id) => setFieldError(id, ''));
      } else if (res.status === 400 && res.errors) {
        // Серверные ошибки валидации — раскладываем по полям.
        for (const [field, message] of Object.entries(res.errors)) {
          if (field in fields) setFieldError(field as FieldId, message);
        }
        showStatus('error', res.message || 'Проверьте правильность заполнения полей.');
      } else {
        showStatus('error', res.message || 'Не удалось отправить заявку. Попробуйте позже.');
      }
    } catch {
      // Сеть/непредвиденная ошибка fetch.
      showStatus('error', 'Сеть недоступна. Проверьте соединение и попробуйте снова.');
    } finally {
      setSubmitting(false);
    }
  });
}
