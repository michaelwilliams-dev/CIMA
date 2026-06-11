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

  const retrievedResults = knowledgeSearch &&
    knowledgeSearch.ok &&
    Array.isArray(knowledgeSearch.results)
      ? knowledgeSearch.results
      : [];

  const sources = retrievedResults.map((item, index) => {
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

  let answer = buildDemoCimaAnswer({
    question,
    context,
    path: responsePath
  });

  if (sources.length > 0) {
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

    answer = `${answer}\n${sourceSections.join("\n")}`;
  }

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
