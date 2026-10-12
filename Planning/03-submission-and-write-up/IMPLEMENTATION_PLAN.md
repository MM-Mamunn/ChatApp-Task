# Part 3: Submission, Verification, and Thought Process

## Scope

Package the verified work from Parts 1 and 2 into a reproducible submission and write the concise, honest thought-process document required by the assignment.

## Completion rule

Complete a step only after its stated verification succeeds and record the evidence in `../PROJECT_PROGRESS.md`.

| Step | Implement | Depends on | Expected outcome | Verify |
| --- | --- | --- | --- | --- |
| 3.1 | Run the final verification matrix: build, lint/type checks, API behavior, user/admin permissions, chat persistence, realtime isolation, security/error cases, responsive UI, and both deployed URLs. | Parts 1 and 2 | Evidence for the final submission state, including failures or unverified areas. | Save only reproducible commands/results; rerun critical checks after final changes. |
| 3.2 | Complete the README: prerequisites, environment variables via `.env.example`, Supabase setup/migrations, local run/test commands, API documentation link, deployment links, and user/admin test-account instructions or creation steps. | 3.1 | A reviewer can set up and evaluate the project without guessing. | Follow the README in a clean environment or perform a line-by-line reproducibility review. |
| 3.3 | Write the Part 3 thought-process section in the README or a linked document: architecture/library choices, Supabase trade-offs, security decisions, Part 2 design reasoning, AI-tool use and human verification, improvements with more time, and known issues. | 3.1, 3.2 | A concise, factual rationale tied to what was actually built. | Compare every claim with code, deployment, and recorded verification results. |
| 3.4 | Perform a secret and repository review: confirm `.env` is ignored, `.env.example` has placeholders only, required `.agents/skills/` files are included, and no generated/private credentials are staged. | 3.2, 3.3 | A safe, complete repository ready to share. | Inspect Git status/diff and scan tracked content for credential-like values. |
| 3.5 | Finalize submission details: repository access, both functioning demo URLs, handoff note, and a final progress-file entry with exact verification status and unresolved limitations. | 3.1-3.4 | Reviewers receive a clear, accurate final submission. | Open repository and both URLs as a reviewer would. |

## Guardrails

- The write-up must be a record of real choices and checks, not a generic retrospective.
- Never report a check, deployment, role, or demo account as complete without direct verification.
- Keep limitations visible; an honest pending issue is preferable to an unsupported claim.
