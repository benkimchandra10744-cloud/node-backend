# Stillroom

A server-rendered image library with email/password signup, login, and private S3 image storage. MongoDB stores account and image metadata; S3 objects remain private and are previewed with short-lived signed URLs.

## Setup

1. Copy `.env.example` to `.env` and set `MONGODB_URI`, a new random `JWT_SECRET` (at least 32 characters), `AWS_REGION`, and `S3_BUCKET`.
2. Provide AWS credentials through the standard AWS SDK credential chain. For local development, either add `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` to your ignored `.env` file or configure an AWS profile with `aws configure`. In production, prefer an IAM role. Never commit credentials or send them in chat.
3. Give the app's AWS identity permission to `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` for the configured bucket.
4. Install dependencies and start the app:

   ```sh
   npm install
   npm start
   ```

Open `http://localhost:3000`. Images must be JPEG, PNG, WebP, or GIF and no larger than 5 MB.

## Rate limiting and load balancing

- Login: 5 attempts per IP per 15 minutes.
- Signup: 5 attempts per IP per hour.
- Image uploads: 20 attempts per IP per hour.
- API: 100 requests per IP per 15 minutes, plus the login/signup-specific limits.
- `TRUST_PROXY` defaults to `0`. Set it to the number of trusted reverse proxies in front of Express (for example `1` for one Nginx or load-balancer hop). Do not trust proxies that clients can bypass.
- PM2 runs two Node.js workers in cluster mode and balances requests across them. Adjust `instances` in `ecosystem.config.cjs` to fit the server's CPU and memory.
- Set `REDIS_URL` to share rate-limit counters across all workers and future app servers. Without Redis, counters are in-memory per worker and the effective per-IP limit can be multiplied by the number of workers. Redis connection failures prevent the app from starting when `REDIS_URL` is set.

The app starts through `index.js`, which waits for the database and HTTP listener before reporting readiness to PM2, and gracefully closes MongoDB and Redis on shutdown.

On a server, install dependencies and apply the PM2 config with:

```sh
npm ci
pm2 startOrRestart ecosystem.config.cjs --update-env
pm2 save
```

For a single-process local run, use `npm start`; `npm run dev` restarts on source changes.

## Structure

- `models/`: MongoDB user and image metadata schemas.
- `controllers/`: signup/login and dashboard/upload behavior.
- `routes/`: browser pages, dashboard, and the existing JSON API.
- `middleware/`: JWT authentication for browser cookies and API bearer tokens.
- `services/`: private S3 upload and signed-preview URL operations.
- `views/` and `public/`: EJS pages and responsive styles.

Existing API endpoints remain available at `POST /api/auth/signup`, `POST /api/auth/login`, and authenticated `GET /api/dashboard`.
