# OwnEnglish Server

FastAPI backend for OwnEnglish platform.

## Quick Start

### 1. Create virtual environment

```bash
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Run development server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000
API documentation: http://localhost:8000/docs

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user

### Classes
- `GET /api/v1/classes` - List classes
- `POST /api/v1/classes` - Create class (teachers)
- `GET /api/v1/classes/{id}` - Get class details
- `POST /api/v1/classes/join` - Join class with code (students)

### Study Packs
- `GET /api/v1/study-packs` - List study packs
- `GET /api/v1/study-packs/{id}` - Get study pack details
- `POST /api/v1/study-packs` - Create study pack (teachers)
- `POST /api/v1/study-packs/submissions` - Submit answers (students)

## Tech Stack

- **FastAPI** - Modern Python web framework
- **SQLAlchemy 2.0** - Async ORM
- **SQLite** - Default database (easy for local dev)
- **Pydantic v2** - Data validation
- **JWT** - Authentication

## Database

By default, uses SQLite for local development. To use PostgreSQL:

1. Update `.env`:
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/ownenglish
```

2. Install PostgreSQL adapter:
```bash
pip install asyncpg
```

## Testing

```bash
pytest
```

## Membership and WeChat Pay

Teacher membership and H5 WeChat Pay are enabled through environment variables.

1. Copy `.env.example` to `.env`
2. Fill in membership pricing and WeChat Pay values
3. Restart the backend after updating `.env`

Required WeChat Pay variables:

```env
WECHAT_PAY_APP_ID=
WECHAT_PAY_MCH_ID=
WECHAT_PAY_MCH_SERIAL_NO=
WECHAT_PAY_API_V3_KEY=
WECHAT_PAY_NOTIFY_URL=
WECHAT_PAY_RETURN_URL=
WECHAT_PAY_H5_DOMAIN=
```

Certificate setup supports two modes:

```env
# Option A: file paths
WECHAT_PAY_PRIVATE_KEY_PATH=
WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH=

# Option B: raw key content
WECHAT_PAY_PRIVATE_KEY=
WECHAT_PAY_PLATFORM_PUBLIC_KEY=
```

Notes:
- Current payment flow is H5 WeChat Pay for teacher membership only.
- `WECHAT_PAY_NOTIFY_URL` must be public and reachable by WeChat servers.
- `WECHAT_PAY_H5_DOMAIN` must match the domain configured in WeChat Pay.
- Membership prices are configured in cents:

```env
MEMBERSHIP_MONTHLY_PRICE_CENTS=3900
MEMBERSHIP_YEARLY_PRICE_CENTS=39900
```
