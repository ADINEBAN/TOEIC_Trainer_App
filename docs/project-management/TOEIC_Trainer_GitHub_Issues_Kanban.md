# TOEIC Trainer — Kanban Project Management

Repository: https://github.com/ADINEBAN/TOEIC_Trainer_App

This file is the repository index for the Kanban backlog. Each active Epic/User Story/Task issue contains its goal, implementation checklist, Acceptance Criteria, role owner, milestone suggestion and Definition of Done.

## Workflow

Use the GitHub Project status field with these columns, in order:
1. Backlog
2. Ready
3. In Progress
4. In Review
5. Done

Suggested WIP limits: In Progress <= 5 issues for the team; In Review <= 3.
- Ready: clear scope, testable Acceptance Criteria, owner role, milestone and dependencies.
- In Review: PR is open, linked with `Closes #<issue-number>`; CI is running/passing.
- Done: acceptance criteria met, tests pass, peer approval recorded, PR merged and QA evidence attached.

## Team roles (VKU)

| Code | Role | Main responsibility |
|---|---|---|
| R1 | Project Lead / Project Manager | Overall plan, progress, risks, scope change, stakeholder, evidence package and UAT |
| R2 | Technical Lead / System Architect | Architecture, ERD/API decisions, coding conventions, CI/CD and technical review |
| R3 | Backend Engineer | API, business logic, database, authorization, integrations |
| R4 | Frontend / Mobile Engineer | Responsive UI, user flows, client/API integration, audio and upload interactions |
| R5 | QA & Test Engineer | Test plan/cases, acceptance testing, regression, bug evidence and DoD |

Replace role codes with actual GitHub usernames after the five members are confirmed. The primary owner in each issue is accountable; support roles are noted in the issue body.

## Milestones (create in GitHub and set actual semester dates)

- M1 — Project Foundation: scope baseline, architecture, environment, CI, database foundation and authentication.
- M2 — Core Learning: vocabulary, flashcards and spaced review.
- M3 — AI Learning Features: OCR/image flashcards, semantic network, speaking feedback and document generation.
- M4 — TOEIC Practice & Assessment: Listening, Reading, question bank, mock test, scoring and progress.
- M5 — Release & Acceptance: regression, security/privacy review, deployment, UAT, final report and demo.

Milestone dates are intentionally not invented; R1 should enter dates from the team's semester schedule.

## Labels

This backlog currently uses existing GitHub labels `epic` and `enhancement`. Suggested additional labels to create:
- Types: `type:epic`, `type:user-story`, `type:task`, `type:bug`, `type:documentation`
- Areas: `area:frontend`, `area:backend`, `area:database`, `area:ai`, `area:qa`, `area:devops`, `area:product`
- Priorities: `priority:critical`, `priority:high`, `priority:medium`, `priority:low`
- Special: `status:blocked`, `needs:decision`, `good first issue`

Use Project columns as the source of truth for workflow status; do not duplicate status using labels.

## Active Epic index

- E01 Foundation, architecture & delivery — #1
- E02 Account, authentication & learner profile — #2
- E03 Vocabulary & flashcard learning — #3
- E04 AI image flashcards & semantic network — #4
- E05 Listening practice — #5
- E06 Reading practice & question bank — #6
- E07 AI Speaking practice — #7
- E08 Document-to-TOEIC generation — #10
- E09 Mock test, scoring & analytics — #11
- E10 Quality, deployment, security & acceptance — #12

Duplicate Epic records #8 and #9 were closed; canonical E08 is #10 and canonical E10 is #12.

## Active User Story / Task index

| Epic | Issue | Description |
|---|---:|---|
| E01 | #13 | Define product scope and acceptance baseline |
| E01 | #14 | Repository conventions and contribution workflow |
| E01 | #15 | System architecture and database model |
| E01 | #16 | Automated build, lint and test checks |
| E02 | #17 | Learner registration, login and logout |
| E02 | #18 | Learner profile and TOEIC target |
| E03 | #19 | Browse and search vocabulary |
| E03 | #20 | Saved vocabulary and flashcards |
| E03 | #21 | Spaced repetition review |
| E04 | #22 | Generate flashcards from image |
| E04 | #23 | Semantic vocabulary network |
| E05 | #24 | Listening practice |
| E06 | #25 | Reading practice |
| E06 | #26 | Question bank validation |
| E07 | #27 | Record speaking response |
| E07 | #28 | AI speaking feedback |
| E08 | #29 | Document upload and text extraction |
| E08 | #30 | Generate questions from document |
| E09 | #31 | Timed TOEIC mock test |
| E09 | #33 | Test history and learning progress |
| E09 | #34 | Daily learning goals |
| E10 | #35 | Test plan and regression suite |
| E10 | #36 | Security and privacy checks |
| E10 | #37 | Deploy runnable release |
| E10 | #38 | Stakeholder UAT and project handover |

Duplicate User Story #32 was closed; canonical test-history issue is #33.

## Definition of Ready (DoR)

- Problem/value is clear.
- User Story or Task description is understandable.
- Acceptance Criteria are testable.
- Primary owner role, labels and milestone are recorded.
- Dependencies and external service requirements are identified.
- Scope is small enough to complete and review independently.

## Definition of Done (DoD)

- All Acceptance Criteria are satisfied.
- Code follows agreed conventions and has no known critical regression.
- Relevant unit/integration tests pass.
- PR links the issue and has at least one peer approval.
- Required GitHub Actions checks pass.
- QA verifies the result and attaches evidence where appropriate.
- Documentation/configuration is updated.
- PR is merged and issue is closed.

## PR / commit conventions

Branch examples:
- `feature/issue-<id>-flashcards`
- `fix/issue-<id>-audio-upload`
- `docs/issue-<id>-project-charter`

Commit examples:
- `feat(vocabulary): add flashcard review`
- `fix(auth): validate expired session`
- `test(mock-test): cover timeout submission`
- `docs(project): update acceptance criteria`

PR checklist:
- [ ] Linked Issue (`Closes #<id>`)
- [ ] Summary and screenshots/demo evidence
- [ ] Test steps and results
- [ ] No secrets or personal data
- [ ] Reviewer approval
- [ ] CI checks passed

## VKU evidence package reminder

The course handout calls for a real runnable project, continuous GitHub commit history, Pull Requests and peer review, CI checks, WBS, Risk Register, Scope Change Control, Stakeholder/UAT evidence, final technical report (15–25 pages, 7 chapters), slides and live demo evidence.

Important Kanban/Scrum alignment: the handout specifically mentions Sprint 1 and Final Retrospective evidence. This project uses Kanban, so do not fabricate Sprints. Ask the instructor whether dated Kanban replenishment/flow review records plus a final retrospective are accepted as equivalent, or whether a hybrid cadence is required for grading.
