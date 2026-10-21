# Memora

Memora is a personal knowledge library for saving links and resources, organizing them into categories, adding notes, and exploring a collection with AI-assisted search.

## Features

- Organize saved resources into categories.
- Save links with descriptions and personal notes.
- Bookmark, search, filter, and browse saved resources.
- Search your library alongside web results.
- Generate AI-assisted descriptions and search overviews.
- Configure supported AI providers through application settings.
- Enjoy a subtle animated Three.js knowledge-tree background.

## Tech stack

- Next.js and React
- TypeScript and Tailwind CSS
- PostgreSQL and Prisma
- Three.js
- Groq and Gemini provider integrations

## Requirements

- Node.js compatible with the installed Next.js release
- npm
- PostgreSQL
- AI provider credentials for AI-assisted features

## Installation on Windows

### 1. Download the project

Open PowerShell and run:

```powershell
git clone https://github.com/BindBrain/memora.git
cd memora
```

If you already downloaded the project, open PowerShell in its project folder instead.

### 2. Install dependencies

```powershell
npm install
```

### 3. Configure the environment

Create a local `.env` file by copying the example:

```powershell
Copy-Item .env.example .env
```

Open `.env` in a text editor and configure `DATABASE_URL` to point to your PostgreSQL database.

Generate a unique encryption key for this installation by running the following command in PowerShell:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Copy the generated value into `APP_ENCRYPTION_KEY` in `.env`, replacing `REPLACE_WITH_YOUR_OWN_KEY`. Keep this key safe and consistent for this installation; changing it may prevent access to previously encrypted provider credentials. Never commit `.env` or share real credentials.

Do not overwrite an existing `.env` file containing settings you want to keep.

### 4. Create the PostgreSQL database

Make sure PostgreSQL is installed and running. Create a database and database user, then configure `DATABASE_URL` in `.env` to use that database.

The database must exist before proceeding. Use a dedicated database for Memora and ensure the configured user has permission to create and modify tables in it.

### 5. Apply migrations and generate Prisma Client

```powershell
npx prisma migrate deploy
npx prisma generate
```

### 6. Build the production version

```powershell
npm run build
```

### 7. Start Memora

Memora uses port 3000 by default. You can change the port in your `.env` file:

```dotenv
PORT=3000
```

If port 3000 is already in use, change it to an available port, for example `PORT=3001`.

Build and start Memora:

```powershell
npm run build
npm run start
```

Open `http://localhost:3000`, or replace `3000` with the port you configured.

You can also override the port for a single start without changing `.env`:

```powershell
npm run start -- --port 3010
```

Keep the terminal running while using the application. Press `Ctrl+C` to stop the server.

Keep the terminal running while using the application. Press `Ctrl+C` to stop the server.

## Local development

For development with automatic recompilation, use:

```powershell
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Development mode is intended for making code changes. For normal use, build the app and run the production server instead.

## AI configuration

Configure supported AI provider credentials in Memora's Settings interface. Keep API keys private. Never paste real credentials into issues, pull requests, screenshots, or committed files.

AI features require a working provider credential and a valid encryption key wherever provider secrets are encrypted at rest.

## Production checks

Before publishing changes, run:

```powershell
npx tsc --noEmit
npm run build
```

After changing the Prisma schema, create and test an appropriate migration before deploying the updated application.

## Security

- Never commit `.env`, real API keys, database passwords, or private exports.
- `.env.example` must contain placeholders only.
- Keep local backups and generated build files out of version control.
- Use a separate database for testing.
- Rotate any credential that is accidentally exposed.

## Contributing

Contributions and bug reports are welcome. Please avoid including private data or credentials in issues and pull requests.
