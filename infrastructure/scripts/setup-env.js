const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
const keysDir = path.join(rootDir, 'keys');

let priv = '';
let pub = '';

if (fs.existsSync(path.join(keysDir, 'jwt-private.pem'))) {
  priv = fs.readFileSync(path.join(keysDir, 'jwt-private.pem'), 'utf8').trim().replace(/\r?\n/g, '\\n');
  pub = fs.readFileSync(path.join(keysDir, 'jwt-public.pem'), 'utf8').trim().replace(/\r?\n/g, '\\n');
}

const envContent = `# NetOrbit Environment Variables - Development
NODE_ENV=development
PORT=3001
API_BASE_URL=http://localhost:3001
ADMIN_URL=http://localhost:3000
CUSTOMER_URL=http://localhost:3002
CAPTIVE_URL=http://localhost:3003

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=netorbit_user
DB_PASSWORD=netorbit_password
DB_NAME=netorbit
DB_SSL=false
DB_POOL_SIZE=20
DB_LOGGING=false

# Cache & Message Broker (Redis)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Security (JWT RS256)
JWT_PRIVATE_KEY="${priv}"
JWT_PUBLIC_KEY="${pub}"
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email (MailHog)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@netorbit.local
SMTP_SECURE=false

# Storage (MinIO)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=netorbit_minio
MINIO_SECRET_KEY=minio_secret_key_123
MINIO_BUCKET=netorbit
MINIO_USE_SSL=false

# Rate Limiting & Hashing
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=200

# Initial Super Admin Seed
SUPER_ADMIN_EMAIL=admin@netorbit.local
SUPER_ADMIN_PASSWORD=NetOrbit@Admin2026
`;

fs.writeFileSync(path.join(rootDir, '.env'), envContent);
fs.writeFileSync(path.join(rootDir, '.env.example'), envContent.replace(priv, '-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----').replace(pub, '-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----'));
fs.writeFileSync(path.join(rootDir, 'apps/api/.env'), envContent);

console.log('Successfully written .env and .env.example');
