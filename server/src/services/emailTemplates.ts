/**
 * HTML-шаблоны писем в стилистике сайта (тёмный градиентный хедер +
 * светлая читаемая карточка). Свёрстано на таблицах с инлайновыми стилями —
 * это единственный способ добиться предсказуемого вида в почтовых клиентах
 * (Gmail, Outlook, Mail.ru и т.д.).
 */
import type { LeadAnalysis } from './groq';

export interface LeadData {
  name: string;
  phone: string;
  email: string;
  comment: string;
}

/** Экранируем пользовательский ввод, чтобы он не ломал вёрстку письма. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Экранируем и сохраняем переносы строк (для комментария). */
function escapeMultiline(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

/** Текущее время по Москве — в подвал письма. С аккуратным fallback. */
function moscowTime(): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Europe/Moscow',
    }).format(new Date());
  } catch {
    return new Date().toISOString();
  }
}

const BRAND = 'Вадим Искаков';
const ACCENT = '#10b981'; // emerald — основной акцент сайта
const ACCENT_GRADIENT =
  'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)';

/**
 * Базовый каркас письма: тёмный хедер с градиентом, белая карточка контента,
 * подвал. Возвращает цельный HTML-документ.
 */
function layout(opts: {
  preheader: string;
  heading: string;
  subheading: string;
  body: string;
}): string {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(opts.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#0b1220;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2933;">
  <!-- Прехедер: текст превью в списке писем, скрыт в самом письме -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b1220;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 18px 50px rgba(2,8,23,0.45);">

          <!-- Хедер -->
          <tr>
            <td style="background:${ACCENT};background-image:${ACCENT_GRADIENT};padding:32px 32px 28px;">
              <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.85);font-weight:600;">${escapeHtml(BRAND)} · Портфолио</div>
              <div style="font-size:24px;line-height:1.25;color:#ffffff;font-weight:700;margin-top:10px;">${escapeHtml(opts.heading)}</div>
              <div style="font-size:15px;color:rgba(255,255,255,0.9);margin-top:6px;">${escapeHtml(opts.subheading)}</div>
            </td>
          </tr>

          <!-- Контент -->
          <tr>
            <td style="padding:28px 32px 8px;">
              ${opts.body}
            </td>
          </tr>

          <!-- Подвал -->
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #eef2f7;">
              <div style="font-size:12px;color:#94a3b8;line-height:1.6;">
                Отправлено автоматически с лендинга-портфолио · ${escapeHtml(moscowTime())} (МСК)<br>
                <a href="https://moimoment.ru" style="color:${ACCENT};text-decoration:none;">moimoment.ru</a> ·
                <a href="https://anonim.space" style="color:${ACCENT};text-decoration:none;">anonim.space</a> ·
                <a href="https://litra.su" style="color:${ACCENT};text-decoration:none;">litra.su</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Одна строка "поле → значение" в таблице данных заявки. */
function field(label: string, valueHtml: string): string {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eef2f7;vertical-align:top;width:120px;">
        <span style="font-size:13px;color:#94a3b8;font-weight:600;">${escapeHtml(label)}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #eef2f7;vertical-align:top;">
        <span style="font-size:15px;color:#1f2933;">${valueHtml}</span>
      </td>
    </tr>`;
}

/** Цвет бейджа приоритета. */
function priorityColor(priority: LeadAnalysis['priority']): string {
  if (priority === 'высокий') return '#ef4444';
  if (priority === 'низкий') return '#64748b';
  return '#f59e0b';
}

/** Блок AI-анализа заявки (вставляется в письмо владельцу). */
function aiBlock(analysis: LeadAnalysis): string {
  return `
  <div style="margin-top:24px;padding:20px;border-radius:14px;background:#f0fdf9;border:1px solid #bbf7e3;">
    <div style="font-size:13px;font-weight:700;color:#0f766e;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
      ✦ AI-анализ заявки
    </div>
    <div style="margin-bottom:12px;">
      <span style="display:inline-block;font-size:12px;font-weight:600;color:#0f766e;background:#ccfbef;padding:4px 12px;border-radius:999px;margin-right:6px;">${escapeHtml(analysis.category)}</span>
      <span style="display:inline-block;font-size:12px;font-weight:600;color:#ffffff;background:${priorityColor(analysis.priority)};padding:4px 12px;border-radius:999px;">приоритет: ${escapeHtml(analysis.priority)}</span>
    </div>
    <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#1f2933;">${escapeHtml(analysis.summary)}</p>
    ${
      analysis.suggestedReply
        ? `<p style="margin:0;font-size:14px;line-height:1.6;color:#475569;"><strong>С чего начать ответ:</strong> ${escapeHtml(analysis.suggestedReply)}</p>`
        : ''
    }
  </div>`;
}

/**
 * Письмо ВЛАДЕЛЬЦУ сайта: кто обратился + данные + AI-анализ.
 */
export function ownerEmail(lead: LeadData, analysis: LeadAnalysis | null): {
  subject: string;
  html: string;
} {
  const body = `
    <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#334155;">
      На сайте оставили новую заявку. Данные ниже${analysis ? ', а под ними — короткий AI-анализ обращения' : ''}.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${field('Имя', escapeHtml(lead.name))}
      ${field('Телефон', `<a href="tel:${escapeHtml(lead.phone.replace(/[^\d+]/g, ''))}" style="color:${ACCENT};text-decoration:none;">${escapeHtml(lead.phone)}</a>`)}
      ${field('Email', `<a href="mailto:${escapeHtml(lead.email)}" style="color:${ACCENT};text-decoration:none;">${escapeHtml(lead.email)}</a>`)}
      ${field('Комментарий', escapeMultiline(lead.comment))}
    </table>

    ${analysis ? aiBlock(analysis) : ''}
  `;

  return {
    subject: `Новая заявка с портфолио — ${lead.name}`,
    html: layout({
      preheader: `Новая заявка от ${lead.name}: ${lead.comment.slice(0, 80)}`,
      heading: 'Новая заявка с сайта',
      subheading: `От ${lead.name} · ${lead.email}`,
      body,
    }),
  };
}

/**
 * Письмо ПОЛЬЗОВАТЕЛЮ (копия-подтверждение): спасибо + что он отправил + контакты.
 */
export function userEmail(lead: LeadData): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      ${escapeHtml(lead.name)}, спасибо за обращение! 👋
    </p>
    <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#334155;">
      Я получил вашу заявку и отвечу в ближайшее время — обычно в течение дня.
      На всякий случай ниже копия того, что вы отправили.
    </p>

    <div style="margin:0 0 24px;padding:18px 20px;border-radius:14px;background:#f8fafc;border:1px solid #eef2f7;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${field('Телефон', escapeHtml(lead.phone))}
        ${field('Email', escapeHtml(lead.email))}
        ${field('Сообщение', escapeMultiline(lead.comment))}
      </table>
    </div>

    <p style="margin:0 0 10px;font-size:15px;color:#334155;font-weight:600;">Мои контакты для быстрой связи:</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.9;color:#334155;">
      📧 <a href="mailto:waalkerrr232@mail.ru" style="color:${ACCENT};text-decoration:none;">waalkerrr232@mail.ru</a><br>
      📱 <a href="tel:+79114110163" style="color:${ACCENT};text-decoration:none;">+7 (911) 411-01-63</a><br>
      ✈️ Telegram: <a href="https://t.me/EmeraldTower" style="color:${ACCENT};text-decoration:none;">@EmeraldTower</a>
    </p>

    <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">
      А пока можно посмотреть мои проекты:
      <a href="https://moimoment.ru" style="color:${ACCENT};text-decoration:none;">МойМомент</a>,
      <a href="https://anonim.space" style="color:${ACCENT};text-decoration:none;">Anonim.Space</a>,
      <a href="https://litra.su" style="color:${ACCENT};text-decoration:none;">Litra.Su</a>.
    </p>
  `;

  return {
    subject: 'Спасибо за обращение! — Вадим Искаков',
    html: layout({
      preheader: 'Я получил вашу заявку и скоро отвечу. Внутри — копия и мои контакты.',
      heading: 'Заявка принята 🎉',
      subheading: 'Это автоматическое подтверждение получения',
      body,
    }),
  };
}
