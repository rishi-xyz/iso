# Iso — Product Idea

> **Working title:** Iso. Check name, domain, package, and trademark availability before public launch.  
> **Status:** Product direction for hackathon MVP through v2.0.  
> **Core thesis:** Build a reusable agent workflow engine, then prove its value through one concrete built-in workflow: investigating failed CI and helping developers verify repairs.

## 1. One-line pitch

Iso is an event-driven AI engineering platform that turns repository events into controlled, evidence-backed workflows. It starts by investigating failed CI runs with NVIDIA Nemotron through Nebius Token Factory, then expands into verified repairs, security maintenance, custom workflows, and private execution on customer-controlled runners.

## 2. Product in one paragraph

When a GitHub Actions build fails, Iso collects the relevant failure logs and code context, asks a Nemotron model to diagnose the likely cause, and posts an actionable report with evidence. In later releases, it can propose a patch, open a draft pull request under repository policy, and use the repository's existing CI checks to determine whether the candidate fix passes. The same workflow engine later powers pull-request checks, scheduled security scans, dependency maintenance, and user-defined automations. Iso uses Nebius Token Factory for model inference; early code execution remains in the repository owner's GitHub Actions environment, so the product does not depend on Nebius AI Cloud credits.

## 3. The problem

Engineering teams already use CI, pull-request reviews, static analysis, dependency scanners, and coding assistants. The gap is often between detecting a failure and closing the loop:

- CI identifies a failed step but leaves a developer to interpret long logs and find the cause.
- AI code review can produce plausible comments without demonstrating that the issue occurs.
- Coding agents may edit code, but safe execution, permissions, approvals, and verification are often separate concerns.
- Security scanners can produce many findings without enough contextual triage or a safe remediation path.
- Teams need to choose where workflows execute, what context reaches a model provider, which actions agents may take, and what data the platform retains.

## 4. Product thesis

The important loop is:

**Event → Context → Analyze → Propose action → Execute through an authorized adapter → Verify → Report evidence.**

An LLM helps interpret information and propose actions. Deterministic systems such as GitHub checks, test runners, compilers, linters, dependency scanners, and policy evaluators provide the evidence. A model response alone must never mark a failure as reproduced or a fix as verified.

Iso is both:

1. **A useful developer product:** a CI Failure Investigator that works on a real repository.
2. **A reusable automation platform:** a workflow engine with normalized triggers, typed steps, execution adapters, policies, retries, approvals, and audit history.

The built-in CI investigation workflow is the first workflow running on the engine; it is not a separate one-off implementation that must be rewritten later.

## 5. Target users

### Initial users

- Solo developers and open-source maintainers using GitHub Actions.
- Small engineering teams that want quicker diagnosis of broken builds.
- Developers who want AI-assisted investigation but want changes to remain reviewable and testable.

### Later users

- Platform engineering teams that need standardized engineering workflows.
- Security engineers maintaining dependency and static-analysis findings.
- Teams that need self-hosted runners, custom model endpoints, stricter retention, or private execution.
- Developers building specialized agents on top of a general-purpose execution and workflow API.

### Not the initial target

General consumer agents, video-editing agents, and arbitrary desktop automation. They may become v2 workloads, but they should not compete with the engineering use case during the first releases.

## 6. Product principles

1. **Evidence over confidence:** report what was observed and what remains uncertain.
2. **The workflow engine is foundational:** every run has a versioned definition, state, steps, policy, and result.
3. **Execution is replaceable:** use GitHub-hosted Actions first; add customer-managed runners later.
4. **Default to least privilege:** read-only analysis first; writes require configured permissions and may require approval.
5. **The model is not a security boundary:** validate outputs and enforce access in code and infrastructure.
6. **Privacy claims must be measurable:** state what is sent to inference, what is retained, where execution occurs, and how cleanup works.
7. **Ship narrow, expand through reuse:** one excellent workflow is better than a broad but unreliable agent marketplace.

## 7. Initial user experience

A developer connects GitHub, selects a repository, and enables Iso's **CI Failure Investigator**. When a supported GitHub Actions workflow fails, Iso retrieves the relevant logs and metadata, gathers the associated commit and limited code context, sends only the necessary context to the configured NVIDIA open-source model through Nebius Token Factory, and produces an evidence-backed diagnosis.

The report should show:

- Which workflow, job, commit, and step failed.
- A concise explanation of the observed error.
- Relevant log excerpts and file/line references where available.
- The model's likely cause, clearly marked as a hypothesis unless validated.
- Suggested investigation steps or a proposed fix in later versions.
- Whether a candidate patch passed the repository's configured CI checks.
- Model, run, and retention metadata that helps a developer audit the result.

## 8. Differentiation

Iso should not compete solely on being another AI code reviewer or another generic workflow builder. Its intended differentiation is the combination of:

- **Composable engineering workflows:** the initial failure-investigation workflow uses the same core engine as later workflows.
- **Execution flexibility:** early runs use the customer's existing GitHub Actions environment; later versions can use self-hosted runners.
- **Evidence-first repair:** findings and fixes have explicit states such as suspected, reproduced, proposed, verified, or inconclusive.
- **Controlled autonomy:** policy gates decide whether an agent may read, propose a patch, open a draft PR, or take another action.
- **Auditability:** events, workflow versions, model IDs, steps, evidence references, approvals, and outcomes are linked to a run.

These are product hypotheses that must be tested with users; they are not a claim that no competitor offers overlapping features.

## 9. Model and infrastructure strategy

### Hackathon constraint

- Use an NVIDIA open-source model available through Nebius Token Factory for core AI behavior.
- Do not require Nebius AI Cloud credits for early releases.
- Use GitHub Actions for build/test execution and for validating candidate patches.
- Keep the model provider behind a gateway so supported compatible endpoints can be added later.
- Verify the hackathon track's interpretation of the requirement about writing/running/testing code in Token Factory with the organizers. The planned early design uses Token Factory for inference and GitHub Actions for execution.

### Model responsibilities

- Diagnose error logs and changed code.
- Explain evidence and candidate causes.
- Suggest targeted checks and minimal patches.
- Classify findings using a strict schema.
- Later, assist with security triage and workflow planning.

### Deterministic responsibilities

- Webhook signature verification and event authorization.
- Retrieving checks and logs.
- Running policy checks, validating patches, and enforcing budgets.
- Dispatching permitted GitHub Actions workflows.
- Determining whether checks passed and whether an action is allowed.

## 10. Roadmap overview

| Release | Product milestone | Key outcome |
|---|---|---|
| **v0.1** | CI Failure Investigator | Diagnose failed GitHub Actions runs and post evidence-backed reports. |
| **v0.2** | Repair loop | Propose bounded patches, open draft PRs under policy, and verify using normal CI. |
| **v0.3** | Security and maintenance workflows | Scheduled scans, dependency alerts, secret detection, and triage. |
| **v0.4** | User-defined workflow engine | Validated YAML workflows, conditions, reusable steps, retries, and approvals. |
| **v0.5** | Customer-controlled execution | Local/self-hosted runner adapters and configurable tool/network policies. |
| **v1.0** | Production engineering automation | Reliable run processing, team controls, quotas, auditing, and documented security. |
| **v1.1** | Visual workflow editor | UI to create workflows backed by the existing workflow schema. |
| **v1.2** | Integrations | GitLab and selected issue/chat integrations based on demand. |
| **v1.3** | Multi-agent and reusable context | Coordinated specialists and scoped repository knowledge. |
| **v1.4** | Deeper verification | Preview environments and end-to-end testing where supported. |
| **v2.0** | General-purpose private agent workflows | Extend adapters and policy model beyond coding to selected document, data, or media tasks. |

## 11. What v0.1 will not do

- Run arbitrary repository code on Iso's own application servers.
- Depend on a Nebius AI Cloud VM, GPU, or paid sandbox pool.
- Automatically push unreviewed changes or merge pull requests.
- Promise that every bug can be reproduced or every generated patch is correct.
- Provide a visual workflow editor or unrestricted custom workflow language.
- Support every Git provider, language, build system, or model provider.
- Claim instant or complete deletion across third-party model, CI, log, and backup systems without verified evidence.

## 12. Success measures

Early measurements should include:

- Percentage of supported failed runs that produce a useful diagnosis.
- Developer rating of diagnosis usefulness.
- Time from workflow failure to first actionable report.
- False or unsupported claim rate in generated reports.
- For v0.2, candidate patch CI pass rate and developer acceptance rate.
- Cost per completed run, split into model usage and external CI execution.
- Duplicate-run rate, webhook processing reliability, and cleanup/retention-policy compliance.

Do not optimize for the number of tokens used, comments posted, or agents spawned. Optimize for time saved and verified outcomes.
