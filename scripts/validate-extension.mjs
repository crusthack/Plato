#!/usr/bin/env node

import { readdir, readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const errors = [];
const toRelative = (file) => path.relative(root, file).replaceAll(path.sep, "/");

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".git") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
  }
  return files;
};

const allFiles = await walk(root);
const relativeFiles = new Set(allFiles.map(toRelative));
const manifestPath = path.join(root, "manifest.json");
let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch (error) {
  errors.push(`manifest.json: invalid JSON (${error.message})`);
  manifest = {};
}

const manifestReferences = [
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  ...(manifest.content_scripts || []).flatMap((entry) => [...(entry.css || []), ...(entry.js || [])]),
  ...(manifest.web_accessible_resources || []).flatMap((entry) => entry.resources || [])
].filter(Boolean);

const wildcardPattern = (value) => new RegExp(`^${value
  .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
  .replaceAll("*", ".*")}$`);

for (const reference of manifestReferences) {
  const exists = reference.includes("*")
    ? [...relativeFiles].some((file) => wildcardPattern(reference).test(file))
    : relativeFiles.has(reference);
  if (!exists) errors.push(`manifest.json: missing referenced file ${reference}`);
}

const allowedPermissions = new Set(["storage"]);
for (const permission of manifest.permissions || []) {
  if (!allowedPermissions.has(permission)) errors.push(`manifest.json: unexpected permission ${permission}`);
}

const allowedHosts = new Set(["https://dev-plato.pusan.ac.kr/*"]);
for (const host of manifest.host_permissions || []) {
  if (!allowedHosts.has(host)) errors.push(`manifest.json: unexpected host permission ${host}`);
}
if (manifest.externally_connectable) {
  errors.push("manifest.json: externally_connectable must remain disabled");
}
for (const match of (manifest.content_scripts || []).flatMap((entry) => entry.matches || [])) {
  if (!match.startsWith("https://plato.pusan.ac.kr/") &&
    !match.startsWith("https://dev-plato.pusan.ac.kr/")) {
    errors.push(`manifest.json: unexpected content-script match ${match}`);
  }
}

for (const file of allFiles.filter((item) => /\.(?:js|mjs)$/.test(item))) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    errors.push(`${toRelative(file)}: JavaScript syntax error`);
  }
}

const productionTextFiles = allFiles.filter((file) => {
  const relative = toRelative(file);
  return (relative === "manifest.json" || /^(?:src|popup|templates|styles|assets)\//.test(relative)) &&
    /\.(?:js|mjs|json|html|css|svg)$/.test(relative);
});
const secretPatterns = [
  { label: "session cookie", pattern: /(?:MoodleSession|MOODLEID[^=\s;]*)\s*=\s*[A-Za-z0-9%/+_-]{8,}/i },
  { label: "analytics cookie", pattern: /(?:_ga|_gid)(?:_[A-Za-z0-9_]*)?\s*=\s*[A-Za-z0-9.$_-]{8,}/i },
  { label: "hardcoded credential", pattern: /(?:password|passwd|api[_-]?key|client[_-]?secret|access[_-]?token)\s*[:=]\s*["'][^"']{4,}["']/i },
  { label: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: "JWT", pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ }
];

for (const file of productionTextFiles) {
  const text = await readFile(file, "utf8");
  for (const { label, pattern } of secretPatterns) {
    if (pattern.test(text)) errors.push(`${toRelative(file)}: possible ${label}`);
  }
  if (/<script\b[^>]*\bsrc\s*=\s*["']https?:\/\//i.test(text)) {
    errors.push(`${toRelative(file)}: remote executable script reference`);
  }
}

for (const file of allFiles) {
  const info = await stat(file);
  if (info.size > 5 * 1024 * 1024) errors.push(`${toRelative(file)}: unexpectedly large file`);
}

if (errors.length) {
  process.stderr.write(`Extension validation failed:\n- ${errors.join("\n- ")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Extension OK: ${manifestReferences.length} manifest references, ${productionTextFiles.length} production text files, minimal permissions verified.\n`);
}
