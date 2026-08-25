// centraliza a leitura das variaveis de ambiente, com valor padrão pra rodar em dev sem .env
export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USERNAME ?? 'baas',
    password: process.env.DB_PASSWORD ?? 'baas',
    database: process.env.DB_DATABASE ?? 'vba_baas',
  },

  credentialsEncryptionKey: process.env.CREDENTIALS_ENCRYPTION_KEY ?? '',

  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  },

  gateway: {
    baseUrl: process.env.LERA_BOX_BASE_URL ?? 'https://api.branchpay.com.br/api',
    webhookSecret: process.env.LERA_BOX_WEBHOOK_SECRET ?? '',
  },

  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000',

  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    from: process.env.SMTP_FROM ?? 'no-reply@vbasystems.com.br',
  },
});
