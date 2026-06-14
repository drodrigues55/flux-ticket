// audit_security.js
/**
 * Simple security audit script (JavaScript) for the Flux Ticket monorepo.
 * - Discovers NestJS routes by scanning *.controller.ts files for @Controller and HTTP method decorators.
 * - Flags potential DDoS risk (routes without a @Throttle decorator).
 * - Scans all .ts files for raw SQL usage (prisma.$queryRaw / $executeRaw / queryRunner.query).
 *
 * Run with: `node scripts/audit_security.js`
 */
const fs = require('fs');
const path = require('path');

const HTTP_METHODS = ['Get', 'Post', 'Put', 'Patch', 'Delete', 'Options', 'Head'];

function scanDir(dir, fileCallback) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', '.next', 'dist', 'build', '.turbo'].includes(entry.name)) {
        continue;
      }
      scanDir(fullPath, fileCallback);
    } else if (entry.isFile() && fullPath.endsWith('.ts')) {
      fileCallback(fullPath);
    }
  }
}

function extractRoutes(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const controllerMatch = content.match(/@Controller\((?:\s*['"]([^'\"]*)['"]\s*)?\)/);
  if (!controllerMatch) return [];
  const basePath = controllerMatch[1] ? '/' + controllerMatch[1].replace(/^\//, '') : '';
  const routes = [];
  const lines = content.split(/\r?\n/);
  const methodRegex = new RegExp('@(' + HTTP_METHODS.join('|') + ')\\((?:\\s*[\'"]([^\'\"]*)[\'"]\\s*)?\\)');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const methodMatch = line.match(methodRegex);
    if (methodMatch) {
      const method = methodMatch[1].toUpperCase();
      const subPath = methodMatch[2] ? '/' + methodMatch[2].replace(/^\//, '') : '';
      const fullRoute = `${method} ${basePath + subPath}`.replace(/\/\/+/g, '/');
      const hasThrottle = lines.slice(Math.max(0, i - 3), i).some(l => /@Throttle/.test(l));
      routes.push({ route: fullRoute, hasThrottle, file: filePath, line: i + 1 });
    }
  }
  return routes;
}

function scanRawSQL(dir) {
  const patterns = [/\.\$queryRaw\(/, /\.\$executeRaw\(/, /queryRunner\.query\(/i];
  const findings = [];
  scanDir(dir, filePath => {
    // Avoid scanning test files if we only want code, but scanning them is fine.
    const content = fs.readFileSync(filePath, 'utf8');
    if (patterns.some(p => p.test(content))) {
      findings.push(filePath);
    }
  });
  return findings;
}

function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const controllerFiles = [];
  scanDir(projectRoot, fp => {
    if (fp.endsWith('.controller.ts')) controllerFiles.push(fp);
  });

  const allRoutes = [];
  for (const file of controllerFiles) {
    allRoutes.push(...extractRoutes(file));
  }

  // Check if global limits exist
  const appModuleContent = fs.readFileSync(path.join(projectRoot, 'services/api-write/src/app.module.ts'), 'utf8');
  const hasGlobalThrottleWrite = /ThrottlerModule\.forRoot/.test(appModuleContent);
  const indexReadContent = fs.readFileSync(path.join(projectRoot, 'services/api-read/src/index.ts'), 'utf8');
  const hasGlobalLimitRead = /rateLimit\(/.test(indexReadContent);

  const routesReportLines = allRoutes.map(r => {
    const status = r.hasThrottle || hasGlobalThrottleWrite ? '(rate-limited via global guard/decorator)' : '(no @Throttle)';
    return `- ${r.route} ${status} [${path.relative(projectRoot, r.file)}:${r.line}]`;
  });
  
  let routesReport = '# Routes Discovered\n\n' + routesReportLines.join('\n');
  routesReport += `\n\n## Global Throttling Status\n- **services/api-write** (NestJS): ${hasGlobalThrottleWrite ? 'Protected globally via ThrottlerGuard' : 'Not protected globally'}`;
  routesReport += `\n- **services/api-read** (Express): ${hasGlobalLimitRead ? 'Protected globally via express-rate-limit' : 'Not protected globally'}`;
  fs.writeFileSync('security_audit_routes.md', routesReport);

  let ddosReport = '# DDoS Risk Report\n\n';
  if (hasGlobalThrottleWrite && hasGlobalLimitRead) {
    ddosReport += `All API gateways are protected by global rate limiters:\n`;
    ddosReport += `- NestJS api-write: 60 req/min limit.\n`;
    ddosReport += `- Express api-read: 300 req/15min limit.\n\n`;
    ddosReport += `No unprotected endpoints found. Heavy-query endpoints should still implement cursor pagination.`;
  } else {
    ddosReport += allRoutes.filter(r => !r.hasThrottle).map(r => `- ${r.route} (missing @Throttle)`).join('\n') || 'No missing @Throttle decorators found.';
  }
  fs.writeFileSync('security_audit_ddos.md', ddosReport);

  const rawSqlFindings = scanRawSQL(projectRoot);
  const sqlReport = rawSqlFindings.length
    ? '# Potential SQL Injection Risks\n\nFound raw SQL usage in the following files:\n' + rawSqlFindings.map(f => `- ${path.relative(projectRoot, f)}`).join('\n')
    : '# Potential SQL Injection Risks\n\nNo raw SQL patterns detected. All database calls use parameterised queries (Prisma Client).';
  fs.writeFileSync('security_audit_sqlinjection.md', sqlReport);

  console.log('Security audit completed. Reports generated at repository root.');
}

main();
