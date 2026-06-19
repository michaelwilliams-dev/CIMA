/**
 * AIVS / PGB CIMA - Sensitive Context Agent
 * File: sensitive_context_agent.js
 * ISO Timestamp: 2026-06-19T08:10:00Z
 *
 * Purpose:
 * - Records optional confidential/live-action context separately from the main CIMA audit file.
 * - Supports separation of sensitive incident details from normal question, answer and routing audit data.
 * - Writes JSONL records to the Render mounted disk.
 *
 * ISO Control Notes:
 * - Collect only necessary operational context.
 * - Do not place sensitive context into the main audit file.
 * - Link records using session_id and query_id where available.
 * - This is a prototype JSONL storage layer pending the later Spark/Granite design.
 */
import fs from "fs";
import path from "path";

const SENSITIVE_CONTEXT_AGENT_BUILD_ISO = "2026-06-19T08:10:00Z";

const DEFAULT_SENSITIVE_CONTEXT_DIR = process.env.CIMA_AUDIT_DIR || "/mnt/data/cima_audit";
const DEFAULT_SENSITIVE_CONTEXT_FILE =
  process.env.CIMA_SENSITIVE_CONTEXT_FILE || "cima_sensitive_context.jsonl";

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

function makeSensitiveContextId() {
  const timePart = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 10);
  return "cima_sensitive_r_" + timePart + "_" + randomPart;
}

function ensureSensitiveContextDir() {
  if (!fs.existsSync(DEFAULT_SENSITIVE_CONTEXT_DIR)) {
    fs.mkdirSync(DEFAULT_SENSITIVE_CONTEXT_DIR, { recursive: true });
  }
}

function sensitiveContextPath() {
  return path.join(DEFAULT_SENSITIVE_CONTEXT_DIR, DEFAULT_SENSITIVE_CONTEXT_FILE);
}

function buildSensitiveContextRecord(input = {}) {
  return {
    sensitive_record_id: makeSensitiveContextId(),
    session_id: cleanValue(input.session_id || input.sessionId || ""),
    query_id: cleanValue(input.query_id || input.queryId || ""),

    timestamp: new Date().toISOString(),
    app: "AIVS / PGB CIMA",
    sensitive_context_agent_build_iso: SENSITIVE_CONTEXT_AGENT_BUILD_ISO,

    user_email: normaliseEmail(input.user_email || input.userEmail || input.email || ""),
    access_mode: cleanValue(input.access_mode || input.accessMode || ""),

    incident_place: cleanValue(input.incident_place || input.incidentPlace || ""),
    incident_time: cleanValue(input.incident_time || input.incidentTime || ""),
    people_involved: cleanValue(input.people_involved || input.peopleInvolved || ""),
    vulnerable_persons: cleanValue(input.vulnerable_persons || input.vulnerablePersons || ""),
    injuries: cleanValue(input.injuries || ""),
    emergency_services_involved: cleanValue(
      input.emergency_services_involved || input.emergencyServicesInvolved || ""
    ),
    security_contacts: cleanValue(input.security_contacts || input.securityContacts || ""),
    sensitive_operational_notes: cleanValue(
      input.sensitive_operational_notes || input.sensitiveOperationalNotes || ""
    ),

    created_from: cleanValue(input.created_from || input.createdFrom || "cima_frontend_popup")
  };
}

export async function writeSensitiveContext(input = {}) {
  try {
    ensureSensitiveContextDir();

    const record = buildSensitiveContextRecord(input);
    const line = JSON.stringify(record) + "\n";

    await fs.promises.appendFile(sensitiveContextPath(), line, "utf8");

    return {
      ok: true,
      sensitive_context_agent_build_iso: SENSITIVE_CONTEXT_AGENT_BUILD_ISO,
      sensitive_context_file: sensitiveContextPath(),
      sensitive_record_id: record.sensitive_record_id,
      session_id: record.session_id,
      query_id: record.query_id
    };
  } catch (err) {
    console.error("CIMA sensitive context write failed:", err.message);

    return {
      ok: false,
      sensitive_context_agent_build_iso: SENSITIVE_CONTEXT_AGENT_BUILD_ISO,
      error: err.message
    };
  }
}

export function getSensitiveContextAgentStatus() {
  return {
    ok: true,
    agent: "sensitive_context_agent",
    sensitive_context_agent_build_iso: SENSITIVE_CONTEXT_AGENT_BUILD_ISO,
    sensitive_context_dir: DEFAULT_SENSITIVE_CONTEXT_DIR,
    sensitive_context_file: sensitiveContextPath()
  };
}
