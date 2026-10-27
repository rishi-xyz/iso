# Iso — Implementation Plan

> **Purpose:** Incremental delivery plan from the hackathon MVP through v2.0.  
> **Guiding decision:** Build the workflow engine underneath the first product workflow, but ship only the CI Failure Investigator first.  
> **Infrastructure constraint:** Nebius Token Factory is available for inference; do not assume Nebius AI Cloud credits.

## 1. Execution strategy

Build one working end-to-end loop before adding breadth:

**GitHub Actions failure → secure event ingestion → context extraction → Nemotron via Token Factory → evidence-backed diagnosis → GitHub report.**

Then extend that exact workflow to candidate patches and CI verification. Add scheduled security workflows and user-authored YAML only after the event, run, step, policy, and audit abstractions work reliably.

### Stack direction

- **Frontend:** Next.js + TypeScript.
- **Control-plane API and worker:** TypeScript; modular monolith initially, separate asynchronous worker process.
- **Database:** PostgreSQL for tenants/users, repository connections, event receipts, workflow versions, runs, steps, findings, policies, approvals, and audit records.
- **Queue:** a durable job queue compatible with the chosen deployment. Keep the database as the source of truth; queue messages may be retried or duplicated.
- **Inference:** Nebius Token Factory using a documented supported NVIDIA open-source model identifier from the user's account.
- **Execution:** GitHub Actions controlled by the repository owner. In v0.2 the candidate PR uses the repository's normal CI to verify the patch.
- **Authentication:** a suitable hosted auth provider or GitHub OAuth, chosen during implementation; enforce tenant authorization in the API regardless of UI state.
- **Artifacts:** avoid retaining full raw logs by default. Store bounded, redacted excerpts and metadata; use private object storage only when the product truly needs it.
- **Deployment:** choose a low-cost provider for the web service and database. No product flow should require Nebius AI Cloud in v0.1-v0.4.

Do not add microservices, Kubernetes, a vector database, multi-agent orchestration, or a visual workflow builder before there is a clear requirement.

## 2. Release map

| Release | Primary goal | Exit condition |
|---|---|---|
| v0.1 | CI failure diagnosis | A failed workflow produces a useful GitHub report and dashboard run. |
| v0.2 | Candidate repair and verification | A bounded patch can be opened as a draft PR and tested through normal CI. |
| v0.3 | Security/maintenance scans | Scheduled scans create prioritized, traceable findings. |
| v0.4 | User-defined YAML workflows | A validated workflow can be triggered, executed, cancelled, and audited. |
| v0.5 | Customer-controlled runners | A registered runner can execute a narrow allowlisted task without receiving broad platform credentials. |
| v1.0 | Production readiness | Reliability, permission controls, budgets, supportability, and documentation are adequate for real teams. |
| v1.1 | Visual workflow editor | UI creates the same schema used by YAML workflows. |
| v1.2 | More integrations | At least one additional integration solves a validated user need. |
| v1.3 | Parallel specialists and repository context | Parallelism improves quality or time without losing traceability. |
| v1.4 | E2E and preview verification | Supported workflows can verify application behavior beyond unit tests. |
| v2.0 | General-purpose private agent workflows | Non-coding tasks can use the same policy, run, execution, and retention contracts. |

## 3. v0.1 — CI Failure Investigator

### Product scope

- [ ] Create GitHub App registration and installation flow.
- [ ] Let users connect their GitHub account and select authorized repositories.
- [ ] Receive `workflow_run` completion events for configured workflows.
- [ ] Verify webhook signatures and implement delivery idempotency.
- [ ] Retrieve failed workflow/job metadata and logs using authorized GitHub API access.
- [ ] Normalize logs and extract relevant error sections without executing repository code.
- [ ] Collect limited context: repository, commit SHA, workflow name, failed step, relevant changed-file metadata, and bounded log excerpts.
- [ ] Add a model gateway for Nebius Token Factory and validate structured model output.
- [ ] Use an NVIDIA open-source model available in the account; configure model ID through environment/configuration, not hardcoded assumptions.
- [ ] Add built-in `ci_failure_investigation` workflow definition using typed internal steps.
- [ ] Store workflow/run/step state and show a run timeline in the web dashboard.
- [ ] Post a comment, check summary, or other approved report to GitHub.
- [ ] Add cancellation, retry limits, per-run token budgets, and safe error handling.
- [ ] Record the model ID and usage data available from the provider response.
- [ ] Document what log/code context leaves GitHub and what Iso retains.

### Engineering tasks

- [ ] Define typed event, workflow, run, step, finding, evidence, policy, and outcome contracts.
- [ ] Implement webhook receipt table and idempotency key using GitHub delivery ID.
- [ ] Implement a durable queue or outbox pattern to avoid accepted events disappearing between database commit and queue publish.
- [ ] Keep event handlers thin; heavy work runs asynchronously.
- [ ] Add bounded log parsing and secret redaction before inference.
- [ ] Validate model JSON against a schema; treat malformed output as a recoverable model error.
- [ ] Separate model-generated hypothesis from verified CI facts.
- [ ] Add an explicit trigger-loop guard to ignore Iso's own comments/check updates.
- [ ] Build seeded demo repositories with known failures and expected diagnoses.

### v0.1 acceptance criteria

- [ ] A valid failed-workflow event creates exactly one run despite duplicate webhook delivery.
- [ ] Invalid webhook signatures are rejected.
- [ ] A supported failure displays workflow, commit, failed step, run status, model diagnosis, and evidence excerpts.
- [ ] A model timeout or malformed response does not crash the worker or produce a false verified outcome.
- [ ] No repository code or shell command is executed by the Iso web/API process.
- [ ] A repeated event cannot cause an infinite loop of Iso comments and runs.
- [ ] The dashboard can show queued, running, reporting, failed, cancelled, and completed states.
- [ ] A user can disconnect a repository and prevent further new runs.
- [ ] Demo video shows the actual Token Factory model call and a real, observable CI failure being analyzed.

## 4. v0.2 — Candidate repair and verification

- [ ] Add explicit repository-level repair policy: off, propose-only, or draft-PR-enabled.
- [ ] Ask the model for a minimal patch in a strict format; do not execute model-generated shell commands on the control plane.
- [ ] Validate file paths, patch size, file types, diff integrity, and allowed directories.
- [ ] Reject changes to workflow files, dependency lockfiles, generated files, or security-sensitive paths unless policy explicitly allows them.
- [ ] Create a new branch through GitHub APIs and apply the bounded patch through Git operations/API calls.
- [ ] Open a draft pull request only under configured policy and permission.
- [ ] Rely on the repository's configured GitHub Actions workflows to test the candidate. Do not execute PR code on the Iso API host.
- [ ] Link the original failure, candidate commit, subsequent check runs, and final outcome.
- [ ] Mark a fix `verified` only when required checks pass for the exact candidate SHA.
- [ ] Make no automatic merge the default.
- [ ] Handle stale base commits, patch conflicts, repeated attempts, and rate limits.

**Exit condition:** Demonstrate a real failing test, a bounded AI-generated patch, a candidate PR, and a passing or clearly failed CI result tied to the correct SHA.

## 5. v0.3 — Security and maintenance workflows

- [ ] Integrate deterministic dependency scanning and known-vulnerability sources through maintained tools.
- [ ] Add secret detection and static analysis using established tools where possible.
- [ ] Add daily/weekly schedule triggers using a scheduler with idempotent run creation.
- [ ] Let Nemotron contextualize findings and propose remediation; do not let it replace deterministic scanners.
- [ ] Deduplicate findings across runs and record scanner/source versions.
- [ ] Add severity, confidence, evidence, affected paths, and remediation guidance.
- [ ] Offer issue/PR creation only within policy.
- [ ] Avoid attempting exploit reproduction in production or against third-party systems; only run authorized tests in the repository's permitted CI environment.

**Exit condition:** A scheduled scan generates a traceable report and can create a controlled remediation proposal.

## 6. v0.4 — User-defined workflow engine

- [ ] Design and version a YAML workflow schema with triggers, steps, conditions, timeout, retry, concurrency, and approval policy.
- [ ] Validate YAML against a strict schema and reject unknown step types by default.
- [ ] Provide built-in step types first: `collect_ci_failure`, `analyze_failure`, `run_security_scan`, `summarize_findings`, `create_issue`, `propose_patch`, `request_approval`, and `wait_for_checks`.
- [ ] Treat workflow files as untrusted configuration; prevent arbitrary code or unrestricted shell commands by default.
- [ ] Add workflow versioning and pin each run to a specific workflow version.
- [ ] Add dry-run/validation mode and clear error messages.
- [ ] Add cancellation, retry semantics, per-step budgets, and failure policies.
- [ ] Keep the CI Failure Investigator implemented using the same step engine.

**Exit condition:** A user can define, validate, trigger, and inspect a simple custom workflow without editing the Iso server.

## 7. v0.5 — Customer-controlled execution

- [ ] Define a runner protocol and capability handshake.
- [ ] Build a self-hosted runner agent with outbound-only connection by default.
- [ ] Authenticate runners using short-lived registration tokens and rotateable credentials.
- [ ] Scope runners to a tenant, repository allowlist, and workflow allowlist.
- [ ] Do not send broad GitHub installation credentials to the runner.
- [ ] Add runner heartbeats, job leases, cancellation, timeout, result upload, and disconnected-run handling.
- [ ] Add optional local developer runner for trusted single-user workflows.
- [ ] Document network restrictions, isolation expectations, and data retention limits.

**Exit condition:** An administrator can run a test task on a customer-owned machine without opening inbound network access or granting platform-wide privileges.

## 8. v1.0 — Production-ready engineering automation

- [ ] Add robust retry/backoff, queue recovery, idempotent side effects, and replay controls.
- [ ] Add tenant isolation tests and role-based access controls.
- [ ] Add rate limits, cost quotas, run concurrency limits, usage attribution, and budget warnings.
- [ ] Add audit trail for workflow changes, approvals, credential use, GitHub writes, runner assignments, and retention actions.
- [ ] Add alerting, service health checks, structured redacted logs, and operational runbooks.
- [ ] Add database migrations, backup/restore plan, secret rotation, and incident response notes.
- [ ] Add documented data-flow and retention behavior, including the external model and CI providers.
- [ ] Publish public repository with license, setup instructions, configuration examples, threat model, and limitations.
- [ ] Test failure modes including provider outage, GitHub rate limits, worker crash, duplicate event, stale patch, and failed cleanup/retention jobs.

**Exit condition:** A small external team can install, configure, operate, understand costs, and revoke Iso without founder intervention.

## 9. v1.1–v1.4 — Expansion

### v1.1 Visual workflow editor
- [ ] Build a visual editor only after the YAML schema and runner are stable.
- [ ] Import/export YAML and show validation errors inline.
- [ ] Keep the visual representation lossless for supported workflow types.

### v1.2 Integrations
- [ ] Prioritize GitLab only after demand is validated.
- [ ] Add selected issue tracker and chat notifications.
- [ ] Keep provider-specific events behind normalized event adapters.

### v1.3 Multi-agent workflows and repository context
- [ ] Add role-specific agent steps only when they outperform one agent plus deterministic tools.
- [ ] Run independent tasks in parallel when safe.
- [ ] Scope reusable repository context by tenant/repository and provide deletion/retention controls.
- [ ] Record source and version for retrieved context.

### v1.4 Deeper verification
- [ ] Add preview deployment adapters and end-to-end test integrations.
- [ ] Require users to configure test commands, environment secrets, and preview cleanup policies.
- [ ] Keep test credentials isolated from the control plane.

## 10. v2.0 — General-purpose private agent workflows

- [ ] Generalize workflow input/output contracts for non-code tasks.
- [ ] Support selected workloads such as document processing, data transformation, or media pipelines through customer-owned execution adapters.
- [ ] Add task-scoped file access and artifact retention policies.
- [ ] Allow compatible customer-provided model endpoints where supported.
- [ ] Add policy-controlled tool catalogs and explicit external data-flow descriptions.
- [ ] Provide a developer SDK and documented runner protocol.
- [ ] Use separate workload profiles for CPU, memory, GPU, storage, network, and time limits.
- [ ] Validate cleanup and retention claims per provider and storage location; do not promise universal deletion solely because a runner process exits.

**Exit condition:** At least one non-coding workflow is running safely through the same documented policy, orchestration, execution-adapter, and audit interfaces.

## 11. Cross-cutting test plan

- Unit tests: schema validators, parsers, state transitions, redaction, policy evaluator, patch validator.
- Contract tests: GitHub payloads/API behavior, Token Factory adapter, runner protocol, workflow schema.
- Integration tests: duplicate webhook, queue retry, end-to-end failed workflow, candidate PR and CI results.
- Security tests: forged webhook, cross-tenant access, prompt injection in logs, path traversal in patch, malicious workflow config, secret leakage, unauthorized write attempt, runner credential misuse.
- Reliability tests: model timeout, provider 429/5xx, GitHub rate limit, queue restart, worker crash, stale commits, repeated schedule event.
- Evaluation set: known failures with expected root causes, evidence, correct uncertainty, and patch quality labels.

## 12. Main risks and mitigations

| Risk | Mitigation |
|---|---|
| Model gives a confident but wrong diagnosis | Show evidence and uncertainty; use deterministic checks; maintain an evaluation corpus. |
| No AI Cloud credits | Use Token Factory for inference and customer-owned GitHub Actions for execution. |
| Model cost grows unexpectedly | Limit context size, max steps, tokens, retries, and per-repository run budgets. |
| PR code attacks privileged workflow | Never execute untrusted PR code in privileged control-plane workflows; use GitHub's permission and event model safely. |
| Workflow engine becomes too broad | Built-in CI workflow first; strict typed steps; add YAML only after run lifecycle stabilizes. |
| Auto-fix changes unrelated files | Enforce path/size limits, narrow patch scope, inspect diff, and require CI/approval. |
| Privacy overclaim | Document each data flow and provider retention; distinguish local cleanup from provider-side retention. |
| Competition from coding agents | Differentiate on composable workflows, evidence states, runner flexibility, and permissions; validate with users. |

## 13. Hackathon deliverables checklist

- [ ] Public repository with an approved open-source license.
- [ ] README explaining setup, model selection, Nebius Token Factory usage, environment variables, and execution boundary.
- [ ] Working demo URL or clearly explained runnable test build.
- [ ] Public demo video no longer than three minutes, showing the real application and actual model/provider use.
- [ ] Explain which work Token Factory accelerates and that GitHub Actions performs execution.
- [ ] Include feedback on Nebius Token Factory and NVIDIA model behavior.
- [ ] Ask organizers to confirm the track interpretation of the code execution requirement before finalizing the demo architecture.
