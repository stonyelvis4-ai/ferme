param(
    [Parameter(Mandatory=$true)][string]$FrontendDomain,
    [Parameter(Mandatory=$true)][string]$ApiDomain,
    [ValidateSet("mysql", "pgsql")][string]$DatabaseDriver = "mysql",
    [string]$GoogleClientId = "",
    [string]$OutputDir = ("release-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
)

$ErrorActionPreference = "Stop"
foreach ($domain in @($FrontendDomain, $ApiDomain)) {
    if ($domain -notmatch '^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' -or $domain -match 'votre-domaine|example\.') {
        throw "Un domaine reel, sans protocole ni chemin, est obligatoire."
    }
}
if ($GoogleClientId -and $GoogleClientId -notmatch '^[A-Za-z0-9.-]+\.apps\.googleusercontent\.com$') {
    throw "Identifiant client Google invalide."
}
$repoRoot = Split-Path -Parent $PSScriptRoot
if ($OutputDir -notmatch '^[a-zA-Z0-9_-]+$') { throw "Nom de dossier de livraison invalide." }
$outputRoot = Join-Path $repoRoot $OutputDir
if (Test-Path -LiteralPath $outputRoot) { throw "Le dossier existe deja. Choisissez un nouveau nom." }
New-Item -ItemType Directory -Path $outputRoot | Out-Null
$frontendOutput = Join-Path $outputRoot "frontend"
$backendRoot = Join-Path $repoRoot "backend-laravel13-git"
$backendOutput = Join-Path $outputRoot "backend-laravel13-git"
$oldApi = $env:VITE_FERM_API_URL
$oldGoogle = $env:VITE_GOOGLE_CLIENT_ID
Push-Location $repoRoot
try {
    $env:VITE_FERM_API_URL = "https://$ApiDomain/api/v1"
    $env:VITE_GOOGLE_CLIENT_ID = $GoogleClientId
    & npx.cmd vite build --outDir $frontendOutput
    if ($LASTEXITCODE -ne 0) { throw "Echec de compilation." }
} finally {
    $env:VITE_FERM_API_URL = $oldApi
    $env:VITE_GOOGLE_CLIENT_ID = $oldGoogle
    Pop-Location
}

# Positive list: no local database, uploads, vendor, environment, logs or cached configuration.
New-Item -ItemType Directory -Path $backendOutput | Out-Null
foreach ($dir in @("app", "config", "database/migrations", "database/seeders", "resources", "routes")) {
    $destination = Join-Path $backendOutput $dir
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
    & robocopy (Join-Path $backendRoot $dir) $destination /E /XJ /R:1 /W:1 /NFL /NDL /NJH /NJS /NP /XF ".env*" "*.sqlite*" "*.log"
    if ($LASTEXITCODE -gt 7) { throw "Echec copie de $dir." }
}
foreach ($dir in @("bootstrap", "bootstrap/cache", "public", "storage/app/private", "storage/app/public", "storage/logs", "storage/framework/cache/data", "storage/framework/sessions", "storage/framework/views")) {
    New-Item -ItemType Directory -Path (Join-Path $backendOutput $dir) -Force | Out-Null
}
foreach ($file in @("artisan", "composer.json", "composer.lock", "bootstrap/app.php", "bootstrap/providers.php", "public/index.php", "public/.htaccess", "public/robots.txt")) {
    $source = Join-Path $backendRoot $file
    if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination (Join-Path $backendOutput $file) }
}

$port = if ($DatabaseDriver -eq "mysql") { "3306" } else { "5432" }
@(
    'APP_NAME="FERM+ API"', "APP_ENV=production", "APP_DEBUG=false", "APP_KEY=",
    "APP_URL=https://$ApiDomain", "APP_FRONTEND_URL=https://$FrontendDomain",
    "CORS_ALLOWED_ORIGINS=https://$FrontendDomain", "GOOGLE_CLIENT_ID=$GoogleClientId",
    "DB_CONNECTION=$DatabaseDriver", "DB_HOST=127.0.0.1", "DB_PORT=$port",
    "DB_DATABASE=", "DB_USERNAME=", "DB_PASSWORD=",
    "SESSION_DRIVER=database", "SESSION_LIFETIME=120", "SESSION_SECURE_COOKIE=true",
    "SESSION_SAME_SITE=lax", "API_TOKEN_COOKIE=fermplus_api_token",
    "API_TOKEN_COOKIE_SAME_SITE=lax", "LOG_LEVEL=warning"
) | Set-Content -LiteralPath (Join-Path $outputRoot ".env.backend.production")

@(
    "FERM+ : livraison a valider en preproduction avant mise en ligne.",
    "Frontend : $FrontendDomain. Racine API : backend-laravel13-git/public uniquement.",
    "Configurer la base, Google OAuth et les origines exactes. Ne pas publier les fichiers .env.",
    "Sauvegarder la base, les uploads et APP_KEY ; tester la restauration avant migration.",
    "Installation neuve uniquement : php artisan key:generate --force.",
    "Mise a jour : conserver APP_KEY et les fichiers storage existants. Ne jamais regenerer la cle.",
    "composer install --no-dev --optimize-autoloader --no-interaction",
    "php artisan migrate --force",
    "php artisan ferm:verify-production",
    "php artisan optimize",
    "Configurer permissions d'ecriture sur storage et bootstrap/cache sans chmod 777.",
    "Tester HTTPS, connexion/Google/deconnexion, refus .env/.git, cookies, isolation de deux fermes.",
    "Cette generation ne deploie rien et n'atteste pas de la securite du serveur."
) | Set-Content -LiteralPath (Join-Path $outputRoot "README-DEPLOIEMENT.txt")
Write-Host "Livraison preparee dans $outputRoot"
