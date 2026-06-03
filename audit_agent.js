/**
 * AIVS / PGB CIMA - ISO Audit Agent
 * File: agents/audit_agent.js
 * ISO Timestamp: 2026-06-03T15:55:00Z
 *
 * Purpose:
 * - Records CIMA user and system activity for ISO/IEC 42001 governance.
 * - Logs access-code requests, access checks, terms acceptance, questions, responses and transcript emails.
 * - Provides a controlled audit trail without bloating server.js.
 *
 * Change Log:
 * - v0.1.0: created blank controlled agent file for CIMA ISO user/audit logging.
 *
 * ISO Control Notes:
 * - Collect only necessary governance data.
 * - Avoid unnecessary personal or sensitive data collection.
 * - Log timestamp, event type, user email, access mode, route, success/failure and error where relevant.
 * - Future storage may be JSONL, FileMaker, database, or controlled cloud repository.
 */
import fs from "fs";
import path from "path";

const AUDIT_AGENT_BUILD_ISO = "2026-06-03T16:05:00Z";

const DEFAULT_AUDIT_DIR = process.env.CIMA_AUDIT_DIR || "/mnt/data/cima_audit";
const DEFAULT_AUDIT_FILE = process.env.CIMA_AUDIT_FILE || "cima_usage_audit.jsonl";

function safeString(value = "") {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function cleanValue(value = "") {
  return safeString(value)
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function normaliseEmail(value = "") {
  return cleanValue(value).toLowerCase();
}

function ensureAuditDir() {
  if (!fs.existsSync(DEFAULT_AUDIT_DIR)) {
    fs.mkdirSync(DEFAULT_AUDIT_DIR, { recursive: true });
  }
}

function auditPath() {
  return path.join(DEFAULT_AUDIT_DIR, DEFAULT_AUDIT_FILE);
}

function buildAuditRecord(event = {}) {
  return {
    timestamp: new Date().toISOString(),
    app: "AIVS / PGB CIMA",
    audit_agent_build_iso: AUDIT_AGENT_BUILD_ISO,

    event_type: cleanValue(event.event_type || event.eventType || "unspecified_event"),
    route: cleanValue(event.route || ""),
    success: event.success === undefined ? null : Boolean(event.success),
    error: cleanValue(event.error || ""),

    user_email: normaliseEmail(event.user_email || event.userEmail || event.email || ""),
    second_email: normaliseEmail(event.second_email || event.secondEmail || ""),

    access_mode: cleanValue(event.access_mode || event.accessMode || ""),
    terms_accepted: event.terms_accepted === undefined ? null : Boolean(event.terms_accepted),

    question: cleanValue(event.question || ""),
    context_mode: cleanValue(event.context_mode || event.contextMode || ""),
    command_level: cleanValue(event.command_level || event.commandLevel || ""),
    persona: cleanValue(event.persona || ""),
    requested_output: cleanValue(event.requested_output || event.requestedOutput || ""),

    response_path: cleanValue(event.response_path || event.responsePath || ""),
    rag_status: cleanValue(event.rag_status || event.ragStatus || ""),
    hitl_status: cleanValue(event.hitl_status || event.hitlStatus || ""),
    confidence: cleanValue(event.confidence || ""),

    transcript_sent: event.transcript_sent === undefined ? null : Boolean(event.transcript_sent),
    email_recipients: Array.isArray(event.email_recipients)
      ? event.email_recipients.map(normaliseEmail).filter(Boolean)
      : [],

    ip_address: cleanValue(event.ip_address || event.ipAddress || ""),
    user_agent: cleanValue(event.user_agent || event.userAgent || "")
  };
}

export async function writeAuditEvent(event = {}) {
  try {
    ensureAuditDir();

    const record = buildAuditRecord(event);
    const line = JSON.stringify(record) + "\n";

    await fs.promises.appendFile(auditPath(), line, "utf8");

    return {
      ok: true,
      audit_agent_build_iso: AUDIT_AGENT_BUILD_ISO,
      audit_file: auditPath()
    };
  } catch (err) {
    console.error("CIMA audit write failed:", err.message);

    return {
      ok: false,
      audit_agent_build_iso: AUDIT_AGENT_BUILD_ISO,
      error: err.message
    };
  }
}

export function getAuditAgentStatus() {
  return {
    ok: true,
    agent: "audit_agent",
    audit_agent_build_iso: AUDIT_AGENT_BUILD_ISO,
    audit_dir: DEFAULT_AUDIT_DIR,
    audit_file: auditPath()
  };
}
