---
name: review
description: Review existing code to verify it follows CLAUDE.md rules and the architecture patterns defined for this project.
user-invocable: true
disable-model-invocation: false
---

# Code Review — Nehemiah

Review the existing codebase to verify all code follows the conventions, architecture, and rules defined in CLAUDE.md.

## How to Review

1. Read `CLAUDE.md` to load all project rules and conventions
2. Read through the current source files in `backend/src/` and `frontend/src/`
3. Do NOT use git operations (`git diff`, `git log`, `git status`, etc.) — review the code as it stands
4. For every file, check that it follows the patterns and rules from CLAUDE.md
5. Report findings organized by severity

## What to Check

- Code follows the **architecture patterns** defined in CLAUDE.md (repository pattern, module structure, layering, state management, forms, components)
- Frontend **component and file structure** matches CLAUDE.md (feature modules in `src/features/<name>/`, components split into `ui/`, `layout/`, `shared/`, App Router route groups, etc.)
- Code follows the **code style** rules in CLAUDE.md
- Code follows the **security** practices in CLAUDE.md (DTO validation, no hardcoded secrets, etc.)
- No **DRY violations** — shared logic is extracted, no copy-paste across modules
- **Tests exist** where CLAUDE.md expects them and they mock the right layer
- Nothing in the **Common Pitfalls** section of CLAUDE.md is being violated

## Output Format

Organize findings by severity:

### 1. CRITICAL — Bugs, security issues, broken functionality
### 2. CLAUDE.md VIOLATIONS — Code that breaks rules defined in CLAUDE.md
### 3. ARCHITECTURE — Layering or pattern issues
### 4. DRY VIOLATIONS — Duplicate code that should be extracted
### 5. BEST PRACTICE — Quality improvements
### 6. MISSING TESTS — Gaps ranked by risk

For each finding include:
- **File**: path and line number
- **Issue**: what's wrong
- **Fix**: how to resolve it
