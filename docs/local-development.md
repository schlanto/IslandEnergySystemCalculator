# Running the project locally

This guide explains two ways to run the website:

1. with Docker, without installing Node.js directly on your computer;
2. with a local Node.js installation.

The examples are written for Windows PowerShell. Run all host commands from the project directory.

## What you need

For the Docker method:

- Docker Desktop installed and running;
- a terminal such as Windows PowerShell;
- a local copy of this repository.

For the native Node.js method:

- Node.js 22 or later;
- npm, which is included with Node.js;
- a terminal such as Windows PowerShell.

No database, backend, account, API key, or internet connection is required after the dependencies and Docker image have been downloaded.

## Option A: Docker

### 1. Open PowerShell in the project directory

Either open the project folder in Explorer, right-click inside it, and select **Open in Terminal**, or enter the complete path:

```powershell
cd "C:\Users\Anton\Nextcloud\Documents\Documents\Arbeit\Projekte\PODEST\IslandEnergySystemCalculator"
```

Confirm that this is the correct directory:

```powershell
Get-Item package.json, package-lock.json
```

Both files must be listed. If they are not, change to the correct directory before continuing.

### 2. Start an interactive Node.js container

Run this command in PowerShell:

```powershell
docker run --rm -it `
  --name community-energy-calculator `
  -p 5173:5173 `
  --mount "type=bind,source=$($PWD.Path),target=/app" `
  --mount "type=volume,target=/app/node_modules" `
  -w /app `
  node:22-slim sh
```

Important: the PowerShell backtick `` ` `` must be the final character on each continued line. Do not add spaces after it.

The command does the following:

- `--rm` removes the temporary container after it stops;
- `-it` opens an interactive shell;
- `--name` gives the temporary container a readable name;
- `-p 5173:5173` makes the development server available on the host;
- the first `--mount` makes the project directory available as `/app`;
- the second `--mount` keeps Linux `node_modules` separate from Windows dependencies;
- `-w /app` starts the container in the directory containing `package.json`;
- `node:22-slim` supplies Node.js 22 and npm;
- `sh` opens a shell inside the container.

After the command starts, the prompt belongs to the Linux container. It may look like `#` or `$`. Do not type the prompt characters themselves.

### 3. Install dependencies inside the container

Enter this inside the container:

```sh
npm ci
```

`npm ci` installs exactly the dependency versions recorded in `package-lock.json`.

### 4. Start the website inside the container

Still inside the container, run:

```sh
npm run dev -- --host 0.0.0.0
```

The `--host 0.0.0.0` option is important in Docker. Without it, the development server may only be reachable inside the container.

Open this address in a browser:

```text
http://localhost:5173/
```

Changes to files in the project directory are detected automatically by Vite and should appear after saving.

### 5. Stop the server and container

Press:

```text
Ctrl+C
```

If that only stops Vite and leaves the container shell open, enter:

```sh
exit
```

Because the container was started with `--rm`, Docker removes it automatically. The project files remain on the host.

### Docker one-command alternative

The following command installs dependencies and starts the server without first opening an interactive container shell:

```powershell
docker run --rm -it `
  --name community-energy-calculator `
  -p 5173:5173 `
  --mount "type=bind,source=$($PWD.Path),target=/app" `
  --mount "type=volume,target=/app/node_modules" `
  -w /app `
  node:22-slim `
  sh -c "npm ci && npm run dev -- --host 0.0.0.0"
```

Open `http://localhost:5173/` and press `Ctrl+C` when finished.

## Option B: Local Node.js

Open PowerShell in the project directory:

```powershell
cd "C:\Users\Anton\Nextcloud\Documents\Documents\Arbeit\Projekte\PODEST\IslandEnergySystemCalculator"
```

Check the installed versions:

```powershell
node --version
npm.cmd --version
```

Install dependencies:

```powershell
npm.cmd ci
```

Start the development server:

```powershell
npm.cmd run dev
```

Open:

```text
http://localhost:5173/
```

Use `npm.cmd` instead of `npm` if PowerShell reports that `npm.ps1` cannot be executed because script execution is disabled.

Stop the server with `Ctrl+C`.

## Run the automated checks

Inside the container or in a local Node.js terminal, run:

```sh
npm run validate:data
npm test
npm run lint
npm run build
```

On Windows PowerShell, use `npm.cmd` if required:

```powershell
npm.cmd run validate:data
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

The production files are written to `dist/`.

## Common Docker problems

### `Could not read package.json` or `/package.json` does not exist

The project was not mounted at `/app`, or the container did not start with `/app` as its working directory.

Check that the Docker command contains both:

```text
target=/app
-w /app
```

Also ensure that PowerShell is currently in the real project directory.

### `npm ci` says that `package-lock.json` is missing

Usually the wrong host directory was mounted. Before starting Docker, check:

```powershell
Get-Item package.json, package-lock.json
```

Inside the container, check:

```sh
pwd
ls -la
```

`pwd` should print `/app`, and both JSON files should be visible.

### The terminal shows `>>`

`>>` is PowerShell's continuation prompt. It means PowerShell is waiting for the rest of a multi-line command. Normally this is expected after a line ending in a backtick.

If PowerShell remains stuck at `>>`, press `Ctrl+C` and enter the command again. Ensure that quotes are paired and that every continued line except the final line ends with a backtick.

### The server starts but the browser cannot connect

Check that:

- Docker uses `-p 5173:5173`;
- Vite uses `--host 0.0.0.0`;
- Docker Desktop is running;
- no firewall rule blocks the port.

If port 5173 is already occupied, expose a different host port:

```powershell
-p 5174:5173
```

Then open `http://localhost:5174/`.

### Windows and Linux dependencies conflict

Do not share the host `node_modules` directory with the Linux container. Keep this mount in the Docker command:

```text
--mount "type=volume,target=/app/node_modules"
```

This prevents native packages installed for Windows from being used inside Linux.
