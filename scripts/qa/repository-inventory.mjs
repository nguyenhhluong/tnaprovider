import { readdirSync, readFileSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function walk(dir, predicate) {
  const files = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git" && entry.name !== "dist" && entry.name !== "data" && entry.name !== "backups" && entry.name !== ".wrangler") {
        files.push(...walk(full, predicate));
      } else if (entry.isFile() && predicate(entry.name)) {
        files.push(full);
      }
    }
  } catch { }
  return files;
}

function countFiles(pattern) {
  const re = new RegExp(pattern);
  return walk(ROOT, (name) => re.test(name));
}

function extractExports(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const exports = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    const named = trimmed.match(/^export\s+(?:async\s+)?function\s+(\w+)/);
    if (named) { exports.push(named[1]); continue; }
    const arrow = trimmed.match(/^export\s+(?:const|let|var)\s+(\w+)/);
    if (arrow) { exports.push(arrow[1]); continue; }
    const def = trimmed.match(/^export\s+default\s+(?:function\s+)?(\w+)/);
    if (def) { exports.push(def[1] + " (default)"); continue; }
  }
  return exports;
}

function extractEndpoints(routesContent, prefix) {
  const endpoints = [];
  const lines = routesContent.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^router\.(get|post|put|patch|delete|all)\(["']([^"']+)["']/);
    if (match) {
      endpoints.push(`${match[1].toUpperCase()} ${prefix}${match[2]}`);
    }
  }
  return endpoints;
}

function extractTables(migrationContent) {
  const tables = [];
  const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi;
  let match;
  while ((match = re.exec(migrationContent)) !== null) {
    if (!tables.includes(match[1])) tables.push(match[1]);
  }
  return tables;
}

function extractIndexes(migrationContent) {
  const indexes = [];
  const re = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi;
  let match;
  while ((match = re.exec(migrationContent)) !== null) {
    if (!indexes.includes(match[1])) indexes.push(match[1]);
  }
  return indexes;
}

function extractDuplicateRoutes(endpoints) {
  const seen = {};
  const duplicates = [];
  for (const ep of endpoints) {
    const method = ep.split(" ")[0];
    const path = ep.substring(method.length + 1);
    const methodPath = `${method} ${path}`;
    if (seen[methodPath]) {
      if (!duplicates.includes(methodPath)) duplicates.push(methodPath);
    } else {
      seen[methodPath] = true;
    }
  }
  return duplicates;
}

const jsFiles = countFiles("\\.(js|mjs|cjs)$");
const tsFiles = countFiles("\\.(ts|tsx)$");

const serverJsFiles = walk(join(ROOT, "server"), (name) => /\.(js|mjs)$/.test(name));

const allExports = {};
for (const f of serverJsFiles) {
  const exps = extractExports(f);
  if (exps.length > 0) {
    allExports[f.replace(ROOT + "/", "")] = exps;
  }
}

const routeFiles = walk(join(ROOT, "server"), (name) => /routes\.(js|mjs)$/.test(name) || (name.endsWith(".js") && name !== "app.js" && name !== "startup.js" && name !== "server.js" && name !== "database.js" && name !== "migrate.js" && name !== "seed.js" && name !== "transaction.js" && name !== "versioned-migrate.js"));
const routeFilesSet = new Set();
for (const f of routeFiles) {
  const rel = f.replace(ROOT + "/", "");
  if (rel.startsWith("server/routes/") || rel.includes("routes.")) {
    routeFilesSet.add(f);
  }
}
for (const f of serverJsFiles) {
  const rel = f.replace(ROOT + "/", "");
  if (rel.includes("/routes/") && rel.endsWith(".js")) routeFilesSet.add(f);
}

const routePaths = {};

const routeDir = join(ROOT, "server/routes");
if (exists(routeDir)) {
  for (const f of readdirSync(routeDir).filter(n => n.endsWith(".js"))) {
    const filePath = join(routeDir, f);
    const content = readFileSync(filePath, "utf-8");
    const prefix = "/api/" + f.replace(/\.js$/, "");
    const eps = extractEndpoints(content, "");
    routePaths[f] = { prefix: f.replace(/\.js$/, ""), endpoints: eps };
  }
}

const modulesDir = join(ROOT, "server/modules");
if (exists(modulesDir)) {
  for (const mod of readdirSync(modulesDir, { withFileTypes: true }).filter(d => d.isDirectory())) {
    const routesFile = join(modulesDir, mod.name, `${mod.name}.routes.js`);
    if (exists(routesFile)) {
      const content = readFileSync(routesFile, "utf-8");
      const eps = extractEndpoints(content, "");
      routePaths[`modules/${mod.name}.routes.js`] = { prefix: `modules/${mod.name}`, endpoints: eps };
    }
  }
}

let allEndpoints = [];
for (const [, v] of Object.entries(routePaths)) {
  allEndpoints = allEndpoints.concat(v.endpoints);
}

const migrationFiles = walk(join(ROOT, "server/db/migrations"), (name) => name.endsWith(".js"));
const migrateContent = readFileSync(join(ROOT, "server/db/migrate.js"), "utf-8");

let allTables = [];
let allIndexes = [];

const tableSet = new Set();
const indexSet = new Set();

for (const f of migrationFiles) {
  const content = readFileSync(f, "utf-8");
  for (const t of extractTables(content)) tableSet.add(t);
  for (const ix of extractIndexes(content)) indexSet.add(ix);
}
for (const t of extractTables(migrateContent)) tableSet.add(t);
for (const ix of extractIndexes(migrateContent)) indexSet.add(ix);

allTables = [...tableSet].sort();
allIndexes = [...indexSet].sort();

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
const scripts = pkg.scripts || {};

const qaDir = join(ROOT, "scripts/qa");
const qaFiles = exists(qaDir) ? readdirSync(qaDir).filter(n => n.endsWith(".mjs")) : [];

const duplicates = extractDuplicateRoutes(allEndpoints);

function exists(p) { try { return statSync(p).isFile() || statSync(p).isDirectory(); } catch { return false; } }

console.log("=".repeat(60));
console.log("  TNA Provider — Repository Inventory");
console.log("=".repeat(60));
console.log();

console.log("─".repeat(60));
console.log("  FILE COUNTS");
console.log("─".repeat(60));
console.log(`  JavaScript files (.js/.mjs/.cjs):       ${jsFiles.length}`);
console.log(`  TypeScript files (.ts/.tsx):             ${tsFiles.length}`);
console.log(`  Total source files:                       ${jsFiles.length + tsFiles.length}`);
console.log();

console.log("─".repeat(60));
console.log("  EXPORTED FUNCTIONS (server/)");
console.log("─".repeat(60));
let totalExports = 0;
for (const [file, exps] of Object.entries(allExports)) {
  console.log(`  ${file}:`);
  for (const exp of exps) {
    console.log(`    → ${exp}`);
    totalExports++;
  }
}
console.log(`  Total exported functions: ${totalExports}`);
console.log();

console.log("─".repeat(60));
console.log("  EXPRESS ENDPOINTS");
console.log("─".repeat(60));
for (const [file, info] of Object.entries(routePaths)) {
  console.log(`  ${file} (${info.prefix}):`);
  for (const ep of info.endpoints) {
    console.log(`    ${ep}`);
  }
}
console.log(`  Total endpoints: ${allEndpoints.length}`);
console.log();

console.log("─".repeat(60));
console.log("  DATABASE TABLES");
console.log("─".repeat(60));
for (const t of allTables) console.log(`  ${t}`);
console.log(`  Total tables: ${allTables.length}`);
console.log();

console.log("─".repeat(60));
console.log("  DATABASE INDEXES");
console.log("─".repeat(60));
for (const ix of allIndexes) console.log(`  ${ix}`);
console.log(`  Total indexes: ${allIndexes.length}`);
console.log();

console.log("─".repeat(60));
console.log("  MIGRATION FILES");
console.log("─".repeat(60));
for (const f of migrationFiles) {
  console.log(`  ${f.replace(ROOT + "/", "")}`);
}
console.log(`  Total migrations: ${migrationFiles.length}`);
console.log();

console.log("─".repeat(60));
console.log("  QA TEST FILES");
console.log("─".repeat(60));
for (const f of qaFiles) {
  console.log(`  scripts/qa/${f}`);
}
console.log(`  Total QA tests: ${qaFiles.length}`);
console.log();

console.log("─".repeat(60));
console.log("  PACKAGE SCRIPTS");
console.log("─".repeat(60));
for (const [name, cmd] of Object.entries(scripts)) {
  console.log(`  ${name}: ${cmd}`);
}
console.log(`  Total scripts: ${Object.keys(scripts).length}`);
console.log();

console.log("─".repeat(60));
console.log("  DUPLICATE ROUTE PATHS");
console.log("─".repeat(60));
if (duplicates.length === 0) {
  console.log("  No duplicate routes found");
} else {
  for (const d of duplicates) console.log(`  ⚠ ${d}`);
}
console.log();
console.log("=".repeat(60));
console.log("  Inventory complete");
console.log("=".repeat(60));
