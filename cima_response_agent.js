/**
 * AIVS / PGB CIMA - CIMA Response Agent
 * File: cima_response_agent.js
 * ISO Timestamp: 2026-06-04T09:15:00Z
 *
 * Purpose:
 * - Handles CIMA response generation logic outside server.js.
 * - Determines FAST PATH or ASSURANCE PATH.
 * - Returns RAG status, HITL status, confidence level and draft answer.
 *
 * Change Log:
 * - v0.1.0: created blank controlled agent file for CIMA response handling.
 * - v0.2.0: added controlled demo response logic moved from server.js.
 *
 * ISO Control Notes:
 * - This agent must not send email.
 * - This agent must not write audit records directly.
 * - This agent must not perform uncontrolled source retrieval.
 * - All outputs remain draft support only and require human review.
 */

const CIMA_RESPONSE_AGENT_BUILD_ISO = "2026-06-04T09:15:00Z";

function safeString(value = "") {
  if (value === null || value === undefined || value === "") {
    return "Not supplied";
  }

  return String(value);
}

function determineResponsePath(question = "", context = {}) {
  const text = [
    question,
    context.mode,
    context.level,
    context.persona,
    context.output,
    context.thread
  ].join(" ").toLowerCase();

  if (
    text.includes("assurance") ||
    text.includes("compliance") ||
    text.includes("statutory") ||
    text.includes("validate") ||
    text.includes("source") ||
    text.includes("citation") ||
    text.includes("policy") ||
    text.includes("safeguarding")
  ) {
    return "ASSURANCE PATH";
  }

  return "FAST PATH";
}

function inferRagStatus(question = "", context = {}, responsePath = "FAST PATH") {
  const text = [
    question,
    context.mode,
    context.level,
    context.persona,
    context.output
  ].join(" ").toLowerCase();

  if (
    text.includes("death") ||
    text.includes("serious injury") ||
    text.includes("life safety") ||
    text.includes("evacuation") ||
    text.includes("emergency") ||
    text.includes("missing person") ||
    text.includes("safeguarding")
  ) {
    return "RED";
  }

  if (responsePath === "ASSURANCE PATH") {
    return "AMBER";
  }

  return "GREEN";
}

function buildDemoCimaAnswer({ question = "", context = {}, path = "FAST PATH" }) {
  const sections = [];

  sections.push("## Executive Summary");

  if (path === "ASSURANCE PATH") {
    sections.push(
      "This has been treated as an assurance-style request. In the production system, the answer would be checked against the approved Source Register, policy abstracts and controlled internal material before being issued."
    );
  } else {
    sections.push(
      "This has been treated as a fast operational request. The immediate priority is to clarify the facts, identify people at risk, stabilise the situation and set a clear next action owner."
    );
  }

  sections.push("");
  sections.push("## Selected Context");
  sections.push(`- Thread: ${safeString(context.thread)}`);
  sections.push(`- Mode: ${safeString(context.mode)}`);
  sections.push(`- Command level: ${safeString(context.level)}`);
  sections.push(`- Persona: ${safeString(context.persona)}`);
  sections.push(`- Requested output: ${safeString(context.output)}`);

  sections.push("");
  sections.push("## Immediate Actions");
  sections.push("- Confirm what is known, what is assumed and what is still unknown.");
  sections.push("- Identify whether anyone is at immediate risk.");
  sections.push("- Set an owner for the next action.");
  sections.push("- Agree the next update time.");
  sections.push("- Record the decision and the reason for it.");

  sections.push("");
  sections.push("## Risk and Safety");
  sections.push("- Do not present uncertain information as confirmed.");
  sections.push("- Separate operational facts from assumptions.");
  sections.push("- Escalate immediately if life safety, safeguarding or public confidence is affected.");
  sections.push("- Keep a clear decision log.");

  sections.push("");
  sections.push("## Information Gaps");
  sections.push("- Exact location and time of incident.");
  sections.push("- Number and status of people affected.");
  sections.push("- Current command owner.");
  sections.push("- Any external authority involvement.");
  sections.push("- Whether a formal assurance or source-cited answer is required.");

  sections.push("");
  sections.push("## Human Review");
  sections.push(
    "This is a CIMA demo response. A responsible human lead must review and approve operational decisions before action."
  );

  return sections.join("\n");
}

export function buildCimaResponse({ question = "", context = {} } = {}) {
  const responsePath = determineResponsePath(question, context);
  const rag = inferRagStatus(question, context, responsePath);

  const hitl = responsePath === "ASSURANCE PATH" || rag === "RED"
    ? "May be required"
    : "Not triggered";

  const confidence = responsePath === "ASSURANCE PATH"
    ? "Requires source check"
    : "Provisional";

  const answer = buildDemoCimaAnswer({
    question,
    context,
    path: responsePath
  });

  return {
    ok: true,
    response_agent_build_iso: CIMA_RESPONSE_AGENT_BUILD_ISO,
    response_path: responsePath,
    path: responsePath,
    rag,
    rag_status: rag,
    hitl,
    confidence,
    source_mode: responsePath === "ASSURANCE PATH"
      ? "Source Register required in production"
      : "Internal first",
    answer,
    sources: responsePath === "ASSURANCE PATH"
      ? [
          {
            title: "Production source-register lookup required",
            type: "placeholder",
            note: "The demo starter backend does not retrieve controlled sources."
          }
        ]
      : []
  };
}

export function getCimaResponseAgentStatus() {
  return {
    ok: true,
    agent: "cima_response_agent",
    response_agent_build_iso: CIMA_RESPONSE_AGENT_BUILD_ISO,
    mode: "demo-no-index"
  };
}
