/**
 * AIVS / PGB CIMA - Response Agent
 * File: cima_response_agent.js
 * ISO Timestamp: 2026-06-11T08:30:00Z
 *
 * Purpose:
 * - Builds the CIMA demo response outside server.js.
 * - Preserves the existing fast-path demo response structure.
 * - Adds support for source evidence retrieved by the CIMA knowledge agent.
 *
 * Change Log:
 * - v0.1.0: created controlled CIMA response agent.
 * - v0.2.0: added selected context display.
 * - v0.3.0: added evidence date range display.
 * - v0.4.0: accepts knowledgeSearch and returns retrieved source evidence.
 *
 * ISO Control Notes:
 * - This is still a demo operational support response.
 * - All outputs require human review before operational reliance.
 * - Source retrieval is keyword-index based at this stage.
 * - FAISS semantic vector search is not yet used in this response agent.
 */

const CIMA_RESPONSE_AGENT_BUILD_ISO = "2026-06-11T08:30:00Z";

function safeString(value = "") {
  if (value === null || value === undefined || value === "") {
    return "Not supplied";
  }

  return String(value);
}

function normalise(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function determineResponsePath(question = "", context = {}) {
  const combined = normalise([
    question,
    context.mode,
    context.level,
    context.persona,
    context.output,
    context.thread
  ].join(" "));

  const assuranceTerms = [
    "legal",
    "statutory",
    "regulatory",
    "compliance",
    "audit",
    "evidence",
    "source",
    "cite",
    "citation",
    "formal",
    "board",
    "minister",
    "public inquiry",
    "fatality",
    "death",
    "serious injury",
    "terrorism",
    "terrorist",
    "attack",
    "safeguarding",
    "evacuation",
    "mass casualty",
    "major incident",
    "life safety"
  ];

  for (const term of assuranceTerms) {
    if (combined.includes(term)) {
      return "ASSURANCE PATH";
    }
  }

  return "FAST PATH";
}

function inferRagStatus(question = "", context = {}, responsePath = "FAST PATH") {
  const combined = normalise([
    question,
    context.mode,
    context.level,
    context.persona,
    context.output
  ].join(" "));

  const redTerms = [
    "fatality",
    "death",
    "terrorism",
    "terrorist",
    "attack",
    "explosion",
    "firearms",
    "bomb",
    "evacuation",
    "mass casualty",
    "public disorder",
    "safeguarding",
    "life safety"
  ];

  const amberTerms = [
    "risk",
    "incident",
    "major incident",
    "multi agency",
    "command",
    "gold",
    "silver",
    "bronze",
    "media",
    "reputation",
    "assurance",
    "compliance"
  ];

  for (const term of redTerms) {
    if (combined.includes(term)) {
      return "RED";
    }
  }

  for (const term of amberTerms) {
    if (combined.includes(term)) {
      return "AMBER";
    }
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
      "This has been treated as an assurance-led operational request. The immediate priority is to separate confirmed facts from assumptions, identify risk to people or public confidence, and preserve a clear decision record."
    );
  } else {
    sections.push(
      "This has been treated as a fast operational request. The immediate priority is to clarify the facts, identify people at risk, stabilise the situation and set a clear next action owner."
    );
  }

  sections.push("");


  sections.push("");
  sections.push("## Immediate Actions");
  sections.push("- Confirm what is known, what is assumed and what is still unknown.");
  sections.push("- Identify whether anyone is at immediate risk.");
  sections.push("- Set an owner for the next action.");
  sections.push("- Agree the next update time.");
  sections.push("- Record the decision and the reason for it.");

  if (path === "ASSURANCE PATH") {
    sections.push("- Check the relevant source material before issuing a formal position.");
    sections.push("- Preserve the source trail used to support the answer.");
  }

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

function buildSourcesFromKnowledgeSearch(knowledgeSearch = null) {
  const retrievedResults = knowledgeSearch &&
    knowledgeSearch.ok &&
    Array.isArray(knowledgeSearch.results)
      ? knowledgeSearch.results
      : [];

  return retrievedResults.map((item, index) => {
    return {
      title: item.source_file || `Retrieved source ${index + 1}`,
      type: "keyword-chunk",
      chunk_id: item.chunk_id || "",
      score: item.score,
      matched_terms: item.matched_terms || [],
      source_file: item.source_file || "",
      source_collection: item.source_collection || "",
      source_type: item.source_type || "",
      snippet: item.snippet || ""
    };
  });
}

function appendSourceEvidenceToAnswer(answer = "", sources = []) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return answer;
  }

  const sourceSections = [];

  sourceSections.push("");
  sourceSections.push("## Retrieved Source Evidence");
  sourceSections.push(
    "The following source material was retrieved from the CIMA knowledge index for this demo response."
  );

  sources.slice(0, 5).forEach((source, index) => {
    sourceSections.push("");
    sourceSections.push(`### Source ${index + 1}`);
    sourceSections.push(`- Chunk ID: ${source.chunk_id || "Not supplied"}`);
    sourceSections.push(`- Source file: ${source.source_file || "Not supplied"}`);
    sourceSections.push(`- Match score: ${source.score}`);
    sourceSections.push("");

    sourceSections.push(source.snippet || "No snippet available.");
  });

  return `${answer}\n${sourceSections.join("\n")}`;
}

export function buildCimaResponse({
  question = "",
  context = {},
  knowledgeSearch = null
} = {}) {
  const responsePath = determineResponsePath(question, context);
  const rag = inferRagStatus(question, context, responsePath);

  const hitl = responsePath === "ASSURANCE PATH" || rag === "RED"
    ? "May be required"
    : "Not triggered";

  const confidence = responsePath === "ASSURANCE PATH"
    ? "Requires source check"
    : "Provisional";

  const sources = buildSourcesFromKnowledgeSearch(knowledgeSearch);

  let answer = buildDemoCimaAnswer({
    question,
    context,
    path: responsePath
  });

  answer = appendSourceEvidenceToAnswer(answer, sources);

  return {
    ok: true,
    response_agent_build_iso: CIMA_RESPONSE_AGENT_BUILD_ISO,
    response_path: responsePath,
    path: responsePath,
    rag,
    rag_status: rag,
    hitl,
    confidence,
    source_mode: sources.length > 0
      ? "CIMA keyword index retrieval"
      : responsePath === "ASSURANCE PATH"
        ? "Source Register required in production"
        : "Internal first",
    answer,
    sources
  };
}

export function getCimaResponseAgentStatus() {
  return {
    ok: true,
    agent: "cima_response_agent",
    response_agent_build_iso: CIMA_RESPONSE_AGENT_BUILD_ISO,
    mode: "demo-response-with-keyword-source-evidence",
    source_evidence_supported: true,
    faiss_vector_search_enabled: false,
    human_review_required: true
  };
}
