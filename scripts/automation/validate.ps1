[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$RunId,
    [switch]$Preflight,
    [switch]$SelfTest,
    [switch]$ImportOnly
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "Automation.Common.ps1")
if ($ImportOnly) { return }

function New-ValidationCheck {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][AllowEmptyCollection()][object[]]$ExecutionOutput,
        [string[]]$ExpectedEffects = @()
    )

    if ($ExecutionOutput.Count -ne 1) {
        throw "Check '$Name' emitted $($ExecutionOutput.Count) success-stream objects; exactly one structured execution result is required."
    }
    $execution = $ExecutionOutput[0]
    if ($null -eq $execution -or $execution -isnot [pscustomobject]) {
        throw "Check '$Name' did not emit a PSCustomObject execution result."
    }
    foreach ($property in @("command", "exitCode", "durationMs")) {
        if ($null -eq $execution.PSObject.Properties[$property]) {
            throw "Check '$Name' execution result is missing '$property'."
        }
    }
    if ($execution.exitCode -isnot [int] -and $execution.exitCode -isnot [long]) {
        throw "Check '$Name' exitCode must be an integer."
    }
    if ($execution.durationMs -isnot [int] -and $execution.durationMs -isnot [long]) {
        throw "Check '$Name' durationMs must be an integer."
    }
    if ([string]::IsNullOrWhiteSpace([string]$execution.command)) {
        throw "Check '$Name' command must be a non-empty string."
    }

    return [pscustomobject][ordered]@{
        name = $Name
        status = $(if ($execution.exitCode -eq 0) { "PASS" } else { "FAIL" })
        exitCode = [int]$execution.exitCode
        durationMs = [int64]$execution.durationMs
        command = [string]$execution.command
        classification = $(if ($execution.exitCode -eq 0) { "NONE" } else { "UNBASELINED" })
        stdout = ConvertTo-AutomationSafeText ([string]$execution.stdout)
        stderr = ConvertTo-AutomationSafeText ([string]$execution.stderr)
        expectedEffects = [string[]]$ExpectedEffects
    }
}

function Assert-ValidationCheckSchema {
    param([Parameter(Mandatory = $true)][AllowEmptyCollection()][object[]]$Checks)

    for ($index = 0; $index -lt $Checks.Count; $index++) {
        $check = $Checks[$index]
        if ($null -eq $check -or $check -isnot [pscustomobject]) {
            throw "Validation check at index $index is null or is not a PSCustomObject."
        }
        foreach ($property in @("name", "status", "exitCode", "durationMs", "command", "classification")) {
            if ($null -eq $check.PSObject.Properties[$property]) {
                throw "Validation check at index $index is missing '$property'."
            }
            if ($null -eq $check.$property) {
                throw "Validation check at index $index has null '$property'."
            }
        }
        if ([string]::IsNullOrWhiteSpace([string]$check.name) -or [string]::IsNullOrWhiteSpace([string]$check.command)) {
            throw "Validation check at index $index has an empty name or command."
        }
        if ($check.status -notin @("PASS", "FAIL")) {
            throw "Validation check '$($check.name)' has invalid status '$($check.status)'."
        }
        if ($check.classification -notin @("NONE", "UNBASELINED")) {
            throw "Validation check '$($check.name)' has invalid classification '$($check.classification)'."
        }
        if ($check.exitCode -isnot [int] -and $check.exitCode -isnot [long]) {
            throw "Validation check '$($check.name)' has a non-integer exitCode."
        }
        if ($check.durationMs -isnot [int] -and $check.durationMs -isnot [long]) {
            throw "Validation check '$($check.name)' has a non-integer durationMs."
        }
    }
}

function New-ValidationExecutionFailure {
    param([string]$Command, [string]$Message, [int]$ExitCode = 127)
    return [pscustomobject][ordered]@{
        command = $Command
        exitCode = $ExitCode
        durationMs = [int64]0
        stdout = ""
        stderr = ConvertTo-AutomationSafeText $Message
    }
}

function Get-ValidationExitCode {
    param([Parameter(Mandatory = $true)]$Result)
    if ($null -eq $Result -or $null -eq $Result.PSObject.Properties["status"]) { return 2 }
    if ($Result.status -eq "PASS") { return 0 }
    if ($Result.status -eq "BLOCKED") { return 1 }
    return 2
}

function New-ValidationErrorResult {
    param([string]$RunId, [string]$Message)
    return [pscustomobject][ordered]@{
        schemaVersion = 1
        command = "validate"
        runId = $RunId
        timestamp = [DateTime]::UtcNow.ToString("o")
        mode = "error"
        status = "ERROR"
        toolsExecuted = $false
        checks = @()
        error = ConvertTo-AutomationSafeText $Message
    }
}

function Invoke-ValidationSelfTests {
    $failures = New-Object System.Collections.Generic.List[string]
    $validExecution = [pscustomobject]@{ command = "self-test"; exitCode = 0; durationMs = [int64]1; stdout = ""; stderr = "" }
    try {
        $validCheck = New-ValidationCheck -Name "valid" -ExecutionOutput @($validExecution)
        Assert-ValidationCheckSchema -Checks @($validCheck)
    } catch { $failures.Add("valid check: $($_.Exception.Message)") }

    try {
        $missingDuration = [pscustomobject]@{ command = "self-test"; exitCode = 1; stdout = ""; stderr = "" }
        $null = New-ValidationCheck -Name "missing-duration" -ExecutionOutput @($missingDuration)
        $failures.Add("missing durationMs was accepted")
    } catch { }

    try {
        $null = New-ValidationCheck -Name "stdout-leak" -ExecutionOutput @("accidental stdout", $validExecution)
        $failures.Add("accidental stdout was accepted")
    } catch { }

    try {
        throw "simulated exception before result"
    } catch {
        $errorResult = New-ValidationErrorResult -RunId "self-test" -Message $_.Exception.Message
        if ((Get-ValidationExitCode -Result $errorResult) -eq 0) {
            $failures.Add("exception result produced exit code zero")
        }
    }

    if ($failures.Count -gt 0) {
        throw "Validation self-test failed: $($failures -join '; ')"
    }
    return [pscustomobject]@{ status = "PASS"; tests = 4; artifactsCreated = $false }
}

function Resolve-ValidationCommand {
    param([Parameter(Mandatory = $true)][string[]]$Names)
    foreach ($name in $Names) {
        try {
            $command = Get-Command $name -ErrorAction Stop
            if ($command.Source) { return $command.Source }
            return $command.Name
        } catch {
            continue
        }
    }
    throw "Required command is unavailable: $($Names -join ', ')"
}

function Invoke-ValidationMain {
    param(
        [Parameter(Mandatory = $true)]$Context,
        [switch]$PreflightOnly
    )

    $before = Get-AutomationGitSnapshot
    $beforeEvidence = Get-AutomationWorkingTreeEvidence -Snapshot $before
    $checkoutPreflight = Get-AutomationCheckoutPreflight -Snapshot $before
    if ($PreflightOnly -or -not $checkoutPreflight.toolExecutionAllowed) {
        return [pscustomobject][ordered]@{
            schemaVersion = 1
            command = "validate"
            runId = $Context.runId
            timestamp = [DateTime]::UtcNow.ToString("o")
            mode = "preflight"
            status = $checkoutPreflight.status
            checkoutPreflight = $checkoutPreflight
            toolsExecuted = $false
            checks = @()
            baseline = [pscustomobject]@{
                available = $false
                classification = $(if ($checkoutPreflight.status -eq "BLOCKED") { "UNBASELINED" } else { "NONE" })
            }
            workingTree = [pscustomobject]@{
                before = $before.status
                afterOperationsBeforeReportWrite = $before.status
                preservation = [pscustomobject]@{ unchangedOutsideAutomationArtifacts = $true; before = $beforeEvidence; after = $beforeEvidence }
                automaticCorrectionAttempted = $false
                cleanupOrRestoreAttempted = $false
            }
        }
    }

    $expectedEffects = @(Get-AutomationExpectedEffects)
    Write-Host "Planned validation effects (no cleanup or restoration will be attempted):"
    foreach ($effect in $expectedEffects) {
        Write-Host ("- {0}: {1} ({2})" -f $effect.path, $effect.effect, $effect.producer)
    }

    $checks = New-Object System.Collections.Generic.List[object]
    $checks.Add((New-ValidationCheck -Name "git-diff-check" -ExecutionOutput @(Invoke-AutomationGit -Operation DiffCheck))) | Out-Null

    $npm = Resolve-ValidationCommand -Names @("npm.cmd", "npm")
    $node = Resolve-ValidationCommand -Names @("node.exe", "node")
    $checks.Add((New-ValidationCheck -Name "lint" -ExecutionOutput @(Invoke-AutomationProcess -FilePath $npm -Arguments @("run", "lint")))) | Out-Null

    $tscPath = Join-Path $Context.repositoryRoot "node_modules\typescript\bin\tsc"
    $typescriptOutput = if (Test-Path -LiteralPath $tscPath) {
        @(Invoke-AutomationProcess -FilePath $node -Arguments @($tscPath, "--noEmit", "--incremental", "false", "-p", "tsconfig.json"))
    } else {
        @(New-ValidationExecutionFailure -Command "$node $tscPath" -Message "Local TypeScript compiler is unavailable; dependencies were not installed.")
    }
    $checks.Add((New-ValidationCheck -Name "typescript" -ExecutionOutput $typescriptOutput -ExpectedEffects @("tsconfig.tsbuildinfo is not expected because incremental compilation is disabled"))) | Out-Null

    $matchTests = @(Get-ChildItem -LiteralPath (Join-Path $Context.repositoryRoot "tests") -Filter "match-core-v1-*.test.ts" -File -ErrorAction Stop |
        Sort-Object Name | ForEach-Object { $_.FullName })
    $matchOutput = if ($matchTests.Count -gt 0) {
        @(Invoke-AutomationProcess -FilePath $node -Arguments (@("--test") + $matchTests))
    } else {
        @(New-ValidationExecutionFailure -Command "$node --test tests/match-core-v1-*.test.ts" -Message "No Match Core tests were found.")
    }
    $checks.Add((New-ValidationCheck -Name "match-core-tests" -ExecutionOutput $matchOutput)) | Out-Null

    $checks.Add((New-ValidationCheck -Name "build" -ExecutionOutput @(Invoke-AutomationProcess -FilePath $npm -Arguments @("run", "build")) -ExpectedEffects @(".next/**", "next-env.d.ts", "tsconfig.tsbuildinfo"))) | Out-Null

    $generalTestPath = Join-Path $Context.repositoryRoot "tests\rendered-html.test.mjs"
    $generalOutput = if (Test-Path -LiteralPath $generalTestPath) {
        @(Invoke-AutomationProcess -FilePath $node -Arguments @("--test", $generalTestPath))
    } else {
        @(New-ValidationExecutionFailure -Command "$node --test $generalTestPath" -Message "General rendered HTML tests are unavailable.")
    }
    $checks.Add((New-ValidationCheck -Name "general-tests" -ExecutionOutput $generalOutput)) | Out-Null

    $checkArray = $checks.ToArray()
    Assert-ValidationCheckSchema -Checks $checkArray
    $passed = 0
    $failed = 0
    [int64]$durationMs = 0
    foreach ($check in $checkArray) {
        if ($check.status -eq "PASS") { $passed++ } else { $failed++ }
        $durationMs += [int64]$check.durationMs
    }

    $after = Get-AutomationGitSnapshot
    $afterEvidence = Get-AutomationWorkingTreeEvidence -Snapshot $after
    $preservation = Compare-AutomationWorkingTreeEvidence -Before $beforeEvidence -After $afterEvidence
    return [pscustomobject][ordered]@{
        schemaVersion = 1
        command = "validate"
        runId = $Context.runId
        timestamp = [DateTime]::UtcNow.ToString("o")
        mode = "full"
        status = $(if ($failed -eq 0 -and $preservation.unchangedOutsideAutomationArtifacts) { "PASS" } else { "FAIL" })
        checkoutPreflight = $checkoutPreflight
        toolsExecuted = $true
        baseline = [pscustomobject]@{ available = $false; classification = $(if ($failed -gt 0) { "UNBASELINED" } else { "NONE" }) }
        expectedEffectsAnnouncedBeforeExecution = $expectedEffects
        checks = $checkArray
        summary = [pscustomobject]@{ total = $checkArray.Count; passed = $passed; failed = $failed; durationMs = $durationMs }
        workingTree = [pscustomobject]@{
            before = $before.status
            afterOperationsBeforeReportWrite = $after.status
            preservation = $preservation
            automaticCorrectionAttempted = $false
            cleanupOrRestoreAttempted = $false
        }
    }
}

if ($SelfTest) {
    try {
        $selfTestResult = Invoke-ValidationSelfTests
        Write-Output ("Validation self-test: {0} ({1} cases)" -f $selfTestResult.status, $selfTestResult.tests)
        exit 0
    } catch {
        Write-Error (ConvertTo-AutomationSafeText $_.Exception.Message)
        exit 2
    }
}

$context = $null
$outputPath = $null
$result = $null
try {
    $context = New-AutomationRunContext -RunId $RunId
    $outputPath = Get-AutomationRunFile -Context $context -Name "validation.json"
    $result = Invoke-ValidationMain -Context $context -PreflightOnly:$Preflight
    if ($null -eq $result -or $result -isnot [pscustomobject]) {
        throw "Validation completed without a structured result."
    }
    $exitCode = Get-ValidationExitCode -Result $result
    Write-AutomationJson -Path $outputPath -Value $result
    Write-Output ("Validation: {0}" -f $outputPath)
    exit $exitCode
} catch {
    $message = ConvertTo-AutomationSafeText $_.Exception.Message
    $errorResult = New-ValidationErrorResult -RunId $RunId -Message $message
    if ($null -ne $outputPath -and -not (Test-Path -LiteralPath $outputPath)) {
        try {
            Write-AutomationJson -Path $outputPath -Value $errorResult
            Write-Error ("Validation failed; ERROR report: {0}; {1}" -f $outputPath, $message)
        } catch {
            Write-Error ("Validation failed and ERROR report could not be written: {0}" -f (ConvertTo-AutomationSafeText $_.Exception.Message))
        }
    } else {
        Write-Error ("Validation failed before an ERROR report could be created: {0}" -f $message)
    }
    exit 2
}
