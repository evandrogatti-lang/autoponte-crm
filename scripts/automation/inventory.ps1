[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$RunId,
    [switch]$ImportOnly
)

Set-StrictMode -Version 2.0
. (Join-Path $PSScriptRoot "Automation.Common.ps1")
if ($ImportOnly) { return }

function Get-InventoryClassification {
    param([string]$Path, [string]$StatusCode)

    $normalized = $Path.ToLowerInvariant()
    $possibleSecret = $normalized -match '(^|/)(\.env[^/]*|[^/]*(secret|token|credential|cookie|password|private[-_]?key)[^/]*)$' -or
        $normalized -match '\.(pem|key|p12|pfx|jks|keystore)$'
    $category = if ($possibleSecret) {
        "possibleSecrets"
    } elseif ($normalized -match '(^|/)\.worktrees(/|$)' -or $normalized -match '(^|/)worktrees?(/|$)') {
        "worktrees"
    } elseif ($normalized -match '(^|/)(\.next|dist|out|coverage|test-results|playwright-report)(/|$)' -or $normalized -match '(\.tmp|\.temp|\.bak|\.swp|\.tsbuildinfo)$') {
        "temporary"
    } elseif ($normalized -match '(^|/)artifacts?(/|$)' -or $normalized -match '\.(log|trace|har)$') {
        "artifacts"
    } elseif ($normalized -match '(^|/)(\.vscode|\.idea)(/|$)' -or $normalized -match '(^|/)(local\.|.*\.local\.)') {
        "localConfiguration"
    } elseif ($normalized -match '(^|/)(tests?|__tests__|e2e)(/|$)' -or $normalized -match '(\.test|\.spec)\.[^.]+$') {
        "tests"
    } elseif ($normalized -match '(^|/)(docs?|autoponte)(/|$)' -or $normalized -match '\.(md|mdx|rst|txt)$') {
        "documentation"
    } elseif ($normalized -match '(^|/)(package(-lock)?\.json|tsconfig[^/]*\.json|eslint[^/]*|next\.config\.[^/]+|playwright\.config\.[^/]+|drizzle\.config\.[^/]+|postcss\.config\.[^/]+|\.gitignore)$') {
        "localConfiguration"
    } else {
        "code"
    }

    $candidateGitIgnore = $StatusCode -eq "??" -and $category -in @(
        "possibleSecrets", "worktrees", "temporary", "artifacts", "localConfiguration"
    )
    return [ordered]@{
        category = $category
        possibleSecretByPathOnly = $possibleSecret
        candidateForGitIgnore = $candidateGitIgnore
    }
}

$context = New-AutomationRunContext -RunId $RunId -CreateIfMissing
$before = Get-AutomationGitSnapshot
$beforeEvidence = Get-AutomationWorkingTreeEvidence -Snapshot $before
$items = @()
$groups = [ordered]@{
    code = @(); tests = @(); documentation = @(); artifacts = @(); localConfiguration = @()
    temporary = @(); worktrees = @(); possibleSecrets = @()
}

foreach ($line in $before.status) {
    $path = Get-AutomationPathFromStatusLine $line
    if ([string]::IsNullOrWhiteSpace($path)) { continue }
    $statusCode = $line.Substring(0, 2)
    $classification = Get-InventoryClassification -Path $path -StatusCode $statusCode
    $entry = [ordered]@{
        path = $path
        gitStatus = $statusCode
        category = $classification.category
        possibleSecretByPathOnly = $classification.possibleSecretByPathOnly
        candidateForGitIgnore = $classification.candidateForGitIgnore
    }
    $items += $entry
    $groups[$classification.category] += $path
}

$after = Get-AutomationGitSnapshot
$afterEvidence = Get-AutomationWorkingTreeEvidence -Snapshot $after
$preservation = Compare-AutomationWorkingTreeEvidence -Before $beforeEvidence -After $afterEvidence
$result = [ordered]@{
    schemaVersion = 1
    command = "inventory"
    runId = $context.runId
    timestamp = [DateTime]::UtcNow.ToString("o")
    repositoryRoot = $context.repositoryRoot
    outputDirectory = $context.runDirectory
    status = $(if ($preservation.unchangedOutsideAutomationArtifacts) { "PASS" } else { "FAIL" })
    security = [ordered]@{
        contentInspectionPerformed = $false
        secretDetectionMethod = "path-and-name-only"
        sensitiveValuesPrinted = $false
    }
    git = [ordered]@{
        branch = $before.branch
        head = $before.head
        upstream = $before.upstream
        divergence = $before.divergence
        readOnly = $true
        gcAutoDisabled = $true
    }
    counts = [ordered]@{
        total = $items.Count
        code = $groups.code.Count
        tests = $groups.tests.Count
        documentation = $groups.documentation.Count
        artifacts = $groups.artifacts.Count
        localConfiguration = $groups.localConfiguration.Count
        temporary = $groups.temporary.Count
        worktrees = $groups.worktrees.Count
        possibleSecrets = $groups.possibleSecrets.Count
        gitIgnoreCandidates = @($items | Where-Object { $_.candidateForGitIgnore }).Count
    }
    categories = $groups
    items = $items
    workingTree = [ordered]@{
        before = $before.status
        afterOperationsBeforeReportWrite = $after.status
        preservation = $preservation
        expectedReportWrite = (Get-AutomationRunFile -Context $context -Name "inventory.json")
    }
    commands = @($before.commands + $after.commands)
    warnings = @(
        "Possible secrets are identified only by path and file name; file contents are never read for classification.",
        "The final inventory.json write is the only intended effect and is restricted to artifacts/automation."
    )
}

$outputPath = Get-AutomationRunFile -Context $context -Name "inventory.json"
Write-AutomationJson -Path $outputPath -Value $result
Write-Output ("RunId: {0}" -f $context.runId)
Write-Output ("Inventory: {0}" -f $outputPath)
if ($result.status -ne "PASS") { exit 1 }
