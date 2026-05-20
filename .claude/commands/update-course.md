---
description: Orchestrated course content update — synthesise approved feedback proposals into lesson rewrites. Runs the full loop: analyse → plan → ideate → human picks direction → write + review → commit prep.
---

# /update-course — Course Self-Update Orchestrator

This skill handles **minor and major** HITL proposals that require content rewriting. Trivial fixes are handled automatically by `api/apply.js`. This skill picks up where that stops.

---

## Lesson → file map

Use this to locate the file for any `lesson_id`:

| Lessons | File |
|---------|------|
| 1 – 4 | `lessons-1.jsx` |
| 5 – 9, 15 | `lessons-2.jsx` |
| 10 – 11 | `lessons-3.jsx` |
| 12 – 13 | `lessons-4.jsx` |
| 14 | `lessons-5.jsx` |

---

## Phase 1 — Load proposals

### 1a. Read credentials

Read `.env.local` (or check `process.env`) for:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If `.env.local` exists, parse it with Bash:
```bash
grep -E "^SUPABASE" .env.local
```

### 1b. Fetch approved minor/major proposals from Supabase

```bash
curl -s "${SUPABASE_URL}/rest/v1/hitl_proposals?status=eq.approved&severity=in.(minor,major)&order=feedback_count.desc" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json"
```

**If the result is an empty array `[]`:**
Print:
> No approved minor/major proposals found.
>
> Options:
> - Go to the Admin Dashboard → HITL tab and approve proposals first, OR
> - Run synthesis now? (trigger: manual via `POST /api/synthesize`)

Ask the user whether to trigger synthesis or stop. If they say yes, call:
```bash
curl -s -X POST http://localhost:4200/api/synthesize \
  -H "Content-Type: application/json" \
  -d '{"trigger":"manual"}'
```
Then re-fetch proposals. If still empty, stop with a clear message.

**If proposals are found**, print a summary table:
```
Found N approved proposals:
  #  | Lesson | Severity | Type          | Title                    | Feedback
  1  |   5    | major    | structure     | Agents section too dense | 23
  2  |   9    | minor    | clarification | MCP auth unclear         | 11
  ...
```

Ask the user: "Process all N proposals, or enter numbers to select (e.g. 1 3)?"

Proceed with the selected subset.

---

## Phase 2 — Analyse (run in parallel for up to 3 proposals at a time)

For each selected proposal, using the lesson → file map above:

1. **Read the full lesson file** (e.g. `lessons-2.jsx`)
2. **Find the relevant section** — search for the `lesson_id` in the file. Lessons are defined as objects or JSX blocks with an `id` field matching the `lesson_id`.
3. **Extract the lesson's content block** — identify the JSX that renders that lesson's body (the `content` or `render` function/block)
4. **Write a brief analysis** (2–4 bullet points):
   - What currently exists at that location
   - What the proposal asks to change
   - What components are already used there (Quiz, TryIt, Callout, Steps, etc.)
   - Any risk of regression (e.g. removing a Quiz would break progress tracking)

Print each analysis before moving on. Label clearly: `--- Analysis: Lesson N — [title] ---`

---

## Phase 3 — Ideate (3 directions per proposal)

For each proposal, generate exactly **3 directions**. Base them on the analysis.

Format:
```
=== Lesson N: [Proposal Title] ===

Direction A — Minimal
  What changes: [1 sentence]
  Trade-off: [1 sentence — what it doesn't do]

Direction B — Moderate  ← (usually the sweet spot)
  What changes: [1–2 sentences]
  Trade-off: [1 sentence]

Direction C — Ambitious
  What changes: [1–2 sentences]
  Trade-off: [1 sentence — scope/risk]
```

**Direction guidelines:**
- A: Address only the stated problem. No structural changes. Minimal diff.
- B: Rewrite the section with better clarity + one richer example or clarification. May add/replace a `<Callout>` or `<TryIt>`.
- C: Restructure the section, possibly add a new component (`<Quiz>`, `<AgentDiagram>`, `<Steps>`). Bigger diff, higher reward.

**Component catalogue** (from `DESIGN.md` — use only these, don't invent new ones):
- `<HeroCard title="..." subtitle="..." />` — lesson intro card
- `<Callout type="tip|warning|info">...</Callout>` — highlighted note
- `<TryIt prompt="..." />` — hands-on experiment block
- `<Quiz question="..." options={[...]} correct={N} explanation="..." />` — knowledge check
- `<Steps steps={[...]} />` — numbered step list
- `<Terminal lines={[...]} />` — shell command block
- `<ChatMock messages={[...]} />` — Claude conversation mock
- `<CodeBlock lang="..." code="..." />` — syntax-highlighted code
- `<AgentDiagram kind="..." />` — architecture diagram (kinds: augmented-llm, prompt-chain, router, parallel, orchestrator, evaluator, mcp-bus, figma-mcp, course-arch)

---

## Phase 4 — Human checkpoint

After presenting all ideation, ask:

> Which direction for each proposal? Enter as: `1=B 2=A 3=C` (or `all=B` to use B for all, `skip` to skip one).

Wait for the user's answer. Parse their selection. Confirm before writing:
```
Ready to write:
  Lesson 5 → Direction B (Moderate rewrite)
  Lesson 9 → Direction A (Minimal fix)

Proceed? [yes/no]
```

---

## Phase 5 — Write loop

Process proposals **one at a time** (never edit two lesson files simultaneously).

### For each selected proposal + direction:

#### 5a. Write
Edit the relevant `lessons-N.jsx` file using the Edit tool.

**Writing rules:**
- Match the existing tone: direct, practical, first-person plural ("we", "you")
- No em-dashes in prose — use colons or restructure the sentence
- Code examples must use realistic variable names, not `foo`/`bar`
- All JSX components must be self-closing if they have no children (`<TryIt ... />`)
- Do not change lesson `id`, `title`, or `estimatedMinutes` fields
- Do not remove existing `<Quiz>` components (they affect progress tracking)
- If adding a `<Quiz>`, place it at the end of the content block, before any closing tags

#### 5b. Review
After writing, read back the edited section. Check:
- [ ] Addresses the proposal's stated problem
- [ ] Tone is consistent with surrounding lessons (read 10 lines above and below)
- [ ] No JSX syntax errors (balanced tags, correct prop types)
- [ ] Components used correctly (strings for string props, arrays for array props)
- [ ] No accidental removal of progress-tracking elements

If issues found, apply a second Edit pass to fix them.

If after two passes the section still has a structural issue, **do not loop further** — flag it:
> ⚠️ Lesson N needs manual review: [describe issue]. Skipping auto-commit for this one.

#### 5c. Update proposal status in Supabase

```bash
curl -s -X PATCH "${SUPABASE_URL}/rest/v1/hitl_proposals?id=eq.${PROPOSAL_ID}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"status":"applied","reviewed_at":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
```

---

## Phase 6 — Prepare commit

After all proposals are processed:

### 6a. Show the diff
```bash
git diff
```

### 6b. Write a commit message

Follow the project's commit style (imperative, ≤ 72 chars subject, body explains why):

```
Update Lesson N: [brief description of change]

[Body: what changed and why — reference proposal type and feedback count]

HITL proposals: [comma-separated proposal IDs]
Feedback addressed: N learner responses
```

Example:
```
Clarify agents section in Lesson 5 (dense structure, 23 responses)

Rewrote the agents overview with a three-step breakdown and added
a TryIt block so learners can immediately prompt Claude in agent
mode. Addresses recurring confusion about when to use agents vs
direct prompting.

HITL proposals: a1b2c3d4, e5f6g7h8
Feedback addressed: 34 learner responses
```

### 6c. Suggest git commands (do NOT run them — print only)

```
Suggested commands — review the diff above before running:

  git checkout -b content/update-lesson-N-$(date +%Y%m%d)
  git add lessons-N.jsx          # add only the changed files
  git commit -m "[paste message above]"
  # Then open a PR from this branch for team review
```

Print the branch name and commit message in a copy-pasteable block.

---

## Completion summary

After all proposals are done, print:

```
✓ Update-course complete
  Proposals processed: N
  Files changed: [list lesson files]
  Proposals updated in Supabase: [IDs]
  Next step: review the diff above, then run the suggested git commands
```

---

## Notes

- This skill handles only `minor` and `major` proposals. Trivial proposals auto-apply via the Admin Dashboard → HITL tab → "Auto-apply" button.
- If synthesis hasn't run yet, start there: Admin Dashboard → Overview tab → "Synthesize N responses →".
- The Supabase REST API uses `SUPABASE_SERVICE_ROLE_KEY` for write access. Never expose this key in commits.
- To check what's pending after running: Admin Dashboard → HITL tab (filter by `pending`).
