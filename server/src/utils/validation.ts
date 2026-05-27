import { ZodError } from 'zod';

/**
 * Превращаем ошибку валидации zod в плоскую карту { поле: сообщение },
 * которую удобно показать рядом с инпутами на фронтенде.
 */
export function zodErrorToFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}
