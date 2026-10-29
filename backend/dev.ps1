param([ValidateSet('run', 'test', 'package')][string]$Action = 'run')
$ErrorActionPreference = 'Stop'
$previousJavaHome = $env:JAVA_HOME
$previousPath = $env:PATH
$previousMavenHome = $env:MAVEN_USER_HOME
Push-Location -LiteralPath $PSScriptRoot
try {
    $localJdk = Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot '.tools') -Directory -Filter 'jdk-*' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($localJdk) { $env:JAVA_HOME = $localJdk.FullName }
    if ($env:JAVA_HOME) { $env:PATH = (Join-Path $env:JAVA_HOME 'bin') + ';' + $env:PATH }
    if (-not (Get-Command java -ErrorAction SilentlyContinue)) { throw 'Install Java 21 or set JAVA_HOME before running the remake backend.' }
    $env:MAVEN_USER_HOME = Join-Path $PSScriptRoot '.tools/maven-user'
    [string[]]$mavenArguments = @(switch ($Action) {
        'test' { @('test') }
        'package' { @('package') }
        'run' { @('spring-boot:run', '-Dspring-boot.run.profiles=local') }
    })
    & (Join-Path $PSScriptRoot 'mvnw.cmd') @mavenArguments
    if ($LASTEXITCODE -ne 0) { throw "Backend $Action failed (exit $LASTEXITCODE)." }
} finally {
    Pop-Location
    $env:JAVA_HOME = $previousJavaHome
    $env:PATH = $previousPath
    $env:MAVEN_USER_HOME = $previousMavenHome
}
