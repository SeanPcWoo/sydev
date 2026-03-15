---
status: testing
phase: 02-template-config
source: 02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md
started: 2026-03-15T11:00:00Z
updated: 2026-03-15T11:30:00Z
---

## Current Test

number: 2
name: Template List
expected: |
  Run `npx tsx apps/cli/src/index.ts template list`. CLI displays a list of saved templates with name, type, and creation date.
awaiting: user response

## Tests

### 1. Template Save
expected: Run `npx sydev template save`. CLI prompts for template name and type. After entering details, template is saved and confirmation message is shown.
result: issue
reported: "选择 full 类型后，结果只保存了 workspace，projects 和 devices 没有包含"
severity: major

### 2. Template List
expected: Run `npx sydev template list`. CLI displays a list of saved templates with name, type, and creation date.
result: [pending]

### 3. Template Apply with Partial Selection
expected: Run `npx sydev template apply` on a "full" type template. CLI shows inquirer checkbox allowing selection of which parts (workspace/projects/devices) to apply. Only selected parts are applied.
result: [pending]

### 4. Template Delete
expected: Run `npx sydev template delete <name>`. The template is removed. Running `template list` no longer shows it.
result: [pending]

### 5. Template Export and Import
expected: Run `npx sydev template export <name> -o file.json` to export a template to JSON. Then `npx sydev template import file.json` to import it back. The round-trip preserves template content.
result: [pending]

### 6. Init with Config File
expected: Create a valid JSON config file and run `npx sydev init --config config.json`. The orchestrator executes workspace -> projects -> devices in sequence with ora spinner showing progress for each step.
result: [pending]

### 7. Template Conflict Handling
expected: Save a template, then save another with the same name. CLI prompts with overwrite/rename/cancel options. Choosing overwrite replaces the template; rename prompts for new name; cancel aborts.
result: [pending]

### 8. Init Fail-Fast on Invalid Config
expected: Run `npx sydev init --config invalid.json` with a malformed or schema-invalid JSON file. CLI shows a validation error message and does not attempt execution.
result: [pending]

## Summary

total: 8
passed: 0
issues: 1
pending: 7
skipped: 0

## Gaps

- truth: "Selecting full template type saves workspace + projects + devices"
  status: failed
  reason: "User reported: 选择 full 类型后，结果只保存了 workspace，projects 和 devices 没有包含"
  severity: major
  test: 1
  artifacts: []
  missing: []
