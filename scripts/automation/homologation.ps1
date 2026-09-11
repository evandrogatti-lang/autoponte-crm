[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$RunId,
    [switch]$Execute,
    [switch]$ImportOnly
)

Set-StrictMode -Version 2.0
. (Join-Path $PSScriptRoot "Automation.Common.ps1")
if ($ImportOnly) { return }

function Get-HomologationRuntimeGate {
    $previewUrlText = [Environment]::GetEnvironmentVariable("PREVIEW_URL")
    $publicSupabaseUrlText = [Environment]::GetEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL")
    $targetRef = [Environment]::GetEnvironmentVariable("HOMOLOGATION_SUPABASE_PROJECT_REF")
    $vercelEnvironment = [Environment]::GetEnvironmentVariable("VERCEL_ENV")
    $identityAuthorization = [Environment]::GetEnvironmentVariable("AUTOMATION_IDENTITY_AUTHORIZATION")
    $bypassPresent = -not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable("VERCEL_AUTOMATION_BYPASS_SECRET"))
    $preview = $null
    $supabase = $null
    try { if ($previewUrlText) { $preview = New-Object System.Uri($previewUrlText) } } catch { $preview = $null }
    try { if ($publicSupabaseUrlText) { $supabase = New-Object System.Uri($publicSupabaseUrlText) } } catch { $supabase = $null }

    $previewApproved = $null -ne $preview -and $preview.Scheme -eq "https" -and
        $preview.Host.EndsWith(".vercel.app", [System.StringComparison]::OrdinalIgnoreCase) -and
        $preview.Host -notmatch '(^|[.-])(prod|production)([.-]|$)'
    $supabaseApproved = $null -ne $supabase -and $supabase.Scheme -eq "https" -and
        $supabase.Host -eq "prcmlynykncfgzwluoef.supabase.co"
    $approved = $previewApproved -and $supabaseApproved -and $targetRef -eq "prcmlynykncfgzwluoef" -and
        $vercelEnvironment -eq "preview" -and $bypassPresent -and
        $identityAuthorization -eq "SYNTHETIC_TEST_IDENTITIES_ONLY"

    return [ordered]@{
        approved = $approved
        previewUrlConfigured = -not [string]::IsNullOrWhiteSpace($previewUrlText)
        previewTargetApproved = $previewApproved
        vercelEnvironmentApproved = $vercelEnvironment -eq "preview"
        supabaseTargetApproved = $supabaseApproved -and $targetRef -eq "prcmlynykncfgzwluoef"
        bypassSecretPresent = $bypassPresent
        syntheticIdentityAuthorizationPresent = $identityAuthorization -eq "SYNTHETIC_TEST_IDENTITIES_ONLY"
        productionBlocked = $true
        sensitiveValuesPrinted = $false
    }
}

function New-HomologationPersona {
    param(
        [string]$Id,
        [string]$Label,
        [string]$SessionVariable,
        [string]$ExistingCoverage,
        [string[]]$PlannedAssertions
    )

    $sessionConfigured = $false
    if ($SessionVariable) {
        $sessionPath = [Environment]::GetEnvironmentVariable($SessionVariable)
        $sessionConfigured = -not [string]::IsNullOrWhiteSpace($sessionPath) -and (Test-Path -LiteralPath $sessionPath -PathType Leaf)
    }
    return [ordered]@{
        id = $Id
        label = $Label
        mode = "read-only"
        sessionVariable = $SessionVariable
        sessionConfigured = $sessionConfigured
        sessionPathPrinted = $false
        existingCoverage = $ExistingCoverage
        plannedAssertions = $PlannedAssertions
        status = "PLANNED"
        execution = $null
    }
}

$context = New-AutomationRunContext -RunId $RunId
$before = Get-AutomationGitSnapshot
$beforeEvidence = Get-AutomationWorkingTreeEvidence -Snapshot $before
$runtimeGate = Get-HomologationRuntimeGate
$matrix = @(
    (New-HomologationPersona -Id "administrator" -Label "Administrador" -SessionVariable "AUTOMATION_ADMIN_STORAGE" -ExistingCoverage "RBAC/tenant assertion exists but is explicitly BLOCKED in the current suite." -PlannedAssertions @("May manage settings", "Tenant isolation", "Read-only operational routes")),
    (New-HomologationPersona -Id "owner" -Label "Proprietario" -SessionVariable "AUTOMATION_OWNER_STORAGE" -ExistingCoverage "RBAC/tenant assertion exists but is explicitly BLOCKED in the current suite." -PlannedAssertions @("Owner-scoped access", "Tenant isolation", "Read-only operational routes")),
    (New-HomologationPersona -Id "manager" -Label "Gerente" -SessionVariable "AUTOMATION_MANAGER_STORAGE" -ExistingCoverage "RBAC/tenant assertion exists but is explicitly BLOCKED in the current suite." -PlannedAssertions @("Manager-scoped access", "Tenant isolation", "Read-only operational routes")),
    (New-HomologationPersona -Id "seller" -Label "Vendedor" -SessionVariable "AUTOMATION_SELLER_STORAGE" -ExistingCoverage "Partial read-only seller workspace and navigation coverage exists." -PlannedAssertions @("Seller workspace visible", "Cases not exposed", "No mutation")),
    (New-HomologationPersona -Id "without-tenant" -Label "Usuario sem tenant" -SessionVariable "AUTOMATION_NO_TENANT_STORAGE" -ExistingCoverage "No complete automated scenario exists." -PlannedAssertions @("Access denied", "No cross-tenant data", "No mutation")),
    (New-HomologationPersona -Id "unauthenticated" -Label "Usuario nao autenticado" -SessionVariable "" -ExistingCoverage "No complete unauthenticated persona scenario exists in the current homologation suite." -PlannedAssertions @("Redirect to login", "No protected data", "No mutation"))
)

$executionStatus = "PREFLIGHT"
$errors = @()
if ($Execute) {
    Write-Output "Expected homologation effects before execution:"
    foreach ($effect in Get-AutomationExpectedEffects) {
        Write-Output ("- {0}: {1}" -f $effect.path, $effect.effect)
    }
    if (-not $runtimeGate.approved) {
        $executionStatus = "BLOCKED"
        $errors += "Execution requires approved Vercel Preview + Supabase teste2, a bypass secret, and SYNTHETIC_TEST_IDENTITIES_ONLY authorization."
    } else {
        $runnerPath = Join-Path $context.repositoryRoot "scripts\homologation-run.mjs"
        foreach ($persona in $matrix) {
            if (-not $persona.sessionVariable) {
                $persona.status = "NOT_IMPLEMENTED"
                continue
            }
            if (-not $persona.sessionConfigured) {
                $persona.status = "BLOCKED"
                continue
            }
            $sessionPath = [Environment]::GetEnvironmentVariable($persona.sessionVariable)
            $execution = Invoke-AutomationProcess -FilePath "node.exe" -Arguments @($runnerPath) -Environment @{
                PLAYWRIGHT_AUTH_STORAGE = $sessionPath
            }
            $persona.execution = $execution
            $persona.status = $(if ($execution.exitCode -eq 0) { "PASS" } elseif ($execution.exitCode -eq 2) { "BLOCKED" } else { "FAIL" })
        }
        $executionStatus = $(if (@($matrix | Where-Object { $_.status -eq "FAIL" }).Count -gt 0) { "FAIL" } elseif (@($matrix | Where-Object { $_.status -in @("BLOCKED", "NOT_IMPLEMENTED") }).Count -gt 0) { "PARTIAL" } else { "PASS" })
    }
}

$after = Get-AutomationGitSnapshot
$afterEvidence = Get-AutomationWorkingTreeEvidence -Snapshot $after
$preservation = Compare-AutomationWorkingTreeEvidence -Before $beforeEvidence -After $afterEvidence
$result = [ordered]@{
    schemaVersion = 1
    command = "homologation"
    runId = $context.runId
    timestamp = [DateTime]::UtcNow.ToString("o")
    mode = $(if ($Execute) { "execute" } else { "preflight-and-plan" })
    status = $executionStatus
    productionAccessed = $false
    runtimeGate = $runtimeGate
    matrix = $matrix
    errors = $errors
    warnings = @(
        "Default mode never opens a remote URL.",
        "Execution never accepts usernames or passwords and does not read credential, cookie, token, key, or .env contents.",
        "Current automated coverage is reported honestly; missing persona scenarios are not inferred as passing."
    )
    expectedEffects = $(if ($Execute) { Get-AutomationExpectedEffects } else { @([ordered]@{ path = "artifacts/automation/**"; effect = "homologation.json only" }) })
    workingTree = [ordered]@{
        before = $before.status
        afterOperationsBeforeReportWrite = $after.status
        preservation = $preservation
        automaticCorrectionAttempted = $false
        cleanupOrRestoreAttempted = $false
    }
}

$outputPath = Get-AutomationRunFile -Context $context -Name "homologation.json"
Write-AutomationJson -Path $outputPath -Value $result
Write-Output ("Homologation: {0}" -f $outputPath)
if ($executionStatus -in @("BLOCKED", "FAIL", "PARTIAL") -or -not $preservation.unchangedOutsideAutomationArtifacts) {
    exit $(if ($executionStatus -eq "BLOCKED") { 2 } else { 1 })
}
