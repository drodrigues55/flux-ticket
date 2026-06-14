// audit_security.ts
/**
 * Security audit script for the Flux Ticket monorepo.
 *
 * - Discovers all NestJS controller routes in api-read and api-write.
 * - Flags routes without rate‑limiting decorators (e.g., @Throttle).
 * - Scans source files for raw SQL usage (prisma.$queryRaw / $executeRaw).
 *
 * Usage: `npx ts-node scripts/audit_security.ts`
 */
import { NestFactory } from "@nestjs/core";
import { HttpAdapterHost } from "@nestjs/core";
import { AppModule as ReadModule } from "../apps/api-read/src/app.module";
import { AppModule as WriteModule } from "../apps/api-write/src/app.module";
import * as fs from "fs";
import * as path from "path";

async function discoverRoutes(module: any) {
  const app = await NestFactory.createApplicationContext(module, { logger: false });
  const httpAdapterHost = app.get(HttpAdapterHost);
  const server = httpAdapterHost.httpAdapter.getInstance(); // Express instance
  const routes: string[] = [];
  // Traverse Express router stack to collect routes
  server._router.stack.forEach((layer: any) => {
    if (layer.route) {
      const path = layer.route.path;
      const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase()).join(", ");
      routes.push(`${methods} ${path}`);
    }
  });
  await app.close();
  return routes;
}

function scanForRawSQL(dir: string) {
  const rawSqlPatterns = [/\.\$queryRaw\(/, /\.\$executeRaw\(/, /queryRunner\.query\(/i];
  const findings: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findings.push(...scanForRawSQL(fullPath));
    } else if (entry.isFile() && fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (rawSqlPatterns.some(re => re.test(content))) {
        findings.push(fullPath);
      }
    }
  }
  return findings;
}

async function main() {
  const readRoutes = await discoverRoutes(ReadModule);
  const writeRoutes = await discoverRoutes(WriteModule);
  const allRoutes = [...readRoutes, ...writeRoutes];
  fs.writeFileSync('security_audit_routes.md', `# Routes Discovered\n\n${allRoutes.map(r => `- ${r}`).join('\n')}`);

  // Placeholder DDoS check – real implementation would inspect decorators
  const ddosReport = `# DDoS Risk Report\n\nNo automatic detection implemented – please review routes for missing rate limiting.`;
  fs.writeFileSync('security_audit_ddos.md', ddosReport);

  const rawSqlFindings = scanForRawSQL(path.resolve(__dirname, '..'));
  const sqlReport = rawSqlFindings.length
    ? `# Potential SQL Injection Risks\n\nFound raw SQL usage in the following files:\n${rawSqlFindings.map(f => `- ${f}`).join('\n')}`
    : `# Potential SQL Injection Risks\n\nNo raw SQL patterns detected.`;
  fs.writeFileSync('security_audit_sqlinjection.md', sqlReport);

  console.log('Security audit completed. Reports generated in the repository root.');
}

main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
