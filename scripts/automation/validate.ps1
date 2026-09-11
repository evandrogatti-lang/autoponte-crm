[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$RunId,
    [switch]$Preflight,
    [switch]$ImportOnly
)

Set-StrictMode -Version 2.0
. (Join-Path $PSScriptRoot "Automation.Common.ps1")
if ($ImportOnly) { return }

function New-ValidationResult {
    param([string]$Name, $Execution, [string[]]$ExpectedEffects = @())

    return [ordered]@{
        name = $Name
        status = $(if ($Execution.exitCode -eq 0) { "PASS" } else { "FAIL" })
        failureClassification = $(if ($Execution.exitCode -eq 0) { $null } else { "UNBASELINED" })
        command = $Execution.command
        exitCode = $Execution.exitCode
        durationMs = $Execution.durationMs
        stdout = $Execution.stdout
        stderr = $Execution.stderr
        expectedEffects = $ExpectedEffects
    }
}

$context = New-AutomationRunContext -RunId $RunId
$before = Get-AutomationGitSnapshot
$beforeEvidence = Get-AutomationWorkingTreeEvidence -Snapshot $before
$checkoutPreflight = Get-AutomationCheckoutPreflight -Snapshot $before
$outputPath = Get-AutomationRunFile -Context $context -Name "validation.json"

if ($Preflight -or -not $checkoutPreflight.toolExecutionAllowed) {
    $preflightResult = [ordered]@{
        schemaVersion = 1
        command = "validate"
        runId = $context.runId
        timestamp = [DateTime]::UtcNow.ToString("o")
        mode = "preflight"
        status = $checkoutPreflight.status
        checkoutPreflight = $checkoutPreflight
        toolsExecuted = $false
        checks = @()
        baseline = [ordered]@{
            available = $false
            failureClassification = $(if ($checkoutPreflight.status -eq "BLOCKED") { "UNBASELINED" } else { $null })
            note = "No versioned and proven baseline is configured."
        }
        workingTree = [ordered]@{
            before = $before.status
            afterOperationsBeforeReportWrite = $before.status
            preservation = [ordered]@{
                unchangedOutsideAutomationArtifacts = $true
                before = $beforeEvidence
                after = $beforeEvidence
            }
            automaticCorrectionAttempted = $false
            cleanupOrRestoreAttempted = $false
        }
        recommendations = $(if ($checkoutPreflight.status -eq "BLOCKED") {
            @("Use a checkout with no tracked modifications, staged files, or conflicts. Untracked files may remain.")
        } else {
            @("Checkout preflight passed. No validation tools were executed.")
        })
    }
    Write-AutomationJson -Path $outputPath -Value $preflightResult
    Write-Output ("Validation preflight: {0}" -f $outputPath)
    if ($checkoutPreflight.status -eq "BLOCKED") { exit 1 }
    exit 0
}

$expectedEffects = Get-AutomationExpectedEffects
Write-Output "Planned validation effects (no cleanup or restoration will be attempted):"
foreach ($effect in $expectedEffects) {
    Write-Output ("- {0}: {1} ({2})" -f $effect.path, $effect.effect, $effect.producer)
}
$checks = @()

$diffCheck = Invoke-AutomationGit -Operation DiffCheck
$checks += New-ValidationResult -Name "git-diff-check" -Execution $diffCheck

$npm = $(if (Get-Command "npm.cmd" -ErrorAction SilentlyContinue) { "npm.cmd" } else { "npm" })
$node = $(if (Get-Command "node.exe" -ErrorAction SilentlyContinue) { "node.exe" } else { "node" })
$checks += New-ValidationResult -Name "lint" -Execution (Invoke-AutomationProcess -FilePath $npm -Arguments @("run", "lint"))

$tscPath = Join-Path $context.repositoryRoot "node_modules\typescript\bin\tsc"
if (Test-Path -LiteralPath $tscPath) {
    $typescript = Invoke-AutomationProcess -FilePath $node -Arguments @($tscPath, "--noEmit", "--incremental", "false", "-p", "tsconfig.json")
} else {
    $typescript = [ordered]@{ command = "$node $tscPath"; exitCode = 127; durationMs = 0; stdout = ""; stderr = "Local TypeScript compiler is unavailable; dependencies were not installed." }
}
$checks += New-ValidationResult -Name "typescript" -Execution $typescript -ExpectedEffects @("tsconfig.tsbuildinfo is not expected because incremental compilation is disabled")

$matchTests = @(Get-ChildItem -LiteralPath (Join-Path $context.repositoryRoot "tests") -Filter "match-core-v1-*.test.ts" -File -ErrorAction SilentlyContinue |
    Sort-Object Name | ForEach-Object { $_.FullName })
if ($matchTests.Count -gt 0) {
    $matchCore = Invoke-AutomationProcess -FilePath $node -Arguments (@("--test") + $matchTests)
} else {
    $matchCore = [ordered]@{ command = "$node --test tests/match-core-v1-*.test.ts"; exitCode = 127; durationMs = 0; stdout = ""; stderr = "No Match Core tests were found." }
}
$checks += New-ValidationResult -Name "match-core-tests" -Execution $matchCore

$build = Invoke-AutomationProcess -FilePath $npm -Arguments @("run", "build")
$checks += New-ValidationResult -Name "build" -Execution $build -ExpectedEffects @(".next/**", "next-env.d.ts", "tsconfig.tsbuildinfo")

$generalTestPath = Join-Path $context.repositoryRoot "tests\rendered-html.test.mjs"
if (Test-Path -LiteralPath $generalTestPath) {
    $generalTests = Invoke-AutomationProcess -FilePath $node -Arguments @("--test", $generalTestPath)
} else {
    $generalTests = [ordered]@{ command = "$node --test $generalTestPath"; exitCode = 127; durationMs = 0; stdout = ""; stderr = "General rendered HTML tests are unavailable." }
}
$checks += New-ValidationResult -Name "general-tests" -Execution $generalTests

$after = Get-AutomationGitSnapshot
$afterEvidence = Get-AutomationWorkingTreeEvidence -Snapshot $after
$preservation = Compare-AutomationWorkingTreeEvidence -Before $beforeEvidence -After $afterEvidence
$failures = @($checks | Where-Object { $_.status -eq "FAIL" })
$result = [ordered]@{
    schemaVersion = 1
    command = "validate"
    runId = $context.runId
    timestamp = [DateTime]::UtcNow.ToString("o")
    mode = "full"
    status = $(if ($failures.Count -eq 0 -and $preservation.unchangedOutsideAutomationArtifacts) { "PASS" } else { "FAIL" })
    checkoutPreflight = $checkoutPreflight
    baseline = [ordered]@{
        available = $false
        failureClassification = $(if ($failures.Count -gt 0) { "UNBASELINED" } else { $null })
        note = "No versioned and proven baseline is configured. Failures are never inferred as preexisting or regressions."
    }
    expectedEffectsAnnouncedBeforeExecution = $expectedEffects
    checks = $checks
    summary = [ordered]@{
        total = $checks.Count
        passed = @($checks | Where-Object { $_.status -eq "PASS" }).Count
        failed = $failures.Count
        durationMs = [int64](($checks | Measure-Object -Property durationMs -Sum).Sum)
    }
    workingTree = [ordered]@{
        before = $before.status
        afterOperationsBeforeReportWrite = $after.status
        preservation = $preservation
        automaticCorrectionAttempted = $false
        cleanupOrRestoreAttempted = $false
    }
    recommendations = @($failures | ForEach-Object { "Review '$($_.name)' without automatic correction; failure is UNBASELINED." })
}

Write-AutomationJson -Path $outputPath -Value $result
Write-Output ("Validation: {0}" -f $outputPath)
if ($result.status -ne "PASS") { exit 1 }