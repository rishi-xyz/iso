# Iso — Product Requirements Document (PRD)

> **Product:** Iso (working title)  
> **Product direction:** Reusable agent workflow engine with CI Failure Investigator as the first built-in workflow.  
> **Primary initial integration:** GitHub Actions.  
> **AI requirement:** NVIDIA open-source model through Nebius Token Factory.  
> **Execution constraint:** Early releases must not depend on Nebius AI Cloud credits.

## 1. Summary

Iso is an event-driven AI engineering platform that takes a repository event, runs a controlled workflow, and returns evidence-backed results. The first workflow investigates failed GitHub Actions runs using NVIDIA Nemotron through Nebius Token Factory. Later releases add bounded patch proposals, verification through normal CI, scheduled security/maintenance scans, user-defined workflows, customer-managed runners, team controls, and general-purpose private agent tasks.

The workflow engine is a foundation, not a second product to build after the MVP. However, user-authored workflow creation is deferred until the built-in workflow proves the run/step/policy model works.

## 2. Problem statement

When CI fails, developers must inspect logs, correlate output with changed files, infer root cause, decide what to try, and rerun checks. This is time-consuming and often interrupts feature work. Existing AI tools may summarize logs or suggest code, but teams still need a reliable link between events, model reasoning, proposed actions, real verification results, approvals, and audit history.

## 3. Goals

### v0.1 goals

- Detect failed GitHub Actions workflow runs for enabled repositories.
- Produce a concise diagnosis grounded in actual workflow metadata and log evidence.
- Use an NVIDIA open-source model through Nebius Token Factory for core AI reasoning.
- Show a traceable run and step timeline in the Iso dashboard.
- Post an approved summary back to GitHub.
- Enforce privacy, least privilege, idempotency, and cost limits from the beginning.
- Avoid running untrusted repository code on Iso-owned application servers.

### Platform goals through v2.0

- Make the CI investigator a workflow built on reusable triggers, steps, policies, and execution adapters.
- Support controlled candidate fixes and CI-based verification.
- Add scheduled security/maintenance workflows and user-defined YAML workflows.
- Add customer-controlled runners and a documented adapter model.
- Extend the same control/policy/retention framework to selected non-coding agent workloads.

## 4. Non-goals

### v0.1 non-goals

- General coding agent capable of independently completing arbitrary tickets.
- Hosted VM/sandbox fleet or reliance on Nebius AI Cloud.
- Automated code mutation or merging.
- Visual workflow editor or free-form shell action framework.
- Full application security testing suite.
- Universal data deletion guarantee across third parties.

### Before v2.0

- Consumer video editor or general personal assistant product.
- A marketplace for arbitrary unreviewed agent skills.
- Unrestricted multi-agent coordination.
- Promise that AI-generated diagnoses or fixes are always correct.

## 5. Personas

### Developer / repository maintainer
Wants fast, useful explanations for CI failures, links to evidence, and minimal noisy comments. Must be able to disable the app, inspect what was sent for analysis, and revoke permissions.

### Team lead
Wants consistent failure triage, controlled patch proposals, visibility into reliability and cost, and assurance that agents cannot silently merge changes.

### Platform/security engineer
Wants least-privilege integrations, auditability, predictable resource limits, data-retention controls, and later support for customer-managed runners.

### Workflow author (v0.4+)
Wants reusable, versioned automation that can respond to repository events and run approved steps without writing a new integration for each use case.

## 6. User journeys

### Journey A — Investigate a failed workflow (v0.1)

1. User installs Iso's GitHub App and selects a repository.
2. User enables the built-in CI Failure Investigator and selects supported workflows or failure policy.
3. A GitHub Actions workflow fails.
4. Iso receives and verifies the event, stores it idempotently, and queues a run.
5. The workflow collects bounded logs and metadata, redacts sensitive patterns, and submits the minimal relevant context to Nemotron via Token Factory.
6. Iso validates and normalizes the diagnosis, retaining evidence references.
7. The application posts an approved report/check/comment and marks the run outcome.
8. User inspects the dashboard and provides feedback or disables the workflow.

### Journey B — Propose and verify a fix (v0.2)

1. A run has a credible diagnosis and the repository policy permits a repair attempt.
2. Iso requests a minimal patch and validates paths, size, and base SHA.
3. If policy allows, it creates a candidate branch/draft PR; otherwise it presents the patch for manual use.
4. Normal repository CI runs against the candidate under the repository's permissions and configuration.
5. Iso links results to the candidate SHA and reports pass/fail/inconclusive.
6. The developer reviews and merges manually. Automatic merging is off by default.

### Journey C — Scheduled security maintenance (v0.3)

1. Repository admin enables daily/weekly scans and chooses deterministic scanners.
2. The scheduler creates an idempotent workflow run.
3. Scanners return findings with source and version metadata.
4. Nemotron summarizes, contextualizes, and prioritizes findings.
5. User views a report and optionally requests an issue or candidate remediation PR.

### Journey D — Create a custom workflow (v0.4+)

1. User writes or edits a YAML workflow using supported triggers and registered step types.
2. Iso validates the schema, limits, policy references, and permissions.
3. A workflow run is pinned to a version and triggered by an event or schedule.
4. Each step has visible state, evidence, timings, retries, and safe error details.
5. User can cancel or replay the run within policy and budget limits.

### Journey E — Run on customer-controlled infrastructure (v0.5+)

1. Admin registers a scoped runner.
2. Iso validates the runner protocol/capabilities without exposing credentials.
3. Policy routes approved jobs to the runner.
4. The runner executes typed steps and returns validated results.
5. Admin can revoke access and inspect audit events.

## 7. Functional requirements

Priority: **P0** = required for v0.1; **P1** = near-term; **P2** = later release.

### Integration and event handling

- **FR-001 (P0):** Integrate with GitHub through a GitHub App, not a personal token as the default.
- **FR-002 (P0):** Verify webhook signatures before processing event content.
- **FR-003 (P0):** Process supported failed `workflow_run` completed events for enabled repositories.
- **FR-004 (P0):** Make duplicate webhook delivery idempotent.
- **FR-005 (P0):** Retrieve authorized workflow metadata and relevant logs; handle unavailable/expired logs gracefully.
- **FR-006 (P0):** Prevent Iso-generated comments/checks from creating unbounded event loops.
- **FR-007 (P1):** Support PR events and scheduled triggers through normalized event adapters.

### Workflow engine

- **FR-010 (P0):** Represent the built-in CI investigation as a versioned workflow with typed steps.
- **FR-011 (P0):** Persist run and step states with timestamps, error codes, evidence references, and outcome.
- **FR-012 (P0):** Support timeouts, bounded retries, cancellation, and run budgets.
- **FR-013 (P0):** Resolve each run to a workflow and policy version.
- **FR-014 (P1):** Support workflow versioning, validated YAML, conditions, approval steps, and reusable step definitions.
- **FR-015 (P1):** Reject unknown step types and unsafe workflow configurations before execution.
- **FR-016 (P2):** Add visual workflow builder, import/export, and template library.

### AI diagnosis

- **FR-020 (P0):** Call an NVIDIA open-source model available through Nebius Token Factory.
- **FR-021 (P0):** Keep Token Factory API credentials and model configuration server-side.
- **FR-022 (P0):** Send bounded, relevant, redacted context instead of indiscriminately sending a repository or complete environment.
- **FR-023 (P0):** Validate model output against a strict schema.
- **FR-024 (P0):** Distinguish observed facts from likely causes and limitations.
- **FR-025 (P0):** Link evidence references to actual run/check/log or code context where available.
- **FR-026 (P1):** Accept candidate patch proposals with base SHA and bounded file changes.
- **FR-027 (P1):** Track model ID and usage/cost metadata where provided by the API.
- **FR-028 (P2):** Add compatible user-provided model endpoints behind the model gateway.

### Reporting and dashboard

- **FR-030 (P0):** Show repositories, run list, run status, diagnosis, evidence, model metadata, and step history.
- **FR-031 (P0):** Post a configured summary to GitHub using authorized app permissions.
- **FR-032 (P0):** Clearly label a model-suggested cause as unverified unless supported by execution evidence.
- **FR-033 (P0):** Provide safe error states for model/GitHub failures without fabricating results.
- **FR-034 (P1):** Show patch status and required CI checks for the candidate SHA.
- **FR-035 (P1):** Allow finding feedback, dismissal, and replay subject to authorization and limits.

### Repair and verification

- **FR-040 (P1):** Allow repair behavior to be disabled, propose-only, or draft-PR-enabled by repository policy.
- **FR-041 (P1):** Validate patch format, base SHA, file paths, number of files, and diff size.
- **FR-042 (P1):** Reject high-risk file changes by default or require explicit approval.
- **FR-043 (P1):** Create candidate branches/PRs only after policy authorization.
- **FR-044 (P1):** Use repository CI to verify the candidate and tie check outcomes to its exact SHA.
- **FR-045 (P1):** Never automatically merge by default.

### Security and maintenance

- **FR-050 (P1):** Integrate deterministic dependency, secret, and static-analysis scanners.
- **FR-051 (P1):** Support daily/weekly scans with deduplication and scheduler idempotency.
- **FR-052 (P1):** Record scanner name/version and evidence for each finding.
- **FR-053 (P1):** Provide controlled issue/PR creation for selected findings.

### Runner and general-purpose platform

- **FR-060 (P1):** Provide an outbound-only, scoped runner protocol with revocation and capability allowlist.
- **FR-061 (P1):** Enforce tenant/repository/workflow scope for every runner job.
- **FR-062 (P2):** Generalize workflow inputs/outputs and adapters to selected non-coding tasks.
- **FR-063 (P2):** Declare workload resource profiles, network access, artifact policy, model provider, and retention behavior.

## 8. Non-functional requirements

- **Security:** No repository code execution in the control-plane process; no broad secrets exposed to untrusted code; tenant authorization on all routes.
- **Reliability:** Duplicate events and retries do not duplicate irreversible side effects; external calls have timeouts and bounded retry.
- **Traceability:** Each run links to event, workflow version, commit SHA, model ID, steps, evidence, actions, and outcome.
- **Cost control:** Context, token, retry, concurrent-run, and external API usage limits are configurable.
- **Privacy:** Sensitive context is minimized and redacted; data flows and retention are documented accurately.
- **Maintainability:** A new workflow should compose existing typed steps/adapters rather than duplicate the run infrastructure.
- **Accessibility/usability:** Run states and errors are understandable; users can inspect evidence without reading raw model output alone.
- **Portability:** Provider-specific GitHub/model/runner behavior is behind adapter interfaces.

## 9. Permission and safety policy

- Initial mode is read-and-report; do not mutate repository content.
- Write actions require explicit enablement and narrowly scoped GitHub App permissions.
- Draft PR creation is a separate policy capability.
- Automatic merging is disabled by default.
- The agent cannot authorize its own actions or add new tools.
- Logs and repository content are untrusted and can contain prompt injection.
- Do not run untrusted PR code in privileged GitHub Actions contexts with secrets/write tokens.
- Do not execute repository code on the Iso control plane.

## 10. Privacy and data handling

- Describe which logs/diffs are sent to Nebius Token Factory.
- Minimize and redact context before model calls.
- Set independent retention for run metadata, raw logs/context, model outputs, patches, and artifacts.
- Avoid retaining full raw logs unless the user configures it.
- Allow disconnect/revocation and deletion of Iso-stored data where supported.
- State clearly that GitHub, model providers, hosting, logging, or backup providers may have their own retention rules; deleting a Iso run does not automatically prove deletion across them.

## 11. UX requirements

A run detail view should answer:

1. What event triggered this run?
2. Which repository, workflow, job, and commit were involved?
3. What did the tools actually observe?
4. Which parts are model hypotheses?
5. What action was taken, and which policy authorized it?
6. What did CI/scanners prove, and what remains unknown?
7. Which model and external services were used?
8. What data is retained, and when is it scheduled for expiry?

Use explicit states like **Suspected**, **Reproduced**, **Patch proposed**, **Checks passed**, and **Inconclusive**. Avoid a single "AI fixed it" badge that hides the evidence.

## 12. Success metrics

### v0.1

- Diagnosis usefulness rating from developers.
- Percentage of failures receiving actionable reports.
- Median time from failed CI event to report.
- Rate of unsupported or hallucinated evidence claims.
- Cost per diagnosis and Token Factory usage per run.
- Webhook idempotency, job success, and timeout/error rates.

### v0.2+

- Candidate patches passing required CI checks.
- Developer acceptance/merge rate of AI-proposed patches.
- Regression rate after accepted fixes.
- Human time saved per repaired failure.
- False-positive rate for security findings.
- Percentage of runs within configured cost budgets.

## 13. Dependencies and assumptions

- A GitHub App can be installed on a test repository with needed read/report permissions.
- The user has access to an NVIDIA open-source model in Nebius Token Factory and can supply a server-side API key.
- GitHub Actions is available in the repository and its owner accepts associated execution/billing.
- Exact model ID, API behavior, GitHub permissions, event payloads, and hackathon track interpretation are verified during implementation.
- No Nebius AI Cloud credits are assumed.

## 14. Release acceptance summary

- **v0.1:** Real failed workflow → secure event → model diagnosis via Token Factory → evidence-backed GitHub report and dashboard run.
- **v0.2:** Candidate patch → permitted branch/draft PR → exact-SHA CI results → honest verified/unverified outcome.
- **v0.3:** Scheduled deterministic security/maintenance scans with AI triage and controlled remediation.
- **v0.4:** Custom validated YAML workflow runs on the existing workflow engine.
- **v0.5:** Scoped customer-owned runner can execute authorized typed jobs and be revoked.
- **v1.0:** Reliable team deployment with permissions, limits, audit, recovery, documentation, and operational readiness.
- **v1.1–v1.4:** Visual workflows, integrations, parallel agents/repository context, and end-to-end verification.
- **v2.0:** At least one well-defined non-coding workflow uses the same contracts, policies, execution adapters, and retention controls.
