param(
    [string]$FrontendDomain = "app.votre-domaine.tld",
    [string]$ApiDomain = "api.votre-domaine.tld",
    [string]$OutputDir = "deploy-build"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendDist = Join-Path $repoRoot "dist"
$frontendTempDist = Join-Path $repoRoot "dist-o2switch"
$backendRoot = Join-Path $repoRoot "backend-laravel13-git"
$outputRoot = Join-Path $repoRoot $OutputDir
$frontendOutput = Join-Path $outputRoot "frontend"
$backendOutput = Join-Path $outputRoot "backend-laravel13-git"

function Reset-Directory {
    param([string]$Path)

    if (Test-Path $Path) {
        Remove-Item -LiteralPath $Path -Recurse -Force
    }

    New-Item -ItemType Directory -Path $Path | Out-Null
}

Write-Host "Preparation du build frontend..."
Push-Location $repoRoot
$env:VITE_FERM_API_URL = "https://$ApiDomain/api/v1"
if (Test-Path $frontendTempDist) {
    Remove-Item -LiteralPath $frontendTempDist -Recurse -Force
}
& npx.cmd vite build --outDir dist-o2switch --emptyOutDir
if ($LASTEXITCODE -ne 0) {
    throw "Le build frontend a echoue avec le code $LASTEXITCODE."
}
Pop-Location

Write-Host "Creation du dossier de livraison..."
Reset-Directory -Path $outputRoot
New-Item -ItemType Directory -Path $frontendOutput | Out-Null

Copy-Item -Path (Join-Path $frontendTempDist "*") -Destination $frontendOutput -Recurse -Force

Write-Host "Copie du backend Laravel sans secrets ni dependances locales..."
$backendExclude = @(
    ".git.backend",
    ".env",
    "vendor",
    "node_modules",
    "database.sqlite",
    ".phpunit.result.cache",
    "storage\logs",
    "storage\framework\cache\data",
    "storage\framework\sessions",
    "storage\framework\testing",
    "storage\framework\views",
    "bootstrap\cache\*.php"
)

robocopy $backendRoot $backendOutput /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP `
    /XD (Join-Path $backendRoot ".git.backend") `
        (Join-Path $backendRoot "vendor") `
        (Join-Path $backendRoot "node_modules") `
        (Join-Path $backendRoot "storage\logs") `
        (Join-Path $backendRoot "storage\framework\cache\data") `
        (Join-Path $backendRoot "storage\framework\sessions") `
        (Join-Path $backendRoot "storage\framework\testing") `
        (Join-Path $backendRoot "storage\framework\views") `
    /XF (Join-Path $backendRoot ".env") `
        (Join-Path $backendRoot ".phpunit.result.cache") `
        (Join-Path $backendRoot "database\database.sqlite") `
        (Join-Path $backendRoot "bootstrap\cache\packages.php") `
        (Join-Path $backendRoot "bootstrap\cache\services.php")

if ($LASTEXITCODE -gt 7) {
    throw "La copie du backend a echoue avec le code robocopy $LASTEXITCODE."
}

$postCopyCleanup = @(
    (Join-Path $backendOutput ".phpunit.result.cache"),
    (Join-Path $backendOutput "database\database.sqlite")
)

foreach ($path in $postCopyCleanup) {
    if (Test-Path $path) {
        Remove-Item -LiteralPath $path -Force
    }
}

if (Test-Path $frontendTempDist) {
    Remove-Item -LiteralPath $frontendTempDist -Recurse -Force
}

$frontendEnvPath = Join-Path $outputRoot ".env.frontend.production"
$backendEnvPath = Join-Path $outputRoot ".env.backend.production"
$frontendEnv = @(
    "VITE_FERM_API_URL=https://$ApiDomain/api/v1"
)
$backendEnv = @(
    'APP_NAME="FERM+ API"',
    "APP_ENV=production",
    "APP_DEBUG=false",
    "APP_URL=https://$ApiDomain",
    "APP_FRONTEND_URL=https://$FrontendDomain",
    "CORS_ALLOWED_ORIGINS=https://$FrontendDomain",
    "",
    "DB_CONNECTION=pgsql",
    "DB_HOST=127.0.0.1",
    "DB_PORT=5432",
    "DB_DATABASE=ferm_plus",
    "DB_USERNAME=utilisateur_db",
    "DB_PASSWORD=mot_de_passe_db",
    "DB_SSLMODE=prefer",
    "",
    "SESSION_DRIVER=database",
    "SESSION_LIFETIME=120",
    "SESSION_PATH=/",
    "SESSION_DOMAIN=$ApiDomain",
    "SESSION_SECURE_COOKIE=true",
    "SESSION_SAME_SITE=lax",
    "API_TOKEN_COOKIE=fermplus_api_token",
    "API_TOKEN_COOKIE_SAME_SITE=lax",
    "",
    "LOG_LEVEL=warning"
)

Set-Content -Path $frontendEnvPath -Value $frontendEnv
Set-Content -Path $backendEnvPath -Value $backendEnv

$instructionsPath = Join-Path $outputRoot "README-DEPLOIEMENT.txt"
$instructions = @(
    "FERM+ - Kit de deploiement O2switch",
    "",
    "1. Publier le contenu du dossier frontend sur le sous-domaine $FrontendDomain",
    "2. Publier le dossier backend-laravel13-git sur le sous-domaine $ApiDomain",
    "3. Pointer le sous-domaine API vers le dossier public du projet Laravel",
    "4. Copier .env.backend.production vers backend-laravel13-git/.env et adapter la base de donnees",
    "5. Cote serveur, executer :",
    "   composer install --no-dev --optimize-autoloader",
    "   php artisan key:generate --force",
    "   php artisan migrate --force",
    "   php artisan optimize",
    "6. Verifier https://$ApiDomain/api/v1/health puis la connexion sur le frontend"
)
Set-Content -Path $instructionsPath -Value $instructions

Write-Host ""
Write-Host "Kit genere dans : $outputRoot"
Write-Host "Frontend pret dans : $frontendOutput"
Write-Host "Backend pret dans : $backendOutput"
