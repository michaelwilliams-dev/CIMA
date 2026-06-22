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
      "This has been treated as an assurance-led operational request. The response should be handled carefully because the question may involve public safety, governance, legal exposure, regulatory assurance, reputational risk or post-incident accountability. The first task is to separate confirmed facts from assumptions, identify immediate risk, preserve evidence and make sure that any formal position is checked before it is relied upon."
    );
  } else {
    sections.push(
      "This has been treated as a fast operational request. The priority is to build an immediate working picture, protect people, stabilise the situation and give the responsible lead a clear structure for action. The answer is intended to support early decision making, not replace the judgement of the Gold, Silver, Bronze, venue, security, safeguarding or emergency-service lead."
    );
  }

  sections.push("");
  sections.push("## Situation Framing");
  sections.push(
    "The incident should first be framed around what is known, what is believed, what is uncertain and what could change quickly. In the opening period of any serious incident, the greatest risk is often confusion: different teams may hold different facts, witnesses may provide incomplete accounts, and early reports may overstate or understate the seriousness of the event."
  );
  sections.push(
    "The lead should therefore establish a single current operating picture, identify the most reliable sources of information, and avoid allowing unconfirmed information to drive irreversible decisions."
  );

  sections.push("");
  sections.push("## Immediate Actions");
  sections.push("- Confirm the exact location, time, nature and current status of the incident.");
  sections.push("- Identify whether anyone is injured, missing, trapped, vulnerable, exposed to danger or otherwise at immediate risk.");
  sections.push("- Establish who currently has command responsibility and who is authorised to make decisions.");
  sections.push("- Separate confirmed facts from assumptions, rumours and unverified reports.");
  sections.push("- Set an immediate action owner for each priority task.");
  sections.push("- Agree the next update time so that the situation is reviewed on a controlled cycle.");
  sections.push("- Start a decision log recording what was decided, by whom, when and on what information.");

  if (path === "ASSURANCE PATH") {
    sections.push("- Check relevant policy, statutory, safety or source material before issuing any formal position.");
    sections.push("- Preserve the source trail used to support the response.");
    sections.push("- Avoid public, legal, regulatory or board-level statements until the evidence base has been checked.");
  }

  sections.push("");
  sections.push("## Command and Coordination");
  sections.push(
    "The responsible lead should establish a simple command structure immediately. This does not need to be complicated, but it must be clear. People involved in the incident should know who is coordinating the response, who is gathering information, who is managing communications, who is liaising with emergency services and who is keeping the formal record."
  );
  sections.push("- Confirm whether Gold, Silver and Bronze command arrangements are required.");
  sections.push("- Identify the lead for operational control, communications, welfare, security, safeguarding and evidence capture.");
  sections.push("- Confirm whether police, ambulance, fire, local authority or other partners have been notified or need to be notified.");
  sections.push("- Make sure internal teams do not issue conflicting instructions.");

  sections.push("");
  sections.push("## Risk and Safety");
  sections.push(
    "Risk should be assessed in practical terms. The question is not only what has happened, but what could happen next if the situation deteriorates, if crowds move unexpectedly, if communications fail, or if vulnerable people are not identified quickly."
  );
  sections.push("- Do not present uncertain information as confirmed.");
  sections.push("- Escalate immediately if life safety, safeguarding, public disorder, terrorism, evacuation, medical risk or serious welfare concerns are present.");
  sections.push("- Consider whether vulnerable people, children, older people, disabled people or isolated individuals may need specific support.");
  sections.push("- Keep access routes, emergency routes and communication routes clear.");
  sections.push("- Reassess the risk after each new confirmed fact.");

  sections.push("");
  sections.push("## Communications");
  sections.push(
    "Communication should be controlled, factual and timed. Early communication should focus on safety instructions, reassurance where appropriate, and internal alignment. Public or external statements should not go beyond what is confirmed."
  );
  sections.push("- Nominate one communications lead.");
  sections.push("- Use short factual updates rather than speculative explanations.");
  sections.push("- Tell staff what they can say, what they must not say, and where to refer questions.");
  sections.push("- Record any external messages issued.");
  sections.push("- Prepare a holding statement if public, media or stakeholder interest is likely.");

  sections.push("");
  sections.push("## Information Gaps");
  sections.push("- Exact location and time of incident.");
  sections.push("- Number and status of people affected.");
  sections.push("- Current command owner.");
  sections.push("- Whether emergency services are involved.");
  sections.push("- Whether there are vulnerable people requiring support.");
  sections.push("- Whether there is an ongoing threat.");
  sections.push("- Whether evacuation, lockdown, shelter, dispersal or medical support is required.");
  sections.push("- Whether a formal assurance or source-cited answer is required.");

  sections.push("");
  sections.push("## Decision Log");
  sections.push(
    "A clear decision log should be started as soon as possible. It should record the time of each decision, the person making it, the information available at the time, the action chosen, alternatives considered where relevant, and the next review point."
  );
  sections.push("- Record decisions in plain language.");
  sections.push("- Record uncertainty rather than hiding it.");
  sections.push("- Record who owns each follow-up action.");
  sections.push("- Preserve the audit trail for later review.");

  sections.push("");
  sections.push("## Human Review");
  sections.push(
        "This is a CIMA operational support response. It is draft support only. A responsible human lead must review the facts, local procedures, live risks and source material before relying on the answer or taking operational action."
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
    return [
      answer,
      "",
      "## Source Status",
      "Approved sources were checked, but no indexed source records were returned for this response. The answer is based on the CIMA response agent structure, the user question, the selected context and the current session payload only. Human review remains required before operational use."
    ].join("\n");
  }

  function extractUrl(text = "") {
    const match = String(text || "").match(/SOURCE_URL:\s*(https?:\/\/\S+)/i);
    return match ? match[1].trim() : "";
  }

  function cleanText(value = "") {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isNonOperationalSource(source = {}, url = "") {
    const combined = [
      url,
      source.source_file,
      source.title,
      source.snippet
    ].join(" ").toLowerCase();

    const blockedTerms = [
      "accessibility",
      "accessibility_statement",
      "privacy",
      "privacy_notice",
      "cookie",
      "cookies",
      "terms",
      "terms_of_use",
      "contact",
      "about_npsa",
      "about-us",
      "about_us",
      "sitemap"
    ];

    const blockedExtensions = [
      ".css",
      ".js",
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".svg",
      ".webp",
      ".woff",
      ".woff2",
      ".ttf",
      ".eot",
      ".ico",
      ".map"
    ];

    return (
      blockedTerms.some((term) => combined.includes(term)) ||
      blockedExtensions.some((extension) => combined.includes(extension))
    );
  }

  const seen = new Set();
  const usableSources = [];
  const excludedSources = [];

  for (const source of sources) {
    const url = extractUrl(source.snippet || "");
    const sourceName = cleanText(source.source_file || source.title || "");

    const key = [
      sourceName,
      cleanText(source.chunk_id || ""),
      url
    ].join("|");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    if (isNonOperationalSource(source, url)) {
      excludedSources.push({
        source_name: sourceName || "Non-operational indexed source",
        url
      });
      continue;
    }

    usableSources.push({
      source_name: sourceName || "Approved indexed source",
      url
    });
  }

  const sourceStatus = [];

  sourceStatus.push("");
  sourceStatus.push("## Source Status");

  if (usableSources.length > 0) {
    sourceStatus.push(
      `Approved sources were checked. ${usableSources.length} relevant indexed source record${usableSources.length === 1 ? " was" : "s were"} identified from the CIMA knowledge store.`
    );
  } else {
    sourceStatus.push(
      "Approved sources were checked, but no usable operational source record remained after filtering out non-operational material."
    );
  }

  if (excludedSources.length > 0) {
    sourceStatus.push(
      `${excludedSources.length} non-operational source record${excludedSources.length === 1 ? " was" : "s were"} excluded from reliance because it appeared to relate to website, accessibility, privacy, contact, asset or other non-operational material.`
    );
  }

  sourceStatus.push(
    "Detailed retrieval metadata, including file paths, chunk IDs, retrieval scores, matched terms and source URLs, should remain available for audit and technical review, but is not shown in the main user-facing answer."
  );

  sourceStatus.push(
    "Human review remains required before operational, legal, public, assurance or safety-critical use."
  );

  return `${answer}\n${sourceStatus.join("\n")}`;
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
