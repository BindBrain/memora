# Memora

Memora is a personal knowledge library for saving links and resources, organizing them into categories, adding notes, and exploring your collection with AI-assisted search.

This guide explains how to install and run Memora on Windows. It is written for beginners and walks you through the setup step by step.

## What You Can Do with Memora

- Save links, descriptions, and personal notes.
- Organize resources into categories.
- Bookmark, search, filter, and browse your library.
- Search your saved resources alongside web results.
- Generate AI-assisted descriptions and search overviews.
- Configure supported AI providers through application settings.
- Explore a subtle animated Three.js knowledge-tree background.

## Before You Start

You will need:

- **Windows 10 or Windows 11**
- **Git**, to download the project.
- **Node.js and npm**, to install and run the application.
- **PostgreSQL**, to store your saved resources.
- An internet connection for installation and online features.
- An AI provider API key if you want to use AI-assisted features.

Memora uses PostgreSQL to store its data. Installing the application alone is not enough; you must also configure its database connection.

## Recommended Installation: Docker on Windows

Docker is the recommended way to run Memora locally. It runs the application
and its PostgreSQL database in separate containers, without requiring you to
install Node.js or PostgreSQL directly on Windows.

### Step 1 — Install Docker Desktop

1. Install Docker Desktop for Windows from [docker.com](https://www.docker.com/products/docker-desktop/).
2. Start Docker Desktop and wait until its engine is running.
3. Make sure Docker is using Linux containers.

### Step 2 — Download Memora

Open PowerShell and run:

```powershell
git clone https://github.com/BindBrain/memora.git
cd memora
```

If you already have a project clone, open PowerShell in that folder instead.

### Step 3 — Create your private Docker configuration

Run the following block from the project folder. It creates a random database
password and a random 32-byte encryption key. It will not overwrite an existing
`.env.docker` file.

```powershell
if (Test-Path .\.env.docker) {
    Write-Host ".env.docker already exists. Keeping it unchanged."
} else {
    $dbPassword = [guid]::NewGuid().ToString("N")
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $bytes = New-Object byte[] 32
        $rng.GetBytes($bytes)
        $encryptionKey = [Convert]::ToBase64String($bytes)
    } finally {
        $rng.Dispose()
    }

    @(
        "POSTGRES_PASSWORD=$dbPassword"
        "APP_ENCRYPTION_KEY=$encryptionKey"
        'GROQ_API_KEY=""'
    ) | Set-Content -Path ".\.env.docker" -Encoding ascii

    Write-Host "Created .env.docker. Keep this file private."
}
```

Never publish `.env.docker`. It contains credentials and the encryption key
used by your local installation. Keep a secure backup of the key if you need
to preserve access to data encrypted by the application.

### Step 4 — Build and start Memora

Run these commands from the project folder:

```powershell
docker compose --env-file .env.docker config --quiet
docker compose --env-file .env.docker build app
docker compose --env-file .env.docker up -d
```

The first command validates the Compose configuration. The build command may
take several minutes the first time.

### Step 5 — Verify the application

Check the application and database health:

```powershell
Invoke-RestMethod "http://localhost:3301/api/health"
```

A healthy response should report `status` as `ok` and `database` as
`connected`.

Then open:

**http://localhost:3301**

### Everyday use with Docker

- Check the containers: `docker compose --env-file .env.docker ps`
- View logs: `docker compose --env-file .env.docker logs --tail 50`
- Stop the containers: `docker compose --env-file .env.docker stop`
- Start them again: `docker compose --env-file .env.docker up -d`

The database is stored in a Docker-managed persistent volume. Stopping or
recreating the containers normally preserves that volume. Do not remove the
volume if you want to keep your data.

### Start Memora automatically after signing in to Windows

In Docker Desktop, open **Settings → General** and enable **Start Docker
Desktop when you sign in to your computer**.

The Memora containers use the `unless-stopped` restart policy. When Docker
Desktop starts, Docker can restart the containers automatically, as long as
they were not explicitly stopped. Wait for Docker Desktop and the containers
to become ready, then open **http://localhost:3301**.

This starts the application after your Windows user signs in; it does not
mean Memora is available before sign-in.

### Troubleshooting Docker

- If Docker commands fail, make sure Docker Desktop is running.
- If port `3301` is already in use, resolve the conflict before starting Memora.
- If the health check fails, inspect the logs with
  `docker compose --env-file .env.docker logs --tail 50`.
- If the application cannot connect to the database, check that the database
  container is healthy and that your configuration is valid.
- Do not share `.env.docker` or paste its contents into bug reports.

## Alternative: Manual Installation on Windows


### Step 1 — Install the Required Software

If you do not already have these programs, install them first:

1. **Node.js:** Download a compatible LTS release from [nodejs.org](https://nodejs.org/). npm is included with Node.js.
2. **Git:** Download it from [git-scm.com](https://git-scm.com/).
3. **PostgreSQL:** Download it from [postgresql.org](https://www.postgresql.org/download/windows/).

During PostgreSQL installation, remember the password you choose for the PostgreSQL administrator account. You will need it when configuring Memora.

After installation, open PowerShell and check that Node.js, npm, and Git are available:

```powershell
node --version
npm --version
git --version
```

Each command should display a version number.

Make sure PostgreSQL is installed and running before continuing.

### Step 2 — Download Memora

Open PowerShell and run:

```powershell
git clone https://github.com/BindBrain/memora.git
cd memora
```

These commands download the project from GitHub and move into its folder.

If you have already downloaded or cloned the project, open PowerShell in that project's folder instead. Do not clone another copy into the same folder.

### Step 3 — Install the Application Dependencies

Run:

```powershell
npm install
```

This downloads the packages Memora needs to run.

Wait for the command to finish before continuing. If an error occurs, keep the error message so you can troubleshoot it.

### Step 4 — Create Your Environment Configuration

Memora uses a `.env` file to store local configuration, including the database connection, application port, and encryption key.

Create the file by copying the example:

```powershell
Copy-Item .env.example .env
```

**If a `.env` file already exists, do not overwrite it.** Keep your existing configuration and edit it only where necessary.

Open `.env` in Cursor or another text editor.

#### Configure the database connection

Find the `DATABASE_URL` setting. The example file contains:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/memora?schema=public"
```

For a standard Windows installation with PostgreSQL running directly on your computer:

1. Replace `USER` with your PostgreSQL username.
2. Replace `PASSWORD` with that user's password.
3. Replace `memora` with your database name if you chose a different name.
4. Keep `localhost:5432` if PostgreSQL is running on your computer on port `5432`.
5. Keep `?schema=public`.

For example, if your PostgreSQL username is `postgres` and your database is named `memora`, the setting will look like this:

```dotenv
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/memora?schema=public"
```

Replace `YOUR_PASSWORD` with your actual password. This is only an example; never publish your real database connection string.

If your password contains special characters, they may need URL encoding in the connection string.

**Important:** `POSTGRES_PASSWORD` in `.env.example` is intended for the Docker-based PostgreSQL configuration. For a normal installation using PostgreSQL directly on Windows, configure the credentials in `DATABASE_URL`.

#### Configure the encryption key

Memora uses `APP_ENCRYPTION_KEY` to protect encrypted provider credentials.

Generate a new key by running this command in PowerShell:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Copy the generated value into `.env`:

```dotenv
APP_ENCRYPTION_KEY="PASTE_YOUR_GENERATED_KEY_HERE"
```

Replace the placeholder with the actual generated key.

Keep this key private and back it up securely. Generate it once for this installation and keep it consistent. Changing it later may prevent Memora from decrypting previously stored provider credentials.

Do not generate a new key every time you start Memora.

#### Choose the application port

Memora uses port `3000` by default.

To use port `3301`, change the `PORT` setting in `.env` to:

```dotenv
PORT=3301
```

Choose an available port. If the selected port is already being used by another application, choose a different port.

Save `.env` before continuing.

### Step 5 — Create a PostgreSQL Database

Memora needs a database in which to store your resources and other application data.

If you installed pgAdmin with PostgreSQL:

1. Open pgAdmin and connect to your PostgreSQL server.
2. Expand the server in the left-hand browser.
3. Right-click **Databases**.
4. Select **Create → Database**.
5. Enter a database name, such as `memora`.
6. Select an appropriate owner, such as your PostgreSQL user.
7. Save the database.

The database name, username, password, host, and port must match the values in `DATABASE_URL`.

Use a dedicated database for Memora. If you already have a Memora database containing information you want to keep, do not create a replacement or run destructive database commands.

### Step 6 — Set Up the Database Tables

Return to PowerShell and make sure you are in the Memora project folder.

Run:

```powershell
npx prisma migrate deploy
```

This applies the database migrations included with the project.

Then run:

```powershell
npx prisma generate
```

This generates the Prisma Client used by the application.

Both commands should finish successfully before you continue. If either command fails, check the database connection and the error message rather than proceeding blindly.

### Step 7 — Build Memora

Run:

```powershell
npm run build
```

This prepares the production version of the application.

Wait for the build to finish successfully before starting Memora.

You normally need to rebuild after installing a new version of the source code or making relevant code changes.

### Step 8 — Start Memora

Start the production server:

```powershell
npm run start
```

If your `.env` contains:

```dotenv
PORT=3301
```

open this address in your browser:

**http://localhost:3301**

If you kept the default port, open:

**http://localhost:3000**

Leave the PowerShell window open while using Memora. Closing the terminal or pressing `Ctrl+C` stops the server.

#### Start Memora on a different port temporarily

You can override the configured port for one start without changing `.env`.

For example:

```powershell
npm run start -- --port 3010
```

Then open:

http://localhost:3010

This override applies to that server process. It does not change the `PORT` value saved in `.env`.

## Everyday Use

After the first-time installation is complete:

1. Open the Memora project folder in PowerShell.
2. Start the application with `npm run start`.
3. Open the configured local address in your browser.
4. When finished, return to PowerShell and press `Ctrl+C` to stop the server.

You do not need to repeat `npm install`, create the database, or apply migrations every time you use Memora.

### Does the manual installation start automatically?

No. With the manual installation method, start Memora by running
`npm run start` from the project folder. The Docker installation above
supports automatic container restarts when Docker Desktop starts.
## Local Development

Development mode is intended for people who want to modify Memora's source code.

Start development mode with:

```powershell
npm run dev
```

Open the local address printed in the terminal, usually:

http://localhost:3000

If the terminal reports a different port, use the address it provides.

To stop development mode, return to the terminal and press `Ctrl+C`.

For everyday use, follow the production build and startup instructions above instead.

## AI Configuration

Memora supports AI provider integrations, including Groq and Gemini.

To use AI-assisted features:

1. Open Memora in your browser.
2. Find the application's Settings interface.
3. Configure the supported provider credentials you want to use.

AI-assisted features may require a valid provider API key and an internet connection. Basic library features may be available without configuring an AI provider.

Keep API keys private. Never paste real credentials into public issues, pull requests, screenshots, or committed files.

## Troubleshooting

### `node` or `npm` is not recognized

Install Node.js, close PowerShell, open a new terminal, and retry the version checks.

### Git is not recognized

Install Git, close PowerShell, open a new terminal, and run `git --version` again.

### The database connection fails

Check that PostgreSQL is running and that `DATABASE_URL` contains the correct host, port, database name, username, and password.

Confirm that the database exists and that the configured database user has the necessary permissions.

### Prisma migrations fail

Check the database connection first. Make sure you are in the project folder and that the project's migration files are present.

Do not delete or reset a database containing information you want to keep.

### The browser cannot connect

Confirm that the terminal shows the server has started successfully.

Check the `PORT` value in `.env` and open the matching address:

- `PORT=3000` → http://localhost:3000
- `PORT=3301` → http://localhost:3301

If you started the server with `--port`, use the port specified in that command.

### The selected port is already in use

Choose another available port in `.env`, save the file, and restart Memora.

Alternatively, use a temporary port override:

```powershell
npm run start -- --port 3010
```

Open the corresponding local address in your browser.

### AI features do not work

Check your provider configuration, API key, internet connection, and encryption key. Provider credentials may also be subject to usage limits or provider-side errors.

## Security and Data Protection

- Never commit `.env`, database passwords, real API keys, or private exports.
- Keep `.env.example` limited to placeholders and safe defaults.
- Keep `APP_ENCRYPTION_KEY` private and back it up securely.
- Back up your PostgreSQL database regularly.
- Use a separate database for testing.
- Do not run database reset or deletion commands on a database containing valuable data.
- If a credential is accidentally exposed, revoke or rotate it.

## Contributing

Contributions and bug reports are welcome. Please avoid including private data, database credentials, or API keys in issues and pull requests. For security vulnerabilities, follow the private reporting guidance in [SECURITY.md](SECURITY.md).

Before publishing code changes, contributors should run:

```powershell
npx tsc --noEmit
npm run build
```

After changing the Prisma schema, create and test an appropriate migration before deploying the updated application.

## Technology Stack

- Next.js and React
- TypeScript and Tailwind CSS
- PostgreSQL and Prisma
- Three.js
- Groq and Gemini provider integrations
