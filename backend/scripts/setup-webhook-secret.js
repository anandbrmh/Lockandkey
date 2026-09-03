#!/usr/bin/env node
/**
 * Setup Webhook Secrets — stores WEBHOOK_SECRET to .env
 * Usage:
 *   node scripts/setup-webhook-secret.js          # generate if missing
 *   node scripts/setup-webhook-secret.js --rotate # generate new even if exists
 *   node scripts/setup-webhook-secret.js --show   # show current preview
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");
const envExamplePath = path.resolve(__dirname, "../.env.example");

const args = process.argv.slice(2);
const rotate = args.includes("--rotate");
const show = args.includes("--show");

function getEnvContent(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

function upsertEnvVar(content, key, value) {
  const line = `${key}=${value}`;
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    return content.replace(regex, line);
  }
  // Ensure trailing newline
  if (content && !content.endsWith("\n")) content += "\n";
  return content + line + "\n";
}

if (show) {
  const content = getEnvContent(envPath);
  const m = content.match(/^WEBHOOK_SECRET=(.*)$/m);
  if (m) {
    const v = m[1].trim();
    console.log(`WEBHOOK_SECRET=****${v.slice(-4)} (length ${v.length})`);
    console.log(`Full value in ${envPath} — keep private!`);
  } else {
    console.log("WEBHOOK_SECRET not set in .env");
  }
  process.exit(0);
}

let envContent = getEnvContent(envPath);
const existing = envContent.match(/^WEBHOOK_SECRET=(.*)$/m)?.[1]?.trim();

if (existing && !rotate) {
  console.log(`WEBHOOK_SECRET already exists (****${existing.slice(-4)}). Use --rotate to regenerate.`);
  console.log(`Path: ${envPath}`);
  process.exit(0);
}

const newSecret = crypto.randomBytes(32).toString("hex"); // 64 hex chars
envContent = upsertEnvVar(envContent, "WEBHOOK_SECRET", newSecret);
fs.writeFileSync(envPath, envContent, "utf8");
console.log(`✅ WEBHOOK_SECRET ${existing ? "rotated" : "generated"} and saved to .env`);
console.log(`   Preview: ****${newSecret.slice(-4)}`);
console.log(`   Full value: ${newSecret}`);
console.log(`   File: ${envPath}`);
console.log("");
console.log("⚠️  Restart server to apply: npm run dev");
console.log("   Test inbound: curl -X POST http://localhost:5000/api/incoming-webhooks/receive/test \\");
console.log(`     -H "Content-Type: application/json" \\`);
console.log(`     -H "X-Signature: $(node -e "const c=require('crypto');const s='${newSecret}';const b=JSON.stringify({hello:'world'});console.log(c.createHmac('sha256',s).update(b).digest('hex'))") " \\`);
console.log(`     -d '{"hello":"world"}'`);
