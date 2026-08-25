// Remove tudo que não for dígito
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

// Remove tudo que nao for letra ou espaço. ( \p{L} pega letra acentuada )
export function onlyLetters(value: string): string {
  return value.replace(/[^\p{L}\s]/gu, '');
}

function maskCPF(digits: string): string {
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskCNPJ(digits: string): string {
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

// Formata como CPF (000.111.222-33) até 11 dgitos, 
// CNPJ (XX.XXX.XXX/XXXX-XX) apartir de 12-14 digitos, tbm nunca deixa passar de 14 digitos
export function formatDocument(rawValue: string): string {
  const digits = onlyDigits(rawValue).slice(0, 14);
  return digits.length <= 11 ? maskCPF(digits) : maskCNPJ(digits);
}

// Verdadeiro apenas quando o documento tem exatamente 11 (CPF) ou 14 (CNPJ) digitos
export function isValidDocumentLength(rawValue: string): boolean {
  const len = onlyDigits(rawValue).length;
  return len === 11 || len === 14;
}

// Telefone: (11) 9999-8888 (10 digitos) ou
// Celular: (11) 99999-8888 (11 digitos) limite 11 digitos .
export function formatPhone(rawValue: string): string {
  const digits = onlyDigits(rawValue).slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

// Validação simples de formato de email
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// CEP: 00000-000. Maximo 8 dígitos
export function formatCEP(rawValue: string): string {
  const digits = onlyDigits(rawValue).slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

// Número de cartão em grupos de 4: 4111 1111 1111 1111. Máximo 16 dígitos
export function formatCardNumber(rawValue: string): string {
  const digits = onlyDigits(rawValue).slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

// Formata centavos para exibição em campo de dinheiro (sem "R$"), sempre com 2 casas
export function centsToInputDisplay(cents: number): string {
  return (Math.max(0, cents) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

//Converte o texto digitado em centavos, os últimos dois digitos digitados sempre viram os centavos 
export function inputToCents(rawValue: string): number {
  const digits = onlyDigits(rawValue).replace(/^0+(?=\d)/, '');
  if (!digits) return 0;
  return parseInt(digits, 10);
}
