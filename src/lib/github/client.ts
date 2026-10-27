export class GitHubClient {
  token: string;
  constructor(token: string) {
    this.token = token;
  }

  async fetchJson(url: string, options: RequestInit = {}) {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API error: ${res.status} ${text}`);
    }
    return res.json();
  }

  async getWorkflowRun(owner: string, repo: string, runId: number) {
    return this.fetchJson(`https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}`);
  }

  async getJobsForRun(owner: string, repo: string, runId: number) {
    return this.fetchJson(`https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/jobs`);
  }

  async getJobLogs(owner: string, repo: string, jobId: number) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`Failed to fetch logs: ${res.status}`);
    return res.text();
  }

  async createCheckRun(owner: string, repo: string, data: any) {
    return this.fetchJson(`https://api.github.com/repos/${owner}/${repo}/check-runs`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async createIssueComment(owner: string, repo: string, issueNumber: number, body: string) {
    return this.fetchJson(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  }
}
