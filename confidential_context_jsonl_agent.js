/**
 * AIVS / PGB CIMA - Confidential Context JSONL Agent
 * File: confidential_context_jsonl_agent.js
 * ISO Timestamp: 2026-06-20T12:45:00Z
 *
 * Change:
 * - Adds a clearly named agent for receiving confidential context from the CIMA pop-up.
 * - Calls the existing sensitive_context_agent.js storage writer.
 * - Keeps server.js lean.
 *
 * Purpose:
 * - Exposes the /cima-confidential-context route.
 * - Receives confidential / sensitive context from the front-end pop-up.
 * - Passes the data to the JSONL storage agent.
 *
 * ISO Control Notes:
 * - Does not search FAISS.
 * - Does not alter CIMA answer generation.
 * - Does not add confidential context to the visible transcript.
 * - Does not expose internal session_id, query_id or sensitive_record_id in the front-end.
 */

import {
  writeSensitiveContext,
  getSensitiveContextAgentStatus
} from "./sensitive_context_agent.js";

const CONFIDENTIAL_CONTEXT_JSONL_AGENT_BUILD_ISO = "2026-06-20T12:45:00Z";

function normaliseBody(req) {
  return req && req.body && typeof req.body === "object" ? req.body : {};
}

export function registerConfidentialContextJsonlRoute(app) {
  if (!app || typeof app.post !== "function") {
    throw new Error("registerConfidentialContextJsonlRoute requires an Express app instance.");
  }

  app.post("/cima-confidential-context", async (req, res) => {
    try {
      const body = normaliseBody(req);

      const result = await writeSensitiveContext({
        ...body,
        created_from: body.created_from || body.createdFrom || "cima_frontend_popup"
      });

      if (!result || result.ok !== true) {
        return res.status(500).json({
          ok: false,
          agent: "confidential_context_jsonl_agent",
          confidential_context_jsonl_agent_build_iso: CONFIDENTIAL_CONTEXT_JSONL_AGENT_BUILD_ISO,
          error: result?.error || "Confidential context JSONL write failed."
        });
      }

      return res.json({
        ok: true,
        agent: "confidential_context_jsonl_agent",
        confidential_context_jsonl_agent_build_iso: CONFIDENTIAL_CONTEXT_JSONL_AGENT_BUILD_ISO,
        sensitive_context_agent_build_iso: result.sensitive_context_agent_build_iso,
        stored: true
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        agent: "confidential_context_jsonl_agent",
        confidential_context_jsonl_agent_build_iso: CONFIDENTIAL_CONTEXT_JSONL_AGENT_BUILD_ISO,
        error: err.message
      });
    }
  });
}

export function getConfidentialContextJsonlAgentStatus() {
  return {
    ok: true,
    agent: "confidential_context_jsonl_agent",
    confidential_context_jsonl_agent_build_iso: CONFIDENTIAL_CONTEXT_JSONL_AGENT_BUILD_ISO,
    route: "/cima-confidential-context",
    storage_agent: getSensitiveContextAgentStatus()
  };
}
