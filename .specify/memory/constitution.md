<!--
  SYNC IMPACT REPORT
  Version change: [unversioned template] → 1.0.0
  Modified principles: N/A — initial population from blank template
  Added sections:
    - Core Principles: I. Simplicity, II. Maintainability, III. Documentation, IV. Code Quality
    - Quality Gates
    - Development Workflow
    - Governance
  Removed sections: N/A
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ — Constitution Check section is feature-driven; no structural change needed
    - .specify/templates/spec-template.md ✅ — No direct principle references; compatible as-is
    - .specify/templates/tasks-template.md ✅ — Phase N documentation tasks align with Documentation principle
    - .specify/templates/agent-file-template.md ✅ — No principle references; compatible as-is
  Follow-up TODOs: None — all placeholders resolved.
-->

# RoadReport Constitution

## Core Principles

### I. Simplicity

Every solution MUST use the minimum complexity required to meet the stated requirements.
Abstractions, layers, and indirection MUST be justified by a concrete current need — not
anticipated future needs. YAGNI (You Aren't Gonna Need It) is a hard constraint, not a
suggestion.

- Code MUST NOT introduce premature abstractions, helpers, or utilities for one-time operations.
- Features MUST be implemented in the fewest files and components that achieve correctness.
- When two approaches of differing complexity achieve the same goal, the simpler approach MUST
  be chosen unless a specific, documented reason exists.
- Dependencies MUST be added only when they provide substantial value; in-house solutions are
  preferred for small, focused operations.

**Rationale**: Complexity is the primary driver of bugs, maintenance burden, and onboarding
friction. The cost of added complexity is always higher than it appears at the time of writing.

### II. Maintainability

Code MUST be written so that any contributor can understand, modify, and extend it without
requiring deep familiarity with its original author's intent.

- Functions and modules MUST follow the Single Responsibility Principle: one clear, nameable
  purpose each.
- Code MUST NOT rely on implicit global state or side-effectful initialization flows unless
  unavoidable and clearly documented.
- Naming MUST be explicit and self-descriptive; abbreviations and single-letter identifiers
  are prohibited outside of accepted conventions (e.g., loop indices).
- Refactoring MUST preserve existing behavior; structural changes and behavioral changes MUST
  be in separate commits.
- Dead code MUST be removed rather than commented out.

**Rationale**: Code is read far more than it is written. Maintainability directly determines
the long-term velocity and health of the project.

### III. Documentation

All public interfaces, non-trivial logic, and architectural decisions MUST be documented at
the point of definition. Documentation is a first-class deliverable, not an afterthought.

- Public APIs, exported functions, and module entry points MUST include docstrings or inline
  documentation explaining purpose, parameters, return values, and failure modes.
- Non-obvious logic — including business rules, workarounds, and performance-sensitive paths —
  MUST include an inline comment explaining the "why," not the "what."
- Architectural decisions MUST be captured in a decision record (ADR or equivalent) when they
  affect more than one module.
- READMEs and quickstart guides MUST be updated as part of feature delivery, not as a follow-up.
- Outdated documentation is treated as a defect and MUST be corrected before a feature is
  considered complete.

**Rationale**: Undocumented systems accumulate tribal knowledge that becomes a single point of
failure. Good documentation enables parallel work, faster onboarding, and confident refactoring.

### IV. Code Quality

All code MUST meet a consistent quality bar before it is merged. Quality is defined by
correctness, readability, and conformance to the codebase's established conventions.

- Linting and formatting tools MUST be configured and enforced in CI; no merge is permitted
  with outstanding lint errors.
- Code review MUST verify that changes are correct, readable, and consistent with existing
  conventions — not merely functional.
- Tests MUST cover the behavior described in acceptance criteria; coverage of happy paths alone
  is insufficient.
- Error handling MUST be explicit: silent failures, swallowed exceptions, and unlogged errors
  are prohibited.
- Security-sensitive paths (authentication, authorization, input validation, data persistence)
  MUST receive dedicated review attention.

**Rationale**: Quality debt compounds. A consistent quality bar reduces the cost of every future
change and prevents the codebase from degrading into a system only its original author can safely
modify.

## Quality Gates

Every feature MUST pass the following gates before it is considered deliverable:

1. **Simplicity Check**: No unexplained abstractions or dependencies introduced. Complexity
   Tracking table completed in plan.md for any violations.
2. **Documentation Check**: All public interfaces documented; quickstart.md updated; new
   architectural decisions recorded.
3. **Code Quality Check**: Linter passes with zero errors; code review complete;
   acceptance-criteria tests pass.
4. **Maintainability Check**: No dead code; naming is explicit; no unjustified implicit
   global state introduced.

Gates MUST be evaluated at planning time (Constitution Check in plan.md) and re-evaluated
at the pull-request review stage.

## Development Workflow

- Features MUST be scoped and specified before implementation begins (spec.md → plan.md →
  tasks.md).
- Each user story MUST be independently implementable, testable, and demonstrable.
- Tasks MUST be committed after each logical unit of work to enable granular rollback.
- The Polish phase MUST include a documentation pass; documentation updates are not optional.
- Complexity violations discovered during implementation MUST be logged in the plan.md
  Complexity Tracking table before proceeding.

## Governance

This constitution supersedes all other project practices where conflicts exist. All contributors
are expected to understand and apply these principles in every review, planning session, and
implementation decision.

**Amendment procedure**:
1. Propose the amendment in writing, citing the principle(s) affected and the rationale.
2. Obtain consensus from all active contributors before merging.
3. Update this file, increment the version per the versioning policy below, and record the
   amendment date.
4. Update all dependent templates and guidance files to reflect the change.

**Versioning policy**:
- MAJOR: Removal or redefinition of a principle that changes expected contributor behavior.
- MINOR: Addition of a new principle or material expansion of an existing one.
- PATCH: Clarification, wording refinement, or non-semantic correction.

**Compliance review**: All PRs and design reviews MUST verify adherence to the Core Principles
and Quality Gates defined above. Non-compliance requires explicit documentation and team
sign-off before proceeding.

**Version**: 1.0.0 | **Ratified**: 2026-02-19 | **Last Amended**: 2026-02-19
