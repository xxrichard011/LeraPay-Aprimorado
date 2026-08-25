import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/* Cifra/decifra (de senha e bearer token do gateway) antes de
ficar em `gateway_accounts`. nunca guardar os valores em texto. */
@Injectable()
export class EncryptionService implements OnModuleInit {
  private key: Buffer;

  constructor(private readonly config: ConfigService) {}

  // carrega a chave de cifragem assim que o módulo sobe, pra falhar cedo se estiver faltando
  onModuleInit() {
    const hexKey = this.config.get<string>('credentialsEncryptionKey');
    if (!hexKey || hexKey.length < 64) {
      throw new Error(
        'CREDENTIALS_ENCRYPTION_KEY ausente ou inválida. Gere uma com `openssl rand -hex 32`.',
      );
    }
    this.key = Buffer.from(hexKey.slice(0, 64), 'hex');
  }

  // cifra o texto e junta iv + authTag + conteúdo num só texto separado por ':'
  encrypt(plainText: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(
      ':',
    );
  }

  // faz o caminho inverso do encrypt, separando de novo iv/authTag/conteúdo
  decrypt(payload: string): string {
    const [ivB64, authTagB64, cipherB64] = payload.split(':');
    if (!ivB64 || !authTagB64 || !cipherB64) {
      throw new Error('Payload cifrado em formato inválido');
    }
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const cipherText = Buffer.from(cipherB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
