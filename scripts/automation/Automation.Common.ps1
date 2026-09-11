Set-StrictMode -Version 2.0

$script:AutomationRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$script:AutomationArtifactsRoot = Join-Path $script:AutomationRoot "artifacts\automation"
$script:ReadOnlyGitOperations = @{
    Branch = @("branch", "--show-current")
    DiffCheck = @("diff", "--check")
    Divergence = @("rev-list", "--left-right", "--count", "HEAD...@{upstream}")
    Head = @("rev-parse", "HEAD")
    Status = @("status", "--porcelain=v1", "--untracked-files=all")
    Upstream = @("rev-parse", "--abbrev-ref", "@{upstream}")
    WorktreeList = @("worktree", "list", "--porcelain")
}

function Get-AutomationRoot {
    return $script:AutomationRoot
}

function ConvertTo-AutomationSafeText {
    param([AllowNull()][string]$Text)

    if ($null -eq $Text) { return "" }
    $safe = $Text -replace '(?im)^([^\r\n]*(?:password|passwd|secret|token|cookie|authorization|api[-_]?key)[^:=\r\n]*[:=]\s*).+$', '$1[REDACTED]'
    $safe = $safe -replace '(?i)(bearer\s+)[A-Za-z0-9._~+/=-]+', '$1[REDACTED]'
    return $safe
}

function New-AutomationRunContext {
    param(
        [Parameter(Mandatory = $true)][string]$RunId,
        [switch]$CreateIfMissing
    )

    $now = Get-Date
    if ([string]::IsNullOrWhiteSpace($RunId)) {
        throw "RunId is required. Generate it explicitly before starting an automation run."
    }
    if ($RunId -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$') {
        throw "RunId must contain only letters, numbers, dot, underscore, or hyphen (maximum 64 characters)."
    }

    $existing = @()
    if (Test-Path -LiteralPath $script:AutomationArtifactsRoot) {
        $dateDirectories = @(Get-ChildItem -LiteralPath $script:AutomationArtifactsRoot -Directory -ErrorAction Stop | Sort-Object Name)
        foreach ($dateDirectory in $dateDirectories) {
            foreach ($candidate in @(Get-ChildItem -LiteralPath $dateDirectory.FullName -Directory -ErrorAction Stop | Sort-Object Name)) {
                $sameRunId = $candidate.Name.Length -gt 7 -and
                    $candidate.Name.Substring(7).Equals($RunId, [System.StringComparison]::Ordinal)
                if (-not $sameRunId) { continue }
                if ($dateDirectory.Name -notmatch '^\d{4}-\d{2}-\d{2}$' -or $candidate.Name -notmatch '^\d{6}-.+$') {
                    throw "RunId '$RunId' was found in an incompatible automation directory layout."
                }
                $existing += $candidate
            }
        }
    }
    if ($existing.Count -gt 1) {
        throw "RunId '$RunId' is ambiguous because more than one run directory exists."
    }

    if ($existing.Count -eq 1) {
        $runDirectory = $existing[0].FullName
    } elseif ($CreateIfMissing) {
        $dateDirectory = Join-Path $script:AutomationArtifactsRoot $now.ToString("yyyy-MM-dd")
        $runDirectory = Join-Path $dateDirectory ("{0}-{1}" -f $now.ToString("HHmmss"), $RunId)
        [System.IO.Directory]::CreateDirectory($runDirectory) | Out-Null
    } else {
        throw "RunId '$RunId' does not identify an existing automation run. Run inventory first with the same RunId."
    }

    return [ordered]@{
        runId = $RunId
        runDirectory = $runDirectory
        repositoryRoot = $script:AutomationRoot
        createdAt = $now.ToUniversalTime().ToString("o")
    }
}

function Write-AutomationJson {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)]$Value
    )

    if (Test-Path -LiteralPath $Path) {
        throw "Refusing to overwrite existing automation artifact: $Path"
    }
    $json = $Value | ConvertTo-Json -Depth 20
    $encoding = New-Object System.Text.UTF8Encoding($false)
    $stream = New-Object System.IO.FileStream($Path, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    try {
        $writer = New-Object System.IO.StreamWriter($stream, $encoding)
        try { $writer.Write($json + [Environment]::NewLine) } finally { $writer.Dispose() }
    } finally {
        $stream.Dispose()
    }
}

function Write-AutomationText {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Value
    )

    if (Test-Path -LiteralPath $Path) {
        throw "Refusing to overwrite existing automation artifact: $Path"
    }
    $encoding = New-Object System.Text.UTF8Encoding($false)
    $stream = New-Object System.IO.FileStream($Path, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    try {
        $writer = New-Object System.IO.StreamWriter($stream, $encoding)
        try { $writer.Write($Value) } finally { $writer.Dispose() }
    } finally {
        $stream.Dispose()
    }
}

function Invoke-AutomationProcess {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [string[]]$Arguments = @(),
        [hashtable]$Environment = @{},
        [string]$WorkingDirectory = $script:AutomationRoot
    )

    $start = [DateTime]::UtcNow
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $FilePath
    $startInfo.WorkingDirectory = $WorkingDirectory
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    foreach ($argument in $Arguments) {
        $escaped = '"' + ($argument -replace '(\\*)"', '$1$1\"' -replace '(\\+)$', '$1$1') + '"'
        $startInfo.Arguments += $(if ($startInfo.Arguments) { " $escaped" } else { $escaped })
    }
    foreach ($name in $Environment.Keys) {
        $startInfo.EnvironmentVariables[$name] = [string]$Environment[$name]
    }

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    try {
        if (-not $process.Start()) { throw "Unable to start process: $FilePath" }
        $stdout = $process.StandardOutput.ReadToEnd()
        $stderr = $process.StandardError.ReadToEnd()
        $process.WaitForExit()
        $exitCode = $process.ExitCode
    } catch {
        $stdout = ""
        $stderr = $_.Exception.Message
        $exitCode = 127
    } finally {
        $process.Dispose()
    }

    return [ordered]@{
        command = (@($FilePath) + $Arguments) -join " "
        exitCode = $exitCode
        durationMs = [int64]([DateTime]::UtcNow - $start).TotalMilliseconds
        stdout = ConvertTo-AutomationSafeText $stdout
        stderr = ConvertTo-AutomationSafeText $stderr
    }
}

function Invoke-AutomationGit {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("Branch", "DiffCheck", "Divergence", "Head", "Status", "Upstream", "WorktreeList")]
        [string]$Operation
    )

    $arguments = [string[]]$script:ReadOnlyGitOperations[$Operation]
    $gitArguments = @("-c", "gc.auto=0", "--no-optional-locks") + $arguments
    return Invoke-AutomationProcess -FilePath "git.exe" -Arguments $gitArguments -Environment @{
        GIT_OPTIONAL_LOCKS = "0"
        GIT_TERMINAL_PROMPT = "0"
    }
}

function Get-AutomationGitSnapshot {
    $branch = Invoke-AutomationGit -Operation Branch
    $head = Invoke-AutomationGit -Operation Head
    $upstream = Invoke-AutomationGit -Operation Upstream
    $status = Invoke-AutomationGit -Operation Status
    $divergence = $null
    if ($upstream.exitCode -eq 0) {
        $divergence = Invoke-AutomationGit -Operation Divergence
    }
    return [ordered]@{
        branch = $branch.stdout.Trim()
        head = $head.stdout.Trim()
        upstream = $(if ($upstream.exitCode -eq 0) { $upstream.stdout.Trim() } else { $null })
        divergence = $(if ($null -ne $divergence -and $divergence.exitCode -eq 0) { $divergence.stdout.Trim() } else { $null })
        status = @($status.stdout -split "`r?`n" | Where-Object { $_ })
        commands = @($branch, $head, $upstream, $status) + $(if ($null -ne $divergence) { @($divergence) } else { @() })
    }
}

function Get-AutomationPathFromStatusLine {
    param([string]$Line)

    if ($Line.Length -lt 4) { return $null }
    $path = $Line.Substring(3).Trim()
    if ($path.Contains(" -> ")) { $path = $path.Split(@(" -> "), [System.StringSplitOptions]::None)[-1] }
    return $path.Trim('"') -replace '\\', '/'
}

function Get-AutomationWorkingTreeEvidence {
    param([Parameter(Mandatory = $true)]$Snapshot)

    [string[]]$entries = @()
    foreach ($line in $Snapshot.status) {
        $relativePath = Get-AutomationPathFromStatusLine $line
        if ([string]::IsNullOrWhiteSpace($relativePath) -or $relativePath -like "artifacts/automation/*") { continue }
        $normalizedPath = $relativePath.Normalize([System.Text.NormalizationForm]::FormC)
        $entries += ("{0}`t{1}" -f $line.Substring(0, 2), $normalizedPath)
    }
    [Array]::Sort($entries, [System.StringComparer]::Ordinal)
    $payload = $entries -join "`n"
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
        $digest = ([System.BitConverter]::ToString($sha256.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant()
    } finally {
        $sha256.Dispose()
    }
    return [ordered]@{
        sha256 = $digest
        entries = $entries
        contentRead = $false
    }
}

function Compare-AutomationWorkingTreeEvidence {
    param($Before, $After)

    return [ordered]@{
        unchangedOutsideAutomationArtifacts = ($Before.sha256 -ceq $After.sha256)
        before = $Before
        after = $After
    }
}

function Get-AutomationExpectedEffects {
    return @(
        [ordered]@{ path = ".next/**"; producer = "Next.js build"; effect = "generated or updated build output" },
        [ordered]@{ path = "next-env.d.ts"; producer = "Next.js build"; effect = "may be generated or updated" },
        [ordered]@{ path = "tsconfig.tsbuildinfo"; producer = "TypeScript or Next.js"; effect = "may be generated or updated" },
        [ordered]@{ path = "artifacts/homologation/**"; producer = "existing homologation scripts and Playwright"; effect = "reports may be generated or updated" },
        [ordered]@{ path = "playwright-report/**"; producer = "Playwright"; effect = "HTML report may be generated or updated" },
        [ordered]@{ path = "test-results/**"; producer = "Playwright"; effect = "test evidence may be generated or updated" }
    )
}

function Get-AutomationRunFile {
    param($Context, [string]$Name)
    return Join-Path $Context.runDirectory $Name
}