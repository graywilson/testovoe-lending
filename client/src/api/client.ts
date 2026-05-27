/**
 * Тонкий клиент нашего API. Все запросы идут на относительный /api,
 * поэтому одинаково работают и в dev (через прокси Vite), и в проде
 * (где бэкенд сам отдаёт статику с того же origin).
 */

export interface ContactPayload {
  name: string;
  phone: string;
  email: string;
  comment: string;
}

export interface ContactResponse {
  ok: boolean;
  status: number;
  message?: string;
  /** Ошибки по полям с сервера: { email: 'Некорректный email' } */
  errors?: Record<string, string>;
}

/** Отправка формы обратной связи. Возвращает разобранный ответ + HTTP-статус. */
export async function sendContact(payload: ContactPayload): Promise<ContactResponse> {
  const res = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // Тело может быть пустым/не-JSON при сетевых сбоях — аккуратно подстраховываемся.
  let data: Partial<ContactResponse> = {};
  try {
    data = (await res.json()) as Partial<ContactResponse>;
  } catch {
    /* оставляем data пустым */
  }

  return {
    ok: Boolean(data.ok),
    status: res.status,
    message: data.message,
    errors: data.errors,
  };
}

/** AI «волшебная палочка»: вернуть улучшенный текст или бросить ошибку. */
export async function improveText(text: string): Promise<string> {
  const res = await fetch('/api/ai/improve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    text?: string;
    message?: string;
    errors?: Record<string, string>;
  };

  if (!res.ok || !data.ok || !data.text) {
    const firstFieldError = data.errors ? Object.values(data.errors)[0] : undefined;
    throw new Error(data.message || firstFieldError || 'Не удалось улучшить текст');
  }
  return data.text;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Стриминговый чат с AI-ассистентом. Читает Server-Sent Events с бэкенда
 * и отдаёт каждый токен в onToken. Поддерживает отмену через AbortSignal.
 */
export async function streamChat(
  messages: ChatTurn[],
  handlers: { onToken: (token: string) => void; signal?: AbortSignal },
): Promise<void> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal: handlers.signal,
  });

  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message || 'AI-ассистент сейчас недоступен');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // События SSE разделены пустой строкой (\n\n).
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const event of events) {
      const line = event.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return;

      let json: { token?: string; error?: string };
      try {
        json = JSON.parse(payload);
      } catch {
        continue; // неполный/служебный кадр
      }
      if (json.error) throw new Error(json.error);
      if (json.token) handlers.onToken(json.token);
    }
  }
}
