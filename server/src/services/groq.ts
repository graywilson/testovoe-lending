/**
 * Сервис общения с Groq (OpenAI-совместимый API).
 *
 * Здесь живут все три AI-сценария сайта:
 *   1) improveMessage  — "волшебная палочка": превращает черновик комментария
 *      в аккуратное деловое письмо;
 *   2) analyzeLead     — AI-анализ заявки для письма владельцу (саммари,
 *      категория, приоритет, подсказка для ответа);
 *   3) streamChat      — стриминг ответа AI-ассистента, который рассказывает
 *      о Вадиме (проксируем SSE от Groq на клиент).
 *
 * Ключ Groq используется ТОЛЬКО на сервере и никогда не уходит в браузер.
 */
import { config, aiEnabled } from '../config';
import { PROFILE_CONTEXT } from '../data/profile';

/** Ошибка, которую роуты превращают в аккуратный HTTP-ответ. */
export class AiError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = 'AiError';
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Базовый вызов chat/completions без стриминга. Возвращает текст ответа. */
async function complete(
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  if (!aiEnabled) {
    throw new AiError('AI-функции выключены: не задан GROQ_API_KEY.', 503);
  }

  let response: Response;
  try {
    response = await fetch(`${config.groq.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.groq.apiKey}`,
      },
      body: JSON.stringify({
        model: config.groq.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1024,
        stream: false,
      }),
      // Не зависаем навсегда, если внешний API тормозит.
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    // Сетевая ошибка / таймаут.
    throw new AiError(`Не удалось связаться с AI-сервисом: ${(err as Error).message}`);
  }

  if (!response.ok) {
    const details = await safeText(response);
    throw new AiError(`AI-сервис вернул ошибку ${response.status}: ${details}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new AiError('AI-сервис вернул пустой ответ.');
  return text;
}

/** Аккуратно читаем тело ответа об ошибке, не роняя процесс. */
async function safeText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return '(не удалось прочитать тело ответа)';
  }
}

/**
 * "Волшебная палочка" для поля комментария: переписывает черновик пользователя
 * в вежливое, структурированное деловое сообщение, сохраняя исходный смысл.
 */
export async function improveMessage(draft: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'Ты — редактор деловой переписки. Перепиши черновик в вежливое, ' +
        'грамотное и структурированное сообщение на русском от первого лица. ' +
        'Сохрани исходный смысл и факты, не добавляй вымышленных деталей. ' +
        'Сделай тон дружелюбно-деловым, убери ошибки и канцелярит. ' +
        'Длина — близка к исходной (1–2 абзаца). Верни ТОЛЬКО готовый текст, ' +
        'без пояснений, кавычек и markdown.',
    },
    { role: 'user', content: draft },
  ];
  return complete(messages, { temperature: 0.6, maxTokens: 700 });
}

export interface LeadAnalysis {
  summary: string;
  category: string;
  priority: 'низкий' | 'средний' | 'высокий';
  suggestedReply: string;
}

/**
 * AI-анализ входящей заявки. Результат вставляется в письмо владельцу:
 * короткое саммари, категория обращения, приоритет и подсказка для ответа.
 * При любой ошибке возвращаем null — письмо всё равно уйдёт (без AI-блока).
 */
export async function analyzeLead(lead: {
  name: string;
  email: string;
  phone: string;
  comment: string;
}): Promise<LeadAnalysis | null> {
  if (!aiEnabled) return null;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'Ты — ассистент, который сортирует входящие заявки с сайта-портфолио ' +
        'разработчика. Проанализируй обращение и верни СТРОГО валидный JSON ' +
        'без markdown по схеме: {"summary": string (1-2 предложения сути), ' +
        '"category": string (например "Вакансия", "Заказ проекта", "Вопрос", ' +
        '"Спам"), "priority": "низкий"|"средний"|"высокий", ' +
        '"suggestedReply": string (1 предложение — с чего начать ответ)}. ' +
        'Пиши на русском.',
    },
    {
      role: 'user',
      content:
        `Имя: ${lead.name}\nEmail: ${lead.email}\nТелефон: ${lead.phone}\n` +
        `Комментарий: ${lead.comment}`,
    },
  ];

  try {
    const raw = await complete(messages, { temperature: 0.3, maxTokens: 500 });
    const parsed = extractJson(raw);
    if (!parsed) return null;
    // Подстраховка: приводим к ожидаемой форме с дефолтами.
    return {
      summary: String(parsed.summary ?? '').slice(0, 600) || 'Анализ недоступен.',
      category: String(parsed.category ?? 'Обращение').slice(0, 60),
      priority: normalizePriority(parsed.priority),
      suggestedReply: String(parsed.suggestedReply ?? '').slice(0, 600),
    };
  } catch {
    // Анализ — приятный бонус, а не критичный путь. Молча деградируем.
    return null;
  }
}

/** Приводим приоритет к одному из трёх допустимых значений. */
function normalizePriority(value: unknown): LeadAnalysis['priority'] {
  const v = String(value ?? '').toLowerCase();
  if (v.includes('высок')) return 'высокий';
  if (v.includes('низк')) return 'низкий';
  return 'средний';
}

/**
 * Толерантный парсер JSON: модель иногда оборачивает ответ в текст/```json```.
 * Берём первую "{" и последнюю "}" и пытаемся распарсить содержимое.
 */
function extractJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

/**
 * Стриминг ответа AI-ассистента. Возвращает поток токенов через callback,
 * чтобы роут мог проксировать их клиенту как Server-Sent Events.
 *
 * @param history  история диалога (без system — он добавляется здесь)
 * @param onToken  вызывается на каждый кусочек текста
 */
export async function streamChat(
  history: ChatMessage[],
  onToken: (token: string) => void,
): Promise<void> {
  if (!aiEnabled) {
    throw new AiError('AI-функции выключены: не задан GROQ_API_KEY.', 503);
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: PROFILE_CONTEXT },
    ...history,
  ];

  const response = await fetch(`${config.groq.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.groq.apiKey}`,
    },
    body: JSON.stringify({
      model: config.groq.model,
      messages,
      temperature: 0.7,
      max_tokens: 700,
      stream: true,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok || !response.body) {
    const details = await safeText(response);
    throw new AiError(`AI-сервис вернул ошибку ${response.status}: ${details}`);
  }

  // Читаем поток и парсим формат OpenAI SSE: строки "data: {...}" + "data: [DONE]".
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE-события разделены пустой строкой; здесь нам достаточно разбивки по \n.
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? ''; // последний (возможно неполный) кусок оставляем

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice('data:'.length).trim();
      if (payload === '[DONE]') return;
      try {
        const json = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const token = json.choices?.[0]?.delta?.content;
        if (token) onToken(token);
      } catch {
        // Неполный/служебный кадр — пропускаем.
      }
    }
  }
}
