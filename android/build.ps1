# Builds the Android app (TWA) with Bubblewrap.
# Toolchain lives in C:\ggc-android (ASCII path; Android tools dislike non-ASCII).
# The signing key and its password stay in %USERPROFILE%\.claude\secrets.
$ErrorActionPreference = "Stop"
$root = "C:\ggc-android"
$project = "$root\project"
$secrets = "$env:USERPROFILE\.claude\secrets"
$pw = (Get-Content "$secrets\.env" | Where-Object { $_ -like "GOKBANJUNG_KEYSTORE_PASSWORD=*" }) -replace "^GOKBANJUNG_KEYSTORE_PASSWORD=", ""
if (-not $pw) { throw "GOKBANJUNG_KEYSTORE_PASSWORD missing in $secrets\.env" }
New-Item -ItemType Directory -Force $project | Out-Null
$manifest = Get-Content "$PSScriptRoot\twa-manifest.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$manifest.signingKey.path = "$secrets\gokbanjung-release.keystore"
[IO.File]::WriteAllText("$project\twa-manifest.json", ($manifest | ConvertTo-Json -Depth 10), (New-Object Text.UTF8Encoding $false))
$env:JAVA_HOME = "$root\jdk-17.0.20.1+1"
$env:ANDROID_HOME = "$root\sdk"
$env:GRADLE_USER_HOME = "$root\gradle-home"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
$env:BUBBLEWRAP_KEYSTORE_PASSWORD = $pw
$env:BUBBLEWRAP_KEY_PASSWORD = $pw
$bw = "$root\bubblewrap\node_modules\@bubblewrap\cli\bin\bubblewrap.js"
Push-Location $project
# Child processes (node → gradlew.bat) use the process directory, not PowerShell's.
[Environment]::CurrentDirectory = $project
# Bubblewrap runs "gradlew.bat" from the project folder; some shells disable
# running programs from the current folder, which breaks that.
Remove-Item Env:NoDefaultCurrentDirectoryInExePath -ErrorAction SilentlyContinue
try {
  node $bw update --skipVersionUpgrade --manifest="$project\twa-manifest.json"
  if ($LASTEXITCODE) { throw "bubblewrap update failed" }
  node $bw build --skipPwaValidation --manifest="$project\twa-manifest.json"
  if ($LASTEXITCODE) { throw "bubblewrap build failed" }
} finally {
  Pop-Location
  Remove-Item Env:BUBBLEWRAP_KEYSTORE_PASSWORD, Env:BUBBLEWRAP_KEY_PASSWORD -ErrorAction SilentlyContinue
}
Get-ChildItem $project -Filter *.apk | Select-Object Name, Length
