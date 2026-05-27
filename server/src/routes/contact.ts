/**
 * Роут формы обратной связи: POST /api/contact
 *
 * Полный цикл: валидация -> AI-анализ заявки (необязательный) ->
 * отправка письма владельцу + копии пользователю -> ответ с результатом.
 */
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { zodErrorToFields } from '../utils/validation';
import { analyzeLead } from '../services/groq';
import { sendLeadEmails } from '../services/mailer';

export const contactRouter = Router();

// Серверная схема — главный источник правды по валидации.
// Фронтенд проверяет то же самое для UX, но доверять можно только серверу.
const contactSchema = z.object({
  name: z
    .string({ required_error: 'Укажите имя' })
    .trim()
    .min(2, 'Имя слишком короткое')
    .max(80, 'Имя слишком длинное'),
  phone: z
    .string({ required_error: 'Укажите телефон' })
    .trim()
    .min(5, 'Телефон слишком короткий')
    .max(30, 'Телефон слишком длинный')
    .regex(/^[+\d][\d\s()\-]{4,}$/, 'Некорректный номер телефона'),
  email: z
    .string({ required_error: 'Укажите email' })
    .trim()
    .max(120, 'Email слишком длинный')
    .email('Некорректный email'),
  comment: z
    .string({ required_error: 'Напишите сообщение' })
    .trim()
    .min(5, 'Сообщение слишком короткое')
    .max(3000, 'Сообщение слишком длинное'),
});

contactRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    // 1. Валидация входных данных.
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: 'Проверьте правильность заполнения полей.',
        errors: zodErrorToFields(parsed.error),
      });
    }
    const lead = parsed.data;

    // 2. AI-анализ заявки — приятный бонус для письма владельцу.
    //    Если Groq недоступен/выключен, функция вернёт null, и письмо уйдёт без блока.
    const analysis = await analyzeLead(lead);

    // 3. Отправка писем. Падение письма владельцу = ошибка всего запроса
    //    (её поймает общий обработчик и вернёт 500).
    const { copySent } = await sendLeadEmails(lead, analysis);

    // 4. Успех.
    return res.status(200).json({
      ok: true,
      message: copySent
        ? 'Заявка отправлена! Копия письма ушла вам на почту.'
        : 'Заявка отправлена! (Копию на вашу почту доставить не удалось — но я всё получил.)',
      copySent,
      analyzed: analysis !== null,
    });
  }),
);
