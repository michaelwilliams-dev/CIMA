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
