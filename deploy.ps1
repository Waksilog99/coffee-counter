# Add Node.js to PATH to avoid "node not recognized" errors
$env:Path += ";C:\Program Files\nodejs"

# Build Frontend
Write-Host "Building Frontend..."
& "C:\Program Files\nodejs\npm.cmd" run build

# Prepare Functions
Write-Host "Preparing Functions..."
if (Test-Path "functions/server") {
    Remove-Item -Recurse -Force "functions/server"
}
New-Item -ItemType Directory -Force "functions/server" | Out-Null

# Copy Server Code (excluding node_modules and sqlite db)
# We need to copy: app.js, db/, and any other dependencies
Copy-Item "server/app.js" "functions/server/"
Copy-Item -Recurse "server/db" "functions/server/"

# Copy package.json to functions (merging dependencies is complex, 
# for now we assume functions/package.json has what we need)

# Install Functions Dependencies
Write-Host "Installing Functions Dependencies..."
cd functions
& "C:\Program Files\nodejs\npm.cmd" install
cd ..

# Deploy
Write-Host "Deploying to Firebase..."
& "C:\Program Files\nodejs\npx.cmd" firebase deploy
