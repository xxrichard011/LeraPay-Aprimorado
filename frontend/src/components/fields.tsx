import { ChangeEvent } from 'react';
import {
  centsToInputDisplay,
  formatCardNumber,
  formatCEP,
  formatDocument,
  formatPhone,
  inputToCents,
  onlyDigits,
} from '../lib/masks';

// Campo de valor em reais: digitar só números, os 2 ultimos viram centavos.
export function MoneyField({
  label,
  valueCents,
  onChange,
  required,
}: {
  label: string;
  valueCents: number;
  onChange: (cents: number) => void;
  required?: boolean;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="money-input">
        <span className="money-prefix">R$</span>
        <input
          inputMode="numeric"
          value={centsToInputDisplay(valueCents)}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(inputToCents(e.target.value))}
          required={required}
        />
      </div>
    </div>
  );
}

// CPF/CNPJ: até 11 dígitos formata como CPF, de 12 a 14 como CNPJ.
export function DocumentField({
  label,
  value,
  onChange,
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (rawDigits: string) => void;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        inputMode="numeric"
        placeholder="000.000.000-00"
        value={formatDocument(value)}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(onlyDigits(e.target.value).slice(0, 14))
        }
        maxLength={18}
        required={required}
      />
      {hint && (
        <p className="hint" style={{ marginTop: 6, marginBottom: 0 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

// Telefone: (11) 99999-8888
export function PhoneField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (rawDigits: string) => void;
  required?: boolean;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        inputMode="numeric"
        placeholder="(11) 99999-8888"
        value={formatPhone(value)}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(onlyDigits(e.target.value).slice(0, 11))
        }
        maxLength={15}
        required={required}
      />
    </div>
  );
}

// CEP: 00000-000
export function CepField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (rawDigits: string) => void;
  required?: boolean;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        inputMode="numeric"
        placeholder="01310-100"
        value={formatCEP(value)}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(onlyDigits(e.target.value).slice(0, 8))
        }
        maxLength={9}
        required={required}
      />
    </div>
  );
}

// Número de cartão: agrupado de 4 em 4, até 16 digitos.
export function CardNumberField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (rawDigits: string) => void;
  required?: boolean;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        inputMode="numeric"
        placeholder="4111 1111 1111 1111"
        value={formatCardNumber(value)}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(onlyDigits(e.target.value).slice(0, 16))
        }
        maxLength={19}
        required={required}
      />
    </div>
  );
}

// CVV: Campo genérico só dígitos com limite de tamanho 3
export function DigitsField({
  label,
  value,
  onChange,
  maxLength,
  required,
}: {
  label: string;
  value: string;
  onChange: (rawDigits: string) => void;
  maxLength: number;
  required?: boolean;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(onlyDigits(e.target.value).slice(0, maxLength))
        }
        maxLength={maxLength}
        required={required}
      />
    </div>
  );
}
