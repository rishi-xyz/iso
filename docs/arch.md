# Iso — Architecture

> **Working title:** Iso.  
> **Scope:** v0.1 CI Failure Investigator through v2.0 general-purpose private agent workflows.  
> **Key constraint:** Nebius Token Factory is the available AI service. Early releases do not depend on Nebius AI Cloud credits.

## 1. Architecture goals

1. Make the built-in CI Failure Investigator the first workflow running on a reusable workflow engine.
2. Separate the trusted control plane from repository code, model output, and execution environments.
3. Use GitHub Actions as the initial execution/verification substrate rather than running repository code on Iso's servers.
4. Keep model inference behind a gateway and use an NVIDIA open-source model through Nebius Token Factory for the hackathon.
5. Preserve evidence and connect findings, fixes, and check results to immutable commit SHAs.
6. Add customer-managed execution later without changing the workflow/run contracts.
7. Apply least privilege, resource limits, retention policies, idempotency, and explicit approval gates.

## 2. High-level architecture

```mermaid
flowchart TD
    GH[GitHub App / Webhooks] --> WH[Webhook Receiver]
    WH --> DB[(PostgreSQL: delivery + run records)]
    DB --> Q[Durable Queue / Outbox]
    Q --> ORCH[Workflow Orchestrator]
    ORCH --> CTX[Context & Log Collector]
    CTX --> GHAPI[GitHub API: workflow metadata, logs, diffs]
    CTX --> REDACT[Bounded Context + Secret Redaction]
    REDACT --> MG[Model Gateway]
    MG <--> TF[Nebius Token Factory: NVIDIA open-source model]
    ORCH --> POLICY[Policy & Approval Evaluator]
    ORCH --> GHWRITE[GitHub Action Adapter]
    GHWRITE --> GHAPI
    ORCH --> DB
    DB --> UI[Web Dashboard]
    ORCH --> AUDIT[Audit / Retention Worker]
    AUDIT --> DB
    subgraph Later execution adapters
      GHWORK[Repository-owned GitHub Actions]
      RUNNER[Customer-managed runner]
      EXT[Other approved execution adapters]
    end
    GHWRITE --> GHWORK
    ORCH -. v0.5+ .-> RUNNER
    ORCH -. v2.0 .-> EXT
```

This is a logical diagram. v0.1 can be deployed as a web app plus one worker process and a database; it does not require each component to be a separate service.

## 3. Core architecture principle: control plane vs execution plane

### 3.1 Control plane

Iso's API and worker handle identity, tenant scope, webhook validation, event normalization, workflow orchestration, context collection, model calls, policy decisions, result storage, and permitted GitHub API actions.

The control plane must **not** execute repository shell scripts, install arbitrary dependencies, or import/execute repository code. Reading code or logs for analysis is different from executing them.

### 3.2 Initial execution plane: GitHub Actions

- Existing repository workflows run builds and tests under the repository owner's GitHub Actions configuration.
- Iso can consume completed workflow results and logs through authorized GitHub APIs.
- In v0.2, Iso can propose a patch on a new branch or draft PR. The repository's ordinary CI validates the candidate commit.
- If a later version dispatches a dedicated workflow, that workflow must be installed/configured deliberately, use minimal permissions, and never combine privileged secrets with untrusted pull-request code.
- Compute and CI minutes are provided/billed under the repository owner's GitHub plan, not secretly subsidized by Iso.

### 3.3 Later execution plane: customer-managed runner

A runner agent connects outbound to Iso, polls or leases authorized jobs, performs only registered capabilities, and returns structured results. It is scoped to a tenant/repository/workflow allowlist. It must not receive global platform credentials or unrestricted authority.

## 4. Main components

### GitHub App adapter

Responsibilities:

- Install callback and repository selection.
- Webhook signature verification using the raw request body.
- Delivery idempotency and supported-event validation.
- Minimum permission installation and GitHub API rate-limit handling.
- Normalize provider-specific events into internal event contracts.
- Prevent loops caused by Iso's own comments, checks, or pull requests.

### Event inbox and queue/outbox

- Persist each webhook delivery before acknowledging it.
- Use GitHub delivery ID as the primary idempotency key, plus semantic run keys when needed.
- Publish work using a durable queue or database outbox so process crashes do not lose accepted events.
- Expect at-least-once delivery and make all side effects idempotent.

### Workflow orchestrator

- Resolve trigger to an enabled workflow version.
- Create a run tied to repository, event, commit SHA, policy version, and workflow version.
- Execute typed steps with bounded retries/timeouts and step-level state.
- Enforce total run budgets and cancellation.
- Separate lifecycle state from outcome.
- Never use model output to change its own permissions or register new tools.

### Context and log collector

- Fetch only logs/checks/diffs needed to investigate a run.
- Bound input size and prefer relevant failed-step excerpts over full raw logs.
- Detect and redact likely credentials, tokens, private keys, and environment secrets before model submission.
- Preserve references (run URL, check ID, SHA, file path and line) where possible.
- Do not run the contents being collected.

### Model gateway

- Calls Nebius Token Factory using a documented API and configured model ID.
- Uses an NVIDIA open-source model available to the user's Token Factory account.
- Adds request timeout, retry policy for transient errors, context-size limits, output validation, and usage metadata.
- Normalizes provider results to internal schemas.
- Treats code, comments, commit messages, and log lines as untrusted input that may contain prompt injection.
- Avoids storing complete prompts/responses by default; retain only the configured minimum needed for debugging and audit.

### Policy and approval evaluator

- Defines allowed actions per tenant/repository/workflow.
- Evaluates read, report, patch proposal, branch creation, draft PR creation, and later runner capabilities.
- Supports risk levels and user approval for high-impact actions.
- Defaults to no automatic merging.
- Runs in deterministic application code; a model may suggest an action but cannot authorize it.

### GitHub action adapter

- Reads workflow metadata, logs, check results, commit and PR metadata through GitHub APIs.
- Posts permitted comments/check summaries.
- In v0.2, creates branch/commit/draft PR through narrowly scoped APIs.
- Tracks write operations for audit, uses idempotency keys, and applies loop-prevention markers.
- Does not use a personal access token as the default auth mechanism.

### Dashboard

- Shows repositories, workflow definitions, runs, step timeline, evidence, outcomes, policy status, model usage, and retention metadata.
- Enforces authorization server-side for every object read or write.
- Escapes untrusted log and model text; never render as executable HTML.

### Audit and retention worker

- Enforces configured TTLs for stored logs, context snippets, model output, and artifacts.
- Retains audit metadata only as configured/necessary.
- Records cleanup attempts and failures without claiming that provider-side data has been deleted.
- Separates application cleanup from GitHub, model-provider, CI, backup, and external logging retention.

## 5. Suggested initial stack

- **Web:** Next.js + TypeScript.
- **API/worker:** TypeScript in a modular monolith, with worker process separated at deployment time.
- **Database:** PostgreSQL.
- **Queue:** durable queue plus outbox pattern; queue technology can be selected based on the deployment budget and reliability needs.
- **AI:** Nebius Token Factory adapter, model ID configured by environment variable.
- **Execution:** GitHub Actions as a customer-owned service, not Iso-owned compute.
- **Storage:** PostgreSQL for metadata; optional private object storage for artifacts requiring retention.
- **Auth:** GitHub OAuth or a managed identity provider, with explicit tenant/role checks in application code.
- **Observability:** correlation IDs and structured redacted logs; do not log secrets or complete source prompts by default.

Avoid microservices, Kubernetes, vector databases, and a multi-agent framework in v0.1 unless an implementation fact makes one necessary.

## 6. Internal contracts

### Event

```ts
type NormalizedEvent = {
  id: string;
  provider: "github";
  kind: "workflow_run.completed" | "pull_request.opened" | "pull_request.synchronize" | "schedule";
  tenantId: string;
  repositoryId: string;
  commitSha?: string;
  workflowRunId?: string;
  pullRequestNumber?: number;
  receivedAt: string;
  providerDeliveryId: string;
  payloadRef?: string;
};
```

Keep only the event data needed for processing. `payloadRef` should refer to controlled storage only if raw payload retention is necessary.

### Workflow version

```ts
type WorkflowDefinition = {
  id: string;
  version: number;
  name: string;
  enabled: boolean;
  trigger: TriggerDefinition;
  steps: WorkflowStepDefinition[];
  policyRef: string;
  createdAt: string;
};
```

In v0.1, the built-in workflow definition can be code-defined and stored/versioned internally. v0.4 adds user-authored YAML compiled to this validated representation.

### Run

```ts
type RunRecord = {
  id: string;
  tenantId: string;
  repositoryId: string;
  workflowId: string;
  workflowVersion: number;
  triggerEventId: string;
  commitSha?: string;
  lifecycleState: RunLifecycleState;
  outcome?: RunOutcome;
  policyVersion: number;
  modelProvider?: string;
  modelId?: string;
  startedAt?: string;
  finishedAt?: string;
};
```

### Evidence and finding

Evidence should be immutable or versioned and identify its source: GitHub run/log reference, check ID, commit SHA, scanner name/version, path/line, or test result. A finding links to evidence and has a state assigned by deterministic logic, not merely by model assertion.

## 7. Run state and outcome

### Lifecycle states

`queued`, `collecting_context`, `analyzing`, `reporting`, `waiting_for_checks`, `completed`, `failed`, `cancelled`, `blocked`.

Later versions may add explicit `repairing`, `verifying`, or `waiting_for_approval` states where the workflow contract requires them. Individual steps also have their own status.

### Outcomes

`diagnosis_ready`, `issues_found`, `no_findings`, `fix_proposed`, `fix_verified`, `fix_not_verified`, `inconclusive`, `execution_failed`, `policy_blocked`.

A run can be lifecycle-completed and outcome-inconclusive. Do not represent these as one boolean. A fix is `fix_verified` only if the required checks pass for the exact candidate SHA under the relevant policy.

## 8. Workflow execution model

Each workflow step has:

- Stable step type and schema version.
- Input/output schema and evidence references.
- Timeout, retry policy, and max-attempt count.
- Required capabilities and risk level.
- Policy evaluation before side effects.
- Structured status, error code, and bounded log output.

The model can return structured recommendations, but the orchestrator chooses which registered step may run. In v0.4, unknown YAML step types fail validation. Avoid an unrestricted `shell` step in hosted execution.

## 9. Model request design

For CI failure diagnosis, the model request should include bounded fields such as:

- Repository language/framework metadata when known.
- Workflow name, job/step name, conclusion, and commit SHA.
- Relevant redacted error excerpt and a limited amount of surrounding output.
- Relevant changed file names and selected diffs, subject to size limits.
- Explicit instruction to distinguish observed facts from hypotheses and to cite evidence references.
- Required JSON schema and maximum output length.

Do not include unrelated repository files, environment dumps, secrets, or broad user data. The output schema should contain summary, observed facts, likely causes, confidence category, evidence references, recommended next checks, and optional patch proposal (v0.2+). Treat the model's confidence as a model assessment, not calibrated probability unless evaluated.

## 10. Security and trust boundaries

### Webhook boundary

Verify signature before processing. Never trust repository/installation scope from an unverified body. Reject invalid or stale/duplicate deliveries as appropriate.

### Model boundary

Source code and logs are untrusted data. Redact secrets and delimit user-controlled context. Prompt injection must not grant tools or permissions.

### GitHub write boundary

Perform mutations only after deterministic policy evaluation. Require an explicit repository policy for patch branches/draft PRs. Do not merge automatically by default.

### GitHub Actions boundary

Do not execute untrusted pull-request code in a privileged `pull_request_target` or `workflow_run` job that has secrets or a write token. Never check out an attacker-controlled SHA in a privileged job without a carefully reviewed security design. The repository owner controls CI configuration, permissions, secrets, and billing.

### Tenant boundary

All data queries are scoped by tenant and authorization. IDs are not capabilities. Test cross-tenant access explicitly.

### Credential boundary

- Store GitHub App private key and Token Factory API key in a secrets manager/environment configuration.
- Never return secrets to the browser or persist them in plaintext application logs.
- Use GitHub App installation tokens with the smallest permissions possible.
- Keep broad installation credentials in the control plane; later runner credentials should be task-scoped and short-lived.

### Resource boundary

Cap log sizes, request sizes, model tokens, run count, retries, API rate, patch length, and concurrent workflows. Use timeouts for every external request.

## 11. Retention and privacy

- Store run metadata and summaries separately from raw logs and code context.
- Redact likely secrets before model submission and before logging.
- Give logs, context snippets, model outputs, and artifacts explicit retention policies.
- Do not claim that deletion of a GitHub Actions job or runner erases provider-side logs, backups, caches, or model-provider records.
- Document the flow of code/logs to GitHub, Iso, and Nebius Token Factory. Tell users which parts are sent for inference.
- Provide deletion controls for Iso-stored data and record deletion attempts/failures.

## 12. Generalizing to v2.0

By v2.0, retain the same orchestration core but abstract provider-specific elements behind:

- Trigger adapters.
- Model adapters.
- Execution adapters.
- Tool/capability registry.
- Artifact and input/output schemas.
- Policy and approval engine.
- Retention and audit interfaces.

A non-coding workflow such as document processing or media transformation must declare inputs, outputs, resource needs, network access, model provider, retention, and artifact handling. Customer-controlled execution is preferred for sensitive workloads. Do not market the platform as universally ephemeral or private unless each underlying provider's behavior has been verified.
