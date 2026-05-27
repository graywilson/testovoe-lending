/**
 * AI-роуты (Groq):
 *   POST /api/ai/improve — "волшебная палочка": улучшает текст комментария;
 *   POST /api/ai/chat    — стриминговый ответ ассистента (SSE), который
 *                          рассказывает о Вадиме.
 *
 * Ключ Groq используется только здесь, на сервере. Браузер ходит к нашему API.
 */
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { zodErrorToFields } from '../utils/validation';
import { aiEnabled } from '../config';
import { improveMessage, streamChat, AiError, type ChatMessage } from '../services/groq';

export const aiRouter = Router();

// ---------- 1. Улучшение текста ("волшебная палочка") ----------

const improveSchema = z.object({
  text: z
    .string({ required_error: 'Нет текста для улучшения' })
    .trim()
    .min(3, 'Слишком короткий текст')
    .max(3000, 'Слишком длинный текст'),
});

aiRouter.post(
  '/improve',
  asyncHandler(async (req, res) => {
    const parsed = improveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, errors: zodErrorToFields(parsed.error) });
    }

    const improved = await improveMessage(parsed.data.text);
    return res.json({ ok: true, text: improved });
  }),
);

// ---------- 2. Чат с AI-ассистентом (стриминг через SSE) ----------

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1, 'Пустой диалог')
    .max(20, 'Слишком длинная история'),
});

aiRouter.post(
  '/chat',
  asyncHandler(async (req, res) => {
    // AI выключен — отвечаем понятным JSON ещё до начала стрима.
    if (!aiEnabled) {
      return res.status(503).json({ ok: false, message: 'AI-ассистент сейчас недоступен.' });
    }

    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, errors: zodErrorToFields(parsed.error) });
    }

    // Переключаемся в режим Server-Sent Events.
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // отключаем буферизацию на reverse-proxy
    res.flushHeaders?.();

    try {
      await streamChat(parsed.data.messages as ChatMessage[], (token) => {
        // Каждый токен — отдельное SSE-событие.
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      });
      res.write('data: [DONE]\n\n');
    } catch (err) {
      // Заголовки уже отправлены, обычный 500 вернуть нельзя —
      // шлём ошибку как событие, фронтенд её распарсит.
      const message = err instanceof AiError ? err.message : 'Ошибка AI-ассистента.';
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    } finally {
      res.end();
    }
    return undefined;
  }),
);
