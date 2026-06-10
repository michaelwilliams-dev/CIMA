/**
 * AIVS / PGB CIMA - FAISS Knowledge Agent
 * File: retrieval/faiss_knowledge_agent.js
 * ISO Timestamp: 2026-06-10T14:05:00Z
 *
 * Purpose:
 * - Keeps FAISS knowledge-index logic outside server.js.
 * - Reports the real FAISS index and metadata files on the Render disk.
 * - Provides a controlled readiness layer before live retrieval is wired into /cima-chat.
 *
 * Change Log:
 * - v0.1.0: created controlled FAISS knowledge status agent.
 *
 * ISO Control Notes:
 * - This agent does not yet perform live FAISS search.
 * - This agent does not unpickle metadata.
 * - This agent does not write audit records.
 * - Live retrieval must be added as a separate controlled change.
 */

import fs from "fs";

const FAISS_KNOWLEDGE_AGENT_BUILD_ISO = "2026-06-10T14:05:00Z";

const FAISS_INDEX_PATH =
  process.env.CIMA_FAISS_INDEX_PATH ||
  "/mnt/data/faiss.index";

const FAISS_METADATA_PATH =
  process.env.CIMA_FAISS_METADATA_PATH ||
  "/mnt/data/faiss_metadata.pkl";

function fileExists(filePath = "") {
  try {
    return Boolean(filePath) && fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function safeStat(filePath = "") {
  try {
    if (!fileExists(filePath)) {
      return {
        exists: false,
        path: filePath,
        type: "missing",
        size_bytes: 0
      };
    }

    const stat = fs.statSync(filePath);

    return {
      exists: true,
      path: filePath,
      type: stat.isDirectory() ? "directory" : "file",
      size_bytes: stat.size,
      modified_at: stat.mtime.toISOString()
    };
  } catch (err) {
    return {
      exists: false,
      path: filePath,
      type: "error",
      size_bytes: 0,
      error: err.message
    };
  }
}

export function getFaissKnowledgeAgentStatus() {
  const indexStatus = safeStat(FAISS_INDEX_PATH);
  const metadataStatus = safeStat(FAISS_METADATA_PATH);

  const indexReady =
    indexStatus.exists &&
    indexStatus.type === "file" &&
    indexStatus.size_bytes > 0;

  const metadataReady =
    metadataStatus.exists &&
    metadataStatus.type === "file" &&
    metadataStatus.size_bytes > 0;

  const filesReady = indexReady && metadataReady;

  return {
    ok: true,
    agent: "faiss_knowledge_agent",
    faiss_knowledge_agent_build_iso: FAISS_KNOWLEDGE_AGENT_BUILD_ISO,
    mode: "status-only-no-live-search",
    faiss_index_path: FAISS_INDEX_PATH,
    faiss_metadata_path: FAISS_METADATA_PATH,
    faiss_index_status: indexStatus,
    faiss_metadata_status: metadataStatus,
    faiss_index_ready: indexReady,
    faiss_metadata_ready: metadataReady,
    faiss_files_ready: filesReady,
    retrieval_enabled: false,
    retrieval_ready: false,
    python_faiss_required: true,
    note: filesReady
      ? "FAISS files are present. Live search is not yet enabled because the search runtime has not been wired."
      : "FAISS files are not ready."
  };
}

export function getFaissKnowledgeReadinessSummary() {
  const status = getFaissKnowledgeAgentStatus();

  return {
    ok: true,
    agent: "faiss_knowledge_agent",
    faiss_knowledge_agent_build_iso: FAISS_KNOWLEDGE_AGENT_BUILD_ISO,
    faiss_files_ready: status.faiss_files_ready,
    retrieval_enabled: status.retrieval_enabled,
    retrieval_ready: status.retrieval_ready,
    summary: status.faiss_files_ready
      ? "FAISS files are present. Live retrieval wiring is the next step."
      : "FAISS files are not ready."
  };
}
