export const ciFailureInvestigationWorkflow = {
  workflowId: "ci_failure_investigation",
  version: 1,
  name: "CI Failure Investigation",
  enabled: true,
  trigger: {
    type: "github.workflow_run.completed",
    conclusion: "failure",
  },
  steps: [
    { id: "validate_event", type: "validate_event" },
    { id: "collect_run_metadata", type: "collect_run_metadata" },
    { id: "collect_failure_logs", type: "collect_failure_logs" },
    { id: "redact_context", type: "redact_context" },
    { id: "collect_code_context", type: "collect_code_context" },
    { id: "analyze_failure", type: "analyze_failure" },
    { id: "normalize_findings", type: "normalize_findings" },
    { id: "publish_report", type: "publish_report" },
    { id: "finalize_run", type: "finalize_run" },
  ],
  definition: {
    description: "Investigate failed GitHub Actions runs with evidence-backed diagnosis",
  },
};
