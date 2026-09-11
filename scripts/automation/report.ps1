[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$RunId,
    [switch]$ImportOnly
)

Set-StrictMode -Version 2.0
. (Join-Path $PSScriptRoot "Automation.Common.ps1")
if ($ImportOnly) { return }

function Read-AutomationResult {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function ConvertTo-MarkdownCell {
    param([AllowNull()][object]$Value)
    if ($null -eq $Value) { return "n/a" }
    return ([string]$Value).Replace("|", "\|").Replace("`r", " ").Replace("`n", " ")
}

$context = New-AutomationRunContext -RunId $RunId
$before = Get-AutomationGitSnapshot
$beforeEvidence = Get-AutomationWorkingTreeEvidence -Snapshot $before
$inventoryPath = Get-AutomationRunFile -Context $context -Name "inventory.json"
$validationPath = Get-AutomationRunFile -Context $context -Name "validation.json"
$homologationPath = Get-AutomationRunFile -Context $context -Name "homologation.json"
$inventory = Read-AutomationResult -Path $inventoryPath
$validation = Read-AutomationResult -Path $validationPath
$homologation = Read-AutomationResult -Path $homologationPath
$incompatible = @()
foreach ($source in @($inventory, $validation, $homologation)) {
    if ($null -ne $source -and ([string]$source.runId -cne $context.runId)) {
        $incompatible += [string]$source.runId
    }
}
if ($incompatible.Count -gt 0) {
    throw "RunId '$RunId' is incompatible with one or more source reports."
}
$missing = @()
if ($null -eq $inventory) { $missing += "inventory.json" }
if ($null -eq $validation) { $missing += "validation.json" }
if ($null -eq $homologation) { $missing += "homologation.json" }

$after = Get-AutomationGitSnapshot
$afterEvidence = Get-AutomationWorkingTreeEvidence -Snapshot $after
$preservation = Compare-AutomationWorkingTreeEvidence -Before $beforeEvidence -After $afterEvidence
$statuses = @(
    $(if ($null -ne $inventory) { $inventory.status } else { "MISSING" }),
    $(if ($null -ne $validation) { $validation.status } else { "MISSING" }),
    $(if ($null -ne $homologation) { $homologation.status } else { "MISSING" })
)
$overallStatus = if ($statuses -contains "FAIL" -or $statuses -contains "MISSING") { "FAIL" } elseif ($statuses -contains "BLOCKED" -or $statuses -contains "PARTIAL") { "WARNING" } else { "PASS" }
$report = [ordered]@{
    schemaVersion = 1
    command = "report"
    runId = $context.runId
    timestamp = [DateTime]::UtcNow.ToString("o")
    status = $overallStatus
    branch = $before.branch
    head = $before.head
    upstream = $before.upstream
    divergence = $before.divergence
    sources = [ordered]@{
        inventory = $inventory
        validation = $validation
        homologation = $homologation
    }
    missingSources = $missing
    errors = @(
        $(if ($null -ne $validation) { @($validation.checks | Where-Object { $_.status -eq "FAIL" } | ForEach-Object { [ordered]@{ source = "validate"; check = $_.name; classification = "UNBASELINED"; exitCode = $_.exitCode } }) } else { @() })
    )
    warnings = @(
        $(if ($missing.Count -gt 0) { "Missing run artifacts: $($missing -join ', ')." } else { @() }),
        $(if (-not $preservation.unchangedOutsideAutomationArtifacts) { "Working tree evidence changed outside artifacts/automation while report was running." } else { @() })
    )
    recommendations = @(
        $(if ($overallStatus -ne "PASS") { "Review non-passing or missing evidence without automatic correction." } else { "Preserve this run directory as immutable execution evidence." })
    )
    workingTree = [ordered]@{
        before = $before.status
        afterOperationsBeforeReportWrite = $after.status
        preservation = $preservation
        filesCreatedByThisCommand = @("report.json", "report.md")
    }
}

$markdown = @"
# AutoPonte CRM Automation Report

- Timestamp: $(ConvertTo-MarkdownCell $report.timestamp)
- RunId: $(ConvertTo-MarkdownCell $report.runId)
- Branch: $(ConvertTo-MarkdownCell $report.branch)
- HEAD: $(ConvertTo-MarkdownCell $report.head)
- Upstream: $(ConvertTo-MarkdownCell $report.upstream)
- Divergence: $(ConvertTo-MarkdownCell $report.divergence)
- Overall status: $(ConvertTo-MarkdownCell $report.status)

## Results

| Command | Status | Artifact |
| --- | --- | --- |
| inventory | $(ConvertTo-MarkdownCell $(if ($null -ne $inventory) { $inventory.status } else { "MISSING" })) | inventory.json |
| validate | $(ConvertTo-MarkdownCell $(if ($null -ne $validation) { $validation.status } else { "MISSING" })) | validation.json |
| homologation | $(ConvertTo-MarkdownCell $(if ($null -ne $homologation) { $homologation.status } else { "MISSING" })) | homologation.json |

## Working Tree Integrity

- Unchanged outside artifacts/automation: $($preservation.unchangedOutsideAutomationArtifacts)
- Automatic correction attempted: false
- Cleanup or restoration attempted: false

## Baseline

No versioned and proven baseline is configured. Every observed validation failure is classified as `UNBASELINED`.

## Recommendations

$(if ($overallStatus -eq "PASS") { "- Preserve this immutable run directory as evidence." } else { "- Review non-passing or missing evidence without automatic correction." })
"@

$jsonPath = Get-AutomationRunFile -Context $context -Name "report.json"
$markdownPath = Get-AutomationRunFile -Context $context -Name "report.md"
if ((Test-Path -LiteralPath $jsonPath) -or (Test-Path -LiteralPath $markdownPath)) {
    throw "Refusing to create a partial or overwritten report; report.json or report.md already exists."
}
Write-AutomationJson -Path $jsonPath -Value $report
Write-AutomationText -Path $markdownPath -Value $markdown
Write-Output ("Report JSON: {0}" -f $jsonPath)
Write-Output ("Report Markdown: {0}" -f $markdownPath)
if ($overallStatus -ne "PASS" -or -not $preservation.unchangedOutsideAutomationArtifacts) { exit 1 }
