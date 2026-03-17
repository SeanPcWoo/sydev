---
status: complete
phase: 02-template-config
source: 02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md
started: 2026-03-15T11:00:00Z
updated: 2026-03-15T13:25:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Template Save
expected: Run `npx sydev template save`. CLI prompts for template name and type. After entering details, template is saved and confirmation message is shown.
result: issue
reported: "选择 full 类型后，结果只保存了 workspace，projects 和 devices 没有包含"
severity: major

### 2. Template List
expected: Run `npx sydev template list`. CLI displays a list of saved templates with name, type, and creation date.
result: pass

### 3. Template Apply with Partial Selection
expected: Run `npx sydev template apply` on a "full" type template. CLI shows inquirer checkbox allowing selection of which parts (workspace/projects/devices) to apply. Only selected parts are applied.
result: pass

### 4. Template Delete
expected: Run `npx sydev template delete <name>`. The template is removed. Running `template list` no longer shows it.
result: pass

### 5. Template Export and Import
expected: Run `npx sydev template export -o file.json` to export a template to JSON. Then `npx sydev template import file.json` to import it back. The round-trip preserves template content.
result: pass

### 6. Init with Config File
expected: Create a valid JSON config file and run `npx sydev init --config config.json`. The orchestrator executes workspace -> projects -> devices in sequence with ora spinner showing progress for each step.
result: pass

### 7. Template Conflict Handling
expected: Save a template, then save another with the same name. CLI prompts with overwrite/rename/cancel options. Choosing overwrite replaces the template; rename prompts for new name; cancel aborts.
result: pass

### 8. Init Fail-Fast on Invalid Config
expected: Run `npx sydev init --config invalid.json` with a malformed or schema-invalid JSON file. CLI shows a validation error message before prompting for paths and does not attempt execution.
result: pass

## Summary

total: 8
passed: 7
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Selecting full template type saves workspace + projects + devices"
  status: fixed
  reason: "User reported: 选择 full 类型后，结果只保存了 workspace，projects 和 devices 没有包含"
  severity: major
  test: 1
  artifacts: []
  missing: []
