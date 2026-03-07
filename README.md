# מערכת ניהול פלוגת יוגב שגרה וחירום - Yogev System

מערכת תפעול פלוגתית פנימית לפלוגת מילואים.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS, Prisma ORM, PostgreSQL |
| Frontend | Next.js 14 (App Router), React Query, Zustand |
| Styling | TailwindCSS (RTL, Military theme) |
| Auth | JWT + Email OTP |
| Database | PostgreSQL 16 |
| Email | Gmail API |

## Project Structure

```
yogev-system/
├── backend/                 # NestJS Backend API
│   ├── src/
│   │   ├── modules/        # Feature modules (auth, users, admin, etc.)
│   │   ├── email/          # Gmail API email service
│   │   ├── prisma/         # Prisma service
│   │   └── upload/         # File upload service
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── seed.ts         # Database seed
│   └── uploads/            # Uploaded files
├── frontend/               # Next.js Frontend
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   ├── components/    # React components
│   │   ├── lib/           # API client, utilities
│   │   └── hooks/         # Custom React hooks
└── docker-compose.dev.yml  # Development Docker config
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- Docker Desktop
- npm or yarn

### 1. Start PostgreSQL Database

```bash
cd yogev-system
docker-compose -f docker-compose.dev.yml up -d
```

Verify it's running:
```bash
docker ps
```

### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed the database
npx prisma db seed

# Start development server
npm run start:dev
```

Backend runs on: **http://localhost:3001**

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server (use port 3004 if 3000 is busy)
npm run dev -- -p 3004
```

Frontend runs on: **http://localhost:3004**

---

## Default Login Credentials

| User | Email | Password |
|------|-------|----------|
| Admin | `admin@yogev.idf.il` | `Admin123!` |
| Commander | `commander@yogev.idf.il` | `Commander123!` |

---

## Viewing Logs

### Backend Logs (NestJS)

When running with `npm run start:dev`, logs appear in the terminal. To run in background and view logs:

```bash
# Start in background
cd backend
npm run start:dev &

# View logs in real-time
tail -f /path/to/output.log

# Or run in foreground to see logs directly
npm run start:dev
```

### OTP Codes in Logs

When Gmail API is not configured, OTP codes are logged to the console:

```
========================================
OTP CODE for user@email.com: 123456
========================================
```

### Database Query Logs

In development mode, all Prisma queries are logged. Check `backend/src/prisma/prisma.service.ts`:

```typescript
super({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});
```

### Frontend Logs (Next.js)

```bash
cd frontend
npm run dev -- -p 3004
```

Logs appear in the terminal. Browser console shows client-side logs.

---

## Database Access

### Option 1: Prisma Studio (GUI)

```bash
cd backend
npx prisma studio
```

Opens at: **http://localhost:5555**

### Option 2: Command Line (psql via Docker)

```bash
# Connect to database
docker exec -it yogev-postgres psql -U yogev -d yogev_db

# List tables
\dt

# Query users
SELECT email, "fullName", role FROM users;

# Query OTPs (to see OTP codes)
SELECT * FROM otps ORDER BY "createdAt" DESC;

# Exit
\q
```

### Quick Queries

```bash
# List all users
docker exec yogev-postgres psql -U yogev -d yogev_db -c 'SELECT email, "fullName", role FROM users;'

# List all messages
docker exec yogev-postgres psql -U yogev -d yogev_db -c 'SELECT title, type, priority FROM messages;'

# List recent OTPs
docker exec yogev-postgres psql -U yogev -d yogev_db -c 'SELECT email, code, "expiresAt" FROM otps ORDER BY "createdAt" DESC LIMIT 5;'
```

---

## Gmail API Configuration

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "Yogev System"
3. Enable **Gmail API** (APIs & Services > Library)

### Step 2: Create OAuth Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Configure consent screen if prompted:
   - User Type: External
   - Add test users (your email)
4. Create OAuth client ID:
   - Type: Web application
   - Redirect URI: `http://localhost:3333/callback`
5. Download JSON or copy Client ID & Secret

### Step 3: Get Refresh Token

```bash
cd backend
node get-gmail-token.js
```

1. Open the URL shown in terminal
2. Sign in with your Gmail account
3. Grant permissions
4. Copy the refresh token from terminal

### Step 4: Update .env

```env
GMAIL_CLIENT_ID="your-client-id"
GMAIL_CLIENT_SECRET="your-client-secret"
GMAIL_REFRESH_TOKEN="your-refresh-token"
GMAIL_SENDER_EMAIL="your-email@gmail.com"
```

### Step 5: Fix Email Service

Ensure `backend/src/email/email.service.ts` has:

```typescript
this.oauth2Client.setCredentials({ refresh_token: refreshToken });
```

---

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://yogev:yogev_password@localhost:5433/yogev_db?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRATION="12h"

# Gmail API
GMAIL_CLIENT_ID="your-client-id"
GMAIL_CLIENT_SECRET="your-client-secret"
GMAIL_REFRESH_TOKEN="your-refresh-token"
GMAIL_SENDER_EMAIL="your-email@gmail.com"

# App
APP_PORT=3001
APP_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3004"

# Upload
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=5242880
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (sends OTP) |
| POST | `/api/auth/verify-otp` | Verify OTP code |
| POST | `/api/auth/resend-otp` | Resend OTP |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Get current user |
| GET | `/api/users/contacts` | Get all contacts |
| PATCH | `/api/users/me` | Update profile |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages` | Get all messages |
| GET | `/api/messages/food` | Get food messages |

### Admin (requires ADMIN/COMMANDER role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Dashboard stats |
| POST | `/api/admin/messages` | Create message |
| POST | `/api/admin/shifts` | Create shift post |
| PATCH | `/api/admin/forms/:id` | Approve/reject form |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

---

## Common Commands

```bash
# Backend
cd backend
npm run start:dev          # Start with hot reload
npm run build              # Build for production
npm run start:prod         # Run production build
npx prisma studio          # Open database GUI
npx prisma migrate dev     # Create new migration
npx prisma db seed         # Seed database

# Frontend
cd frontend
npm run dev                # Start development
npm run build              # Build for production
npm run start              # Run production build
npm run lint               # Run ESLint

# Docker
docker-compose -f docker-compose.dev.yml up -d    # Start PostgreSQL
docker-compose -f docker-compose.dev.yml down     # Stop PostgreSQL
docker-compose -f docker-compose.dev.yml logs -f  # View Docker logs

# Database
docker exec -it yogev-postgres psql -U yogev -d yogev_db  # Connect to DB
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3001
lsof -i :3004

# Kill process
kill -9 <PID>

# Or use different port
npm run dev -- -p 3005
```

### CORS Errors

Check that `FRONTEND_URL` in backend `.env` matches your frontend URL.

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker ps

# Restart PostgreSQL
docker-compose -f docker-compose.dev.yml restart

# Check connection
docker exec yogev-postgres pg_isready -U yogev -d yogev_db
```

### OTP Not Working

1. Check backend logs for OTP code
2. Verify Gmail API is configured
3. Check `otps` table in database:
   ```bash
   docker exec yogev-postgres psql -U yogev -d yogev_db -c 'SELECT * FROM otps;'
   ```

### Images Not Loading

Ensure uploads directory exists:
```bash
mkdir -p backend/uploads/shifts backend/uploads/social
```

---

## Production Deployment

1. Set secure `JWT_SECRET`
2. Configure production `DATABASE_URL`
3. Set `NODE_ENV=production`
4. Build both apps:
   ```bash
   cd backend && npm run build
   cd frontend && npm run build
   ```
5. Use PM2 or Docker for process management
6. Configure Nginx reverse proxy

---

## License

UNLICENSED - Internal use only.

---

**פלוגת יוגב - ביחד מנצחים**
