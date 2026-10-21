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

- Node.js compatible with the version required by the installed Next.js release
- npm
- PostgreSQL
- API credentials for AI features, configured through Memora settings or the appropriate environment configuration

## Local development

1. Clone the repository:

   ```bash
   git clone https://github.com/BindBrain/memora.git
   cd memora
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create your local environment file by copying `.env.example` to `.env`. Update the database connection and generate your own encryption key. Never commit `.env`.

4. Create a PostgreSQL database and user matching your `DATABASE_URL`.

5. Apply the Prisma migrations:

   ```bash
   npx prisma migrate deploy
   ```

6. Generate the Prisma client:

   ```bash
   npx prisma generate
   ```

7. Start the development server:

   ```bash
   npm run dev
   ```

8. Open [http://localhost:3000](http://localhost:3000).

If the project has no committed migrations yet, initialize a development migration with `npx prisma migrate dev --name init` after configuring your local database.

## AI configuration

Configure supported AI provider credentials in Memora's Settings interface. Keep API keys private. Never paste real credentials into issues, pull requests, screenshots, or committed files.

AI features require a working provider credential and a valid encryption key wherever provider secrets are encrypted at rest.

## Production build

Run the following checks before deploying:

```bash
npx tsc --noEmit
npm run build
```

Set environment variables securely in your deployment platform. Do not deploy your development `.env` file.

## Security

- Never commit `.env`, real API keys, database passwords, or private exports.
- `.env.example` contains placeholders only.
- Keep local backups and generated build files out of version control.
- Rotate any credential that is accidentally exposed.

## Contributing

Contributions and bug reports are welcome. Please avoid including private data or credentials in issues and pull requests.
