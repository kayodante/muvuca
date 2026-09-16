#!/usr/bin/env node
// Fails if any tracked (or about-to-be-tracked) file contains a pattern
// that should never reach a public repo: a real secret value, or a path
// leaking the author's private machine layout. It also fails on files
// whose *path* marks them as development-only, whatever they contain.
//
// Deliberately pattern-based, not just substring-based, for anything that
// is also a legitimate security term (service_role, sb_secret_): this
// project's own docs need to *name* those concepts in prose to explain why
// they're absent, so a bare-word ban would fail on its own documentation.
// The rules below only fire on the actual shape of a leaked value.

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname } from "node:path";

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".webp",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".pdf",
]);

// This script names the patterns it looks for; that's not a leak.
const SELF_EXEMPT = new Set(["scripts/check-repo-hygiene.mjs"]);

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "out",
  "coverage",
  "playwright-report",
  "test-results",
  ".worktrees",
]);

/** @type {{name: string, pattern: RegExp, hint: string}[]} */
const RULES = [
  {
    name: "windows-local-path",
    // A `file:///` URI with a drive letter is always a leaked local
    // filesystem path. Unix-style `file:///etc/...` is left alone: that
    // shape is legitimate SSRF test payload data (asserting the app
    // blocks the file:// scheme), not a path leak.
    pattern: /file:\/\/\/[A-Za-z]:/,
    hint: "looks like a local Windows file path leaked into a tracked file",
  },
  {
    name: "private-directory-name",
    pattern: /LifeOS/,
    hint: 'references "LifeOS", the author\'s private directory structure',
  },
  {
    name: "supabase-secret-key",
    // Real secret keys carry a real token body; the bare prefix alone
    // (as used when this project's own docs describe the naming
    // convention) does not match.
    pattern: /sb_secret_[A-Za-z0-9_-]{15,}/,
    hint: "looks like a real Supabase secret key value",
  },
  {
    name: "supabase-service-role-value",
    pattern:
      /(service_role["'`]?\s*[:=]\s*["'`]?[A-Za-z0-9._-]{15,}|SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'`]?\S+)/,
    hint: "looks like a service_role key/value assignment",
  },
  {
    name: "supabase-access-token",
    pattern: /SUPABASE_ACCESS_TOKEN\s*=\s*["'`]?[A-Za-z0-9._-]{10,}/,
    hint: "looks like a real SUPABASE_ACCESS_TOKEN value",
  },
  {
    name: "private-key-block",
    pattern: /-----BEGIN (RSA |EC |OPENSSH |DSA |)PRIVATE KEY-----/,
    hint: "contains a PEM private key block",
  },
  {
    name: "aws-access-key-id",
    pattern: /AKIA[0-9A-Z]{16}/,
    hint: "looks like an AWS access key id",
  },
  {
    name: "github-token",
    pattern: /gh[pousr]_[A-Za-z0-9]{36,}/,
    hint: "looks like a GitHub personal access/app token",
  },
  {
    name: "anthropic-key",
    pattern: /sk-ant-[A-Za-z0-9_-]{20,}/,
    hint: "looks like an Anthropic API key",
  },
  {
    name: "openai-key",
    pattern: /sk-[A-Za-z0-9]{32,}/,
    hint: "looks like an OpenAI-style API key",
  },
];

// Paths that are development-only: agent/tooling state, package-manager
// caches, and internal planning docs. The public repo exists for people who
// want to *use* Muvuca — none of this helps them, and some of it leaks how
// the author works.
//
// `.git/info/exclude` keeps these out on one machine only, and an ignore
// rule of any kind stops applying the moment a file is tracked (which is
// how `opencode.jsonc` and `.pnpm-store/` reached the remote). These rules
// match the path itself, so a file already in the index still fails.
//
// Matched against repo-relative, forward-slash paths as `git ls-files`
// prints them.
/** @type {{name: string, pattern: RegExp, hint: string}[]} */
const PATH_RULES = [
  {
    name: "tooling-directory",
    pattern:
      /^\.(agent|agents|claude|codex|cursor|gemini|impeccable|playwright-mcp|private|repowise|superpowers|worktrees)\//,
    hint: "is agent/tooling state, not part of the application",
  },
  {
    name: "local-cache",
    pattern: /^\.pnpm-store\//,
    hint: "is a local package-manager cache",
  },
  {
    name: "internal-doc",
    pattern:
      /^(AGENTS|ARCHITECTURE|CASOS_DE_USO|CLAUDE|DESIGN|GEMINI|HANDOFF|PRD|PRODUCT|ROADMAP)\.md$|^docs\/(handoff|plans|superpowers)\/|^docs\/IMPLEMENTATION_PLAN\.md$/,
    hint: "is an internal planning document, not user-facing",
  },
  {
    name: "agent-config",
    pattern:
      /^(\.cursorrules|\.mcp\.json|opencode\.jsonc|skills-lock\.json)$|^repomix-output.*\.xml$/,
    hint: "is local agent/editor configuration",
  },
];

function listCandidateFiles() {
  try {
    const tracked = execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard"],
      { encoding: "utf8" },
    );
    const files = tracked.split("\n").filter(Boolean);
    if (files.length > 0) return files;
  } catch {
    // Not a git repo (or git unavailable) — fall back to a manual walk.
  }
  return walk(".");
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "." || entry.name === "..") continue;
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith(".") && entry.isDirectory()) continue;

    const path = dir === "." ? entry.name : `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      walk(path, acc);
    } else {
      acc.push(path);
    }
  }
  return acc;
}

function scanPaths(files) {
  const violations = [];

  for (const file of files) {
    for (const rule of PATH_RULES) {
      if (rule.pattern.test(file)) {
        violations.push({ file, rule: rule.name, hint: rule.hint });
      }
    }
  }

  return violations;
}

function scanContent(files) {
  const violations = [];

  for (const file of files) {
    if (SELF_EXEMPT.has(file)) continue;
    if (BINARY_EXTENSIONS.has(extname(file))) continue;

    let stat;
    try {
      stat = statSync(file);
    } catch {
      continue; // Deleted-but-staged, or a broken symlink.
    }
    if (!stat.isFile() || stat.size > 5 * 1024 * 1024) continue;

    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue; // Binary file that slipped past the extension check.
    }

    for (const rule of RULES) {
      const match = content.match(rule.pattern);
      if (match) {
        const line = content.slice(0, match.index).split("\n").length;
        violations.push({ file, line, rule: rule.name, hint: rule.hint });
      }
    }
  }

  return violations;
}

const files = listCandidateFiles();
const violations = [...scanPaths(files), ...scanContent(files)];

if (violations.length > 0) {
  console.error("Repository hygiene check failed:\n");
  for (const v of violations) {
    const where = v.line === undefined ? v.file : `${v.file}:${v.line}`;
    console.error(`  ${where}  [${v.rule}]  ${v.hint}`);
  }
  console.error(
    `\n${violations.length} issue(s) found. Remove the leaked value, or untrack` +
      " the file with `git rm --cached <path>`, before committing.",
  );
  process.exit(1);
}

console.log(`Repository hygiene check passed (${files.length} files scanned).`);
