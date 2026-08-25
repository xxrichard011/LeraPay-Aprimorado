import { BadRequestException, ValidationError } from '@nestjs/common';

/* Por padrão, o class-validator gera mensagens em inglês

Isso é o que fazia o cliente ver alertas que ele não entendia. 

Este factory:

1. Usa a mensagem customizada do campo quando ela existe.

2. Aplica uma tradução para os tipos de erro mais comuns do class-validator que ainda não tenham mensagem customizada

3. Junta tudo em um array de strings legíveis, que o frontend ja exibi (frontend/src/api/client.ts). */

const GENERIC_TYPE_TRANSLATIONS: Record<string, (field: string) => string> = {
  isNotEmpty: (field) => `O campo "${field}" é obrigatório.`,
  isString: (field) => `O campo "${field}" é inválido.`,
  isInt: (field) => `O campo "${field}" deve ser um número inteiro.`,
  isNumber: (field) => `O campo "${field}" deve ser um número.`,
  isPositive: (field) => `O campo "${field}" deve ser maior que zero.`,
  isEmail: () => 'Informe um e-mail válido.',
  isEnum: (field) => `O valor informado para "${field}" não é válido.`,
  isIn: (field) => `O valor informado para "${field}" não é válido.`,
  isBoolean: (field) => `O campo "${field}" é inválido.`,
  isArray: (field) => `O campo "${field}" é inválido.`,
  min: (field) => `O campo "${field}" está abaixo do valor mínimo permitido.`,
  max: (field) => `O campo "${field}" está acima do valor máximo permitido.`,
  minLength: (field) => `O campo "${field}" é muito curto.`,
  maxLength: (field) => `O campo "${field}" é muito longo.`,
  matches: (field) => `O campo "${field}" está em um formato inválido.`,
  isNotEmptyObject: (field) => `O campo "${field}" é obrigatório.`,
  whitelistValidation: (field) => `O campo "${field}" não é reconhecido pela API.`,
  nestedValidation: (field) => `Os dados enviados em "${field}" são inválidos.`,
};

function translateConstraint(field: string, constraintKey: string, fallback: string): string {
  const translator = GENERIC_TYPE_TRANSLATIONS[constraintKey];
  if (translator) return translator(field);

  return fallback && !/must |should |property /i.test(fallback)
    ? fallback
    : `O campo "${field}" é inválido.`;
}

function collectMessages(errors: ValidationError[], parentPath = ''): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      for (const [constraintKey, rawMessage] of Object.entries(error.constraints)) {
        messages.push(translateConstraint(field, constraintKey, rawMessage));
      }
    }

    if (error.children?.length) {
      messages.push(...collectMessages(error.children, field));
    }

    if (!error.constraints && !error.children?.length) {
      messages.push(`O campo "${field}" é inválido.`);
    }
  }

  // Remove duplicadas mantendo a ordem
  return Array.from(new Set(messages));
}

export function friendlyValidationExceptionFactory(errors: ValidationError[]): BadRequestException {
  const messages = collectMessages(errors);
  return new BadRequestException({
    message: messages.length > 0 ? messages : ['Dados inválidos. Verifique os campos e tente novamente.'],
    error: 'Bad Request',
  });
}
