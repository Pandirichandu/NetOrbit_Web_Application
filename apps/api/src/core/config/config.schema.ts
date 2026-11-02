import * as Joi from 'joi';

export const configSchema = Joi.object({
  // App
  NODE_ENV: Joi.string().valid('development', 'staging', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),
  API_BASE_URL: Joi.string().default('http://localhost:3001'),

  // Frontend URLs
  ADMIN_URL: Joi.string().default('http://localhost:3000'),
  CUSTOMER_URL: Joi.string().default('http://localhost:3002'),
  CAPTIVE_URL: Joi.string().default('http://localhost:3003'),

  // Database
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().default('netorbit'),
  DB_SSL: Joi.boolean().default(false),
  DB_POOL_SIZE: Joi.number().default(20),
  DB_LOGGING: Joi.boolean().default(false),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().default(0),

  // JWT
  JWT_PRIVATE_KEY: Joi.string().required(),
  JWT_PUBLIC_KEY: Joi.string().required(),
  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().default('7d'),

  // Email (SMTP)
  SMTP_HOST: Joi.string().default('localhost'),
  SMTP_PORT: Joi.number().default(1025),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASS: Joi.string().allow('').default(''),
  SMTP_FROM: Joi.string().default('noreply@netorbit.local'),
  SMTP_SECURE: Joi.boolean().default(false),

  // MinIO
  MINIO_ENDPOINT: Joi.string().default('localhost'),
  MINIO_PORT: Joi.number().default(9000),
  MINIO_ACCESS_KEY: Joi.string().default('minioadmin'),
  MINIO_SECRET_KEY: Joi.string().default('minioadmin'),
  MINIO_BUCKET: Joi.string().default('netorbit'),
  MINIO_USE_SSL: Joi.boolean().default(false),

  // Security
  BCRYPT_ROUNDS: Joi.number().default(12),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(200),

  // Superadmin seed
  SUPER_ADMIN_EMAIL: Joi.string().email({ tlds: false }).default('admin@netorbit.local'),
  SUPER_ADMIN_PASSWORD: Joi.string().min(12).default('NetOrbit@Admin2026'),

  // Payments (Phase 3 - optional in Phase 1)
  RAZORPAY_KEY_ID: Joi.string().allow('').default(''),
  RAZORPAY_KEY_SECRET: Joi.string().allow('').default(''),
  STRIPE_SECRET_KEY: Joi.string().allow('').default(''),
  STRIPE_WEBHOOK_SECRET: Joi.string().allow('').default(''),
  PAYPAL_CLIENT_ID: Joi.string().allow('').default(''),
  PAYPAL_CLIENT_SECRET: Joi.string().allow('').default(''),
  PHONEPE_MERCHANT_ID: Joi.string().allow('').default(''),
  PHONEPE_SALT_KEY: Joi.string().allow('').default(''),
  CASHFREE_APP_ID: Joi.string().allow('').default(''),
  CASHFREE_SECRET_KEY: Joi.string().allow('').default(''),

  // RADIUS (Phase 4 - optional)
  RADIUS_HOST: Joi.string().allow('').default(''),
  RADIUS_PORT: Joi.number().default(1812),
  RADIUS_SECRET: Joi.string().allow('').default(''),

  // Notifications (Phase 8 - optional)
  TWILIO_ACCOUNT_SID: Joi.string().allow('').default(''),
  TWILIO_AUTH_TOKEN: Joi.string().allow('').default(''),
  SENDGRID_API_KEY: Joi.string().allow('').default(''),
  FCM_SERVER_KEY: Joi.string().allow('').default(''),

  // Observability (Phase 10 - optional)
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().allow('').default(''),
  OTEL_SERVICE_NAME: Joi.string().default('netorbit-api'),
});
