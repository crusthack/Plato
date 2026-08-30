#!/usr/bin/env node

/**
 * Read-only helper for finding PLATO endpoints and action selectors in public
 * RequireJS bundles. It prints JSON to stdout and never sends POST requests.
 */

const bundles = [
  {
    generation: "current",
    url: "https://plato.pusan.ac.kr/lib/requirejs.php/1788088812/local_ubion/allcourse/regular.js"
  },
  {
    generation: "legacy",
    url: "https://dev-plato.pusan.ac.kr/lib/requirejs.php/1787752721/theme_coursemosv2/index.js"
  }
];

const endpointPattern = /["'`](\/(?:local|mod|theme|lib|repository|message)\/[A-Za-z0-9_./-]+\.php(?:\?[^"'`\\\s]*)?)["'`]/g;
const actionPatterns = [
  /(?:csmstype\(\)|["']type["']|\btype)\s*\]?\s*[:=]\s*["']([A-Za-z][A-Za-z0-9_-]*)["']/g,
  /(?:[?&]|^)type=([A-Za-z][A-Za-z0-9_-]*)/g
];

const unique = (values) => [...new Set(values)].sort();

const scanModule = (source) => {
  const endpoints = unique([...source.matchAll(endpointPattern)].map((match) => match[1]));
  const actions = unique(actionPatterns.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => match[1])
  ));
  const methods = [];
  if (/\.post\s*\(|postJson\s*\(|method\s*:\s*["']POST["']/i.test(source)) methods.push("POST");
  if (/\.get\s*\(|method\s*:\s*["']GET["']|fetch\s*\(/i.test(source)) methods.push("GET");
  return { endpoints, actions, methods: unique(methods) };
};

const results = [];
for (const bundle of bundles) {
  const response = await fetch(bundle.url, { method: "GET", redirect: "follow" });
  if (!response.ok) throw new Error(`${bundle.url} returned HTTP ${response.status}`);
  const text = await response.text();
  const modules = text.split(/(?=define\(["'])/g);
  for (const source of modules) {
    const name = source.match(/^define\(["']([^"']+)/)?.[1] || "(bundle prelude)";
    const scanned = scanModule(source);
    if (!scanned.endpoints.length) continue;
    results.push({ generation: bundle.generation, module: name, ...scanned });
  }
}

process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
