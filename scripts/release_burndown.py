#!/usr/bin/env python3
"""
GitHub Projects Release Burndown Chart Generator
Uses the `gh` CLI (must be authenticated) to query GitHub Projects v2.
Supports both user projects and org projects.

Usage (user project):
    python burndown.py \
        --owner camila1973 \
        --project-number 1 \
        --points-field "Story Points" \
        --iterations "Sprint 1" "Sprint 2" "Sprint 3"

Usage (org project):
    python burndown.py \
        --owner my-org \
        --org \
        --project-number 1 \
        --points-field "Story Points" \
        --iterations "Sprint 1" "Sprint 2" "Sprint 3"

Optional flags:
    --iteration-field "Iteration"   field name for iterations (default: "Iteration")
    --status-field "Status"         field name for status (default: "Status")
    --done-value "Done"             status value meaning done (default: "Done")
    --output burndown.html          output file path (default: burndown.html)
"""

import argparse
import json
import subprocess
import sys
from string import Template


# ---------------------------------------------------------------------------
# gh CLI helper
# ---------------------------------------------------------------------------

def gh_graphql(query: str, variables: dict) -> dict:
    payload = json.dumps({"query": query, "variables": variables})
    result = subprocess.run(
        ["gh", "api", "graphql", "--input", "-"],
        input=payload,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"gh CLI error:\n{result.stderr}", file=sys.stderr)
        sys.exit(1)

    data = json.loads(result.stdout)
    if "errors" in data:
        print(f"GraphQL errors:\n{json.dumps(data['errors'], indent=2)}", file=sys.stderr)
        sys.exit(1)

    return data["data"]


# ---------------------------------------------------------------------------
# Data fetching
# ---------------------------------------------------------------------------

def fetch_project_id(owner: str, project_number: int, is_org: bool) -> tuple:
    if is_org:
        query = """
        query($owner: String!, $number: Int!) {
          organization(login: $owner) {
            projectV2(number: $number) { id title }
          }
        }
        """
        data = gh_graphql(query, {"owner": owner, "number": project_number})
        project = data["organization"]["projectV2"]
    else:
        query = """
        query($owner: String!, $number: Int!) {
          user(login: $owner) {
            projectV2(number: $number) { id title }
          }
        }
        """
        data = gh_graphql(query, {"owner": owner, "number": project_number})
        project = data["user"]["projectV2"]

    return project["id"], project["title"]


def fetch_all_items(project_id: str) -> list:
    query = """
    query($projectId: ID!, $cursor: String) {
      node(id: $projectId) {
        ... on ProjectV2 {
          items(first: 100, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes {
              content {
                ... on Issue {
                  title
                  url
                  number
                }
                ... on DraftIssue {
                  title
                }
              }
              fieldValues(first: 20) {
                nodes {
                  ... on ProjectV2ItemFieldNumberValue {
                    field { ... on ProjectV2FieldCommon { name } }
                    number
                  }
                  ... on ProjectV2ItemFieldIterationValue {
                    field { ... on ProjectV2FieldCommon { name } }
                    title
                  }
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    field { ... on ProjectV2FieldCommon { name } }
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
    """
    items = []
    cursor = None

    while True:
        variables = {"projectId": project_id}
        if cursor:
            variables["cursor"] = cursor

        data = gh_graphql(query, variables)
        page = data["node"]["items"]
        items.extend(page["nodes"])
        print(f"  Fetched {len(items)} items...", end="\r")

        if not page["pageInfo"]["hasNextPage"]:
            break
        cursor = page["pageInfo"]["endCursor"]

    print()
    return items


# ---------------------------------------------------------------------------
# Data processing
# ---------------------------------------------------------------------------

def parse_items(items, points_field, iteration_field, status_field, done_value):
    iteration_data = {}
    # issues_by_iteration: { iteration_title: [ {title, url, number, points, status} ] }
    issues_by_iteration = {}

    for item in items:
        fields = item.get("fieldValues", {}).get("nodes", [])
        content = item.get("content", {}) or {}
        points = None
        iteration = None
        status = None

        for f in fields:
            if not f:
                continue
            field_name = f.get("field", {}).get("name", "")
            if field_name == points_field:
                points = f.get("number")
            elif field_name == iteration_field:
                iteration = f.get("title")
            elif field_name == status_field:
                status = f.get("name", "")

        if iteration is None or points is None:
            continue

        if iteration not in iteration_data:
            iteration_data[iteration] = {"total": 0, "done": 0}
        if iteration not in issues_by_iteration:
            issues_by_iteration[iteration] = []

        iteration_data[iteration]["total"] += points
        if status and status.lower() == done_value.lower():
            iteration_data[iteration]["done"] += points

        issues_by_iteration[iteration].append({
            "title": content.get("title", "(Draft)"),
            "url": content.get("url", ""),
            "number": content.get("number", ""),
            "points": points,
            "status": status or "",
        })

    return iteration_data, issues_by_iteration


def compute_burndown(iteration_data, selected_iterations):
    ordered = []
    for it in selected_iterations:
        if it not in iteration_data:
            print(f"  Warning: '{it}' not found. Available: {list(iteration_data.keys())}")
            continue
        ordered.append((it, iteration_data[it]))

    if not ordered:
        print("No matching iterations found. Check names match exactly.", file=sys.stderr)
        sys.exit(1)

    total = sum(d["total"] for _, d in ordered)
    print(f"  Total story points: {total}")

    labels = ["Start"] + [name for name, _ in ordered]
    actual = [total]
    remaining = total

    for name, d in ordered:
        remaining -= d["done"]
        actual.append(remaining)
        print(f"  After '{name}': -{d['done']} pts completed -> {remaining} remaining")

    ideal = [round(total - (total / len(ordered)) * i, 1) for i in range(len(ordered) + 1)]

    return {
        "labels": labels,
        "actual": actual,
        "ideal": ideal,
        "total": total,
        "iterations": len(ordered),
    }


# ---------------------------------------------------------------------------
# HTML output
# ---------------------------------------------------------------------------

HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Release Burndown</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@300;400;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0d1117;
    color: #e6edf3;
    font-family: 'IBM Plex Sans', sans-serif;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }
  .card {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 2rem 2.5rem;
    width: 100%;
    max-width: 860px;
  }
  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 2rem;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .title-block h1 {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 1.1rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .title-block p {
    font-size: 0.78rem;
    color: #8b949e;
    margin-top: 0.25rem;
    font-family: 'IBM Plex Mono', monospace;
  }
  .stats { display: flex; gap: 1.5rem; flex-wrap: wrap; }
  .stat { text-align: right; }
  .stat-value {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1;
  }
  .stat-label {
    font-size: 0.68rem;
    color: #8b949e;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-top: 0.2rem;
  }
  .chart-wrap { position: relative; height: 380px; }
  .legend {
    display: flex;
    gap: 1.5rem;
    margin-top: 1.25rem;
    justify-content: center;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
    color: #8b949e;
    font-family: 'IBM Plex Mono', monospace;
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  footer {
    margin-top: 1.25rem;
    font-size: 0.68rem;
    color: #484f58;
    font-family: 'IBM Plex Mono', monospace;
    text-align: center;
  }

  .issues-section {
    width: 100%;
    max-width: 860px;
    margin-top: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .iteration-group {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    overflow: hidden;
  }

  .iteration-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.25rem;
    background: #1c2128;
    border-bottom: 1px solid #30363d;
  }

  .iteration-name {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.82rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #e6edf3;
  }

  .iteration-meta {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.72rem;
    color: #8b949e;
  }

  .issues-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }

  .issues-table thead tr {
    border-bottom: 1px solid #30363d;
  }

  .issues-table th {
    padding: 0.5rem 1.25rem;
    text-align: left;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #8b949e;
  }

  .issues-table td {
    padding: 0.6rem 1.25rem;
    border-bottom: 1px solid #21262d;
    color: #e6edf3;
    vertical-align: middle;
  }

  .issues-table tr:last-child td { border-bottom: none; }

  .issues-table tr.done td { opacity: 0.45; }

  .issue-num {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.72rem;
    color: #8b949e;
    white-space: nowrap;
    width: 3rem;
  }

  .issue-title a {
    color: #58a6ff;
    text-decoration: none;
  }
  .issue-title a:hover { text-decoration: underline; }

  .issue-pts {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.78rem;
    color: #8b949e;
    text-align: right;
    white-space: nowrap;
    width: 4rem;
  }

  .status-badge {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    border-radius: 20px;
    font-size: 0.68rem;
    font-family: 'IBM Plex Mono', monospace;
    background: #21262d;
    color: #8b949e;
    border: 1px solid #30363d;
    white-space: nowrap;
  }
</style>
</head>
<body>
<div class="card">
  <header>
    <div class="title-block">
      <h1>Release Burndown</h1>
      <p>{{project_title}} &mdash; {{iteration_count}} iterations</p>
    </div>
    <div class="stats">
      <div class="stat">
        <div class="stat-value">{{total_pts}}</div>
        <div class="stat-label">Total pts</div>
      </div>
      <div class="stat">
        <div class="stat-value">{{remaining_pts}}</div>
        <div class="stat-label">Remaining</div>
      </div>
      <div class="stat">
        <div class="stat-value">{{pct_done}}%</div>
        <div class="stat-label">Complete</div>
      </div>
    </div>
  </header>
  <div class="chart-wrap">
    <canvas id="burndown"></canvas>
  </div>
  <div class="legend">
    <div class="legend-item"><span class="dot" style="background:#3fb950"></span> Remaining points</div>
  </div>
</div>
<footer>Generated with gh cli &bull; GitHub Projects v2</footer>

{{issues_html}}
<script>
const labels = {{labels}};
const actual = {{actual}};
new Chart(document.getElementById('burndown').getContext('2d'), {
  type: 'line',
  data: {
    labels,
    datasets: [
      {
        label: 'Actual',
        data: actual,
        borderWidth: 2.5,
        pointBorderColor: '#0d1117',
        pointBorderWidth: 2,
        pointRadius: 6,
        tension: 0.1,
        fill: { target: 'origin', above: 'rgba(63,185,80,0.06)' },
        pointBackgroundColor: actual.map(() => '#3fb950'),
        order: 1,
      },
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#161b22',
        borderColor: '#30363d',
        borderWidth: 1,
        titleColor: '#e6edf3',
        bodyColor: '#8b949e',
        titleFont: { family: "'IBM Plex Mono', monospace", size: 12 },
        bodyFont: { family: "'IBM Plex Mono', monospace", size: 11 },
        padding: 12,
        callbacks: { label: ctx => " " + ctx.dataset.label + ": " + ctx.parsed.y + " pts" }
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(48,54,61,0.5)' },
        ticks: { color: '#8b949e', font: { family: "'IBM Plex Mono', monospace", size: 11 } },
        border: { color: '#30363d' },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(48,54,61,0.5)' },
        ticks: {
          color: '#8b949e',
          font: { family: "'IBM Plex Mono', monospace", size: 11 },
          callback: v => v + ' pts',
        },
        border: { color: '#30363d' },
      }
    }
  }
});
</script>
</body>
</html>
"""


def build_issues_html(issues_by_iteration, selected_iterations):
    """Build the issues table HTML grouped by iteration."""
    html = '''<div class="issues-section">\n'''
    for iteration in selected_iterations:
        issues = issues_by_iteration.get(iteration, [])
        if not issues:
            continue
        total_pts = sum(i["points"] for i in issues)
        html += f'''  <div class="iteration-group">
    <div class="iteration-header">
      <span class="iteration-name">{iteration}</span>
      <span class="iteration-meta">{len(issues)} issues &bull; {total_pts} pts</span>
    </div>
    <table class="issues-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Title</th>
          <th>Status</th>
          <th>Points</th>
        </tr>
      </thead>
      <tbody>\n'''
        for issue in sorted(issues, key=lambda x: x.get("number") or 0):
            num = f'#{issue["number"]}' if issue["number"] else "-"
            title = issue["title"]
            url = issue["url"]
            status = issue["status"]
            pts = issue["points"]
            title_cell = f'<a href="{url}" target="_blank">{title}</a>' if url else title
            done_class = " done" if status.lower() in ("done", "hecho", "completado", "cerrado", "closed") else ""
            html += f'''        <tr class="{done_class}">
          <td class="issue-num">{num}</td>
          <td class="issue-title">{title_cell}</td>
          <td class="issue-status"><span class="status-badge">{status}</span></td>
          <td class="issue-pts">{pts}</td>
        </tr>\n'''
        html += '''      </tbody>
    </table>
  </div>\n'''
    html += '''</div>\n'''
    return html


def generate_html(burndown, project_title, output_path, issues_by_iteration, selected_iterations):
    remaining = burndown["actual"][-1]
    total = burndown["total"]
    pct_done = round((total - remaining) / total * 100) if total > 0 else 0

    issues_html = build_issues_html(issues_by_iteration, selected_iterations)

    html = HTML_TEMPLATE
    html = html.replace("{{project_title}}", str(project_title))
    html = html.replace("{{iteration_count}}", str(burndown["iterations"]))
    html = html.replace("{{total_pts}}", str(total))
    html = html.replace("{{remaining_pts}}", str(remaining))
    html = html.replace("{{pct_done}}", str(pct_done))
    html = html.replace("{{labels}}", json.dumps(burndown["labels"]))
    html = html.replace("{{actual}}", json.dumps(burndown["actual"]))
    html = html.replace("{{ideal}}", json.dumps(burndown["ideal"]))
    html = html.replace("{{issues_html}}", issues_html)

    with open(output_path, "w") as f:
        f.write(html)

    print(f"  Saved: {output_path}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Release Burndown Chart via gh CLI")
    parser.add_argument("--owner", required=True, help="GitHub username or org login")
    parser.add_argument("--project-number", type=int, required=True, help="Project number from URL")
    parser.add_argument("--org", action="store_true", help="Set this flag if owner is an org (default: user)")
    parser.add_argument("--points-field", default="Story Points", help="Numeric points field name")
    parser.add_argument("--iteration-field", default="Iteration", help="Iteration field name")
    parser.add_argument("--status-field", default="Status", help="Status field name")
    parser.add_argument("--done-value", default="Done", help="Status value that counts as done")
    parser.add_argument("--iterations", nargs="+", required=True, help="Ordered iteration titles")
    parser.add_argument("--output", default="burndown.html", help="Output HTML file")
    args = parser.parse_args()

    # Verify gh is authenticated
    check = subprocess.run(["gh", "auth", "status"], capture_output=True, text=True)
    if check.returncode != 0:
        print("Error: gh CLI is not authenticated. Run `gh auth login` first.", file=sys.stderr)
        sys.exit(1)

    owner_type = "org" if args.org else "user"
    print(f"\nFetching project #{args.project_number} from {owner_type} '{args.owner}'...")
    project_id, project_title = fetch_project_id(args.owner, args.project_number, is_org=args.org)
    print(f"  Project: {project_title}")

    print(f"\nFetching all items (paginated)...")
    items = fetch_all_items(project_id)
    print(f"  Total items: {len(items)}")

    print(f"\nParsing story points...")
    iteration_data, issues_by_iteration = parse_items(
        items,
        points_field=args.points_field,
        iteration_field=args.iteration_field,
        status_field=args.status_field,
        done_value=args.done_value,
    )

    if not iteration_data:
        print(
            f"\nNo data found. Verify these match your project's field names exactly:\n"
            f"  --points-field '{args.points_field}'\n"
            f"  --iteration-field '{args.iteration_field}'",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"  Iterations found: {list(iteration_data.keys())}")

    # Show unique status values to help debug --done-value
    statuses = set()
    for item in items:
        for f in item.get("fieldValues", {}).get("nodes", []):
            if f and f.get("field", {}).get("name", "") == args.status_field:
                statuses.add(f.get("name", ""))
    print(f"  Status values found: {sorted(statuses)}")

    print(f"\nComputing burndown...")
    burndown = compute_burndown(iteration_data, args.iterations)

    print(f"\nGenerating HTML chart...")
    generate_html(burndown, project_title, args.output, issues_by_iteration, args.iterations)

    print("\nDone! Open burndown.html in your browser.")


if __name__ == "__main__":
    main()
