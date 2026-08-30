#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const archiveRoot = path.join(root, "docs", "api-archive");
const errors = [];

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
  }
  return files;
};

const files = await walk(archiveRoot);
for (const file of files.filter((item) => item.endsWith(".json"))) {
  try {
    JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    errors.push(`${path.relative(root, file)}: invalid JSON (${error.message})`);
  }
}

const cataloguePath = path.join(archiveRoot, "endpoints.json");
const catalogue = JSON.parse(await readFile(cataloguePath, "utf8"));
const ids = new Set();
const required = ["id", "generation", "path", "methods", "auth", "kind", "effect", "safeToProbe", "evidence", "confidence"];

for (const endpoint of catalogue.endpoints || []) {
  for (const key of required) {
    if (!(key in endpoint)) errors.push(`${endpoint.id || "(missing id)"}: missing ${key}`);
  }
  if (ids.has(endpoint.id)) errors.push(`${endpoint.id}: duplicate id`);
  ids.add(endpoint.id);
  if (!endpoint.path?.startsWith("/")) errors.push(`${endpoint.id}: path must be host-relative`);
  if (!Array.isArray(endpoint.methods) || endpoint.methods.length === 0) errors.push(`${endpoint.id}: methods must be non-empty`);
  if (endpoint.methods?.some((method) => method !== "GET" && method !== "HEAD") && endpoint.safeToProbe !== false) {
    errors.push(`${endpoint.id}: state-capable method must not be marked safeToProbe`);
  }
  if (endpoint.effect !== "read" && endpoint.safeToProbe !== false) {
    errors.push(`${endpoint.id}: non-read endpoint must not be marked safeToProbe`);
  }
}

const allText = (await Promise.all(files.map(async (file) => ({
  file,
  text: await readFile(file, "utf8")
}))));

const secretPatterns = [
  { label: "cookie assignment", pattern: /(?:MoodleSession|MOODLEID[^=\s;]*)\s*=\s*[A-Za-z0-9%/+_-]{8,}/i },
  { label: "Google Analytics cookie", pattern: /(?:_ga|_gid)_[A-Za-z0-9_]*\s*=\s*[A-Za-z0-9.$_-]{8,}/i },
  { label: "literal credential field", pattern: /["'](?:username|password)["']\s*:\s*["'](?!\$\{REDACTED\})[^"']{3,}["']/i },
  { label: "IPv4 address", pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/ },
  { label: "probable student id", pattern: /\b20\d{7}\b/ }
];

for (const { file, text } of allText) {
  for (const { label, pattern } of secretPatterns) {
    if (pattern.test(text)) errors.push(`${path.relative(root, file)}: possible ${label}`);
  }
}

if (errors.length) {
  process.stderr.write(`API archive validation failed:\n- ${errors.join("\n- ")}\n`);
  process.exitCode = 1;
} else {
  const current = catalogue.endpoints.filter((item) => item.generation === "current").length;
  const legacy = catalogue.endpoints.filter((item) => item.generation === "legacy").length;
  process.stdout.write(`API archive OK: ${catalogue.endpoints.length} endpoints (${current} current, ${legacy} legacy), ${files.length} files checked.\n`);
}

