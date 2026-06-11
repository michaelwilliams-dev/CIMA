/**
 * AIVS / PGB CIMA - FAISS Knowledge Agent
 * File: retrieval/faiss_knowledge_agent.js
 * ISO Timestamp: 2026-06-11T08:45:00Z
 *
 * Purpose:
 * - Keeps CIMA knowledge-index logic outside server.js.
 * - Reports the real FAISS index, metadata, and chunk files on the Render disk.
 * - Provides a controlled keyword retrieval layer before live FAISS semantic retrieval is wired.
 *
 * Change Log:
 * - v0.1.0: created controlled FAISS knowledge status agent.
 * - v0.2.0: added streaming keyword retrieval from faiss_chunks.jsonl.
 *
 * ISO Control Notes:
 * - This agent does not unpickle faiss_metadata.pkl.
 * - This agent does not load the 1.2GB JSONL file into memory.
 * - This agent streams faiss_chunks.jsonl line by line.
 * - This agent does not write audit records.
 * - This agent does not yet perform FAISS vector search.
 * - Live wiring into /cima-chat must be added as a separate controlled change.
 */

import fs from "fs";
import readline from "readline";

const FAISS_KNOWLEDGE_AGENT_BUILD_ISO = "2026-06-11T08:45:00Z";

const FAISS_INDEX_PATH =
  process.env.CIMA_FAISS_INDEX_PATH ||
  process.env.VECTOR_PATH ||
  "/mnt/data/faiss.index";

const FAISS_METADATA_PATH =
  process.env.CIMA_FAISS_METADATA_PATH ||
  "/mnt/data/faiss_metadata.pkl";

const CHUNKS_METADATA_PATH =
  process.env.CIMA_CHUNKS_METADATA_PATH ||
  process.env.CHUNKS_METADATA_PATH ||
  process.env.META_PATH ||
  "/mnt/data/faiss_chunks.jsonl";

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

function normaliseText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildQueryTerms(query = "") {
  const baseTerms = normaliseText(query)
    .split(" ")
    .filter((term) => term.length >= 3);

  const uniqueTerms = Array.from(new Set(baseTerms));

  return uniqueTerms.slice(0, 12);
}

function countOccurrences(haystack = "", needle = "") {
  if (!haystack || !needle) return 0;

  let count = 0;
  let index = 0;

  while (true) {
    index = haystack.indexOf(needle, index);

    if (index === -1) break;

    count += 1;
    index += needle.length;
  }

  return count;
}

function scoreRecord(record, rawLine, terms) {
  const text = String(record.text || "");
  const sourceFile = String(record.source_file || "");
  const sourceCollection = String(record.source_collection || "");
  const sourceType = String(record.source_type || "");

  const searchable = normaliseText([
    text,
    sourceFile,
    sourceCollection,
    sourceType,
    rawLine
  ].join(" "));

  let score = 0;
  const matchedTerms = [];

  for (const term of terms) {
    const count = countOccurrences(searchable, term);

    if (count > 0) {
      matchedTerms.push(term);
      score += count;
    }
  }

  if (matchedTerms.includes("jesip")) score += 25;
  if (matchedTerms.includes("joint")) score += 5;
  if (matchedTerms.includes("doctrine")) score += 5;
  if (matchedTerms.includes("interoperability")) score += 10;
  if (matchedTerms.includes("command")) score += 5;
  if (sourceFile.toLowerCase().includes("jesip")) score += 20;

  return {
    score,
    matched_terms: matchedTerms
  };
}

function makeSnippet(text = "", maxLength = 1200) {
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .trim();

  if (clean.length <= maxLength) return clean;

  return clean.slice(0, maxLength) + "...";
}

export function getFaissKnowledgeAgentStatus() {
  const indexStatus = safeStat(FAISS_INDEX_PATH);
  const metadataStatus = safeStat(FAISS_METADATA_PATH);
  const chunksStatus = safeStat(CHUNKS_METADATA_PATH);

  const indexReady =
    indexStatus.exists &&
    indexStatus.type === "file" &&
    indexStatus.size_bytes > 0;

  const metadataReady =
    metadataStatus.exists &&
    metadataStatus.type === "file" &&
    metadataStatus.size_bytes > 0;

  const chunksReady =
    chunksStatus.exists &&
    chunksStatus.type === "file" &&
    chunksStatus.size_bytes > 0;

  const filesReady = indexReady && metadataReady && chunksReady;

  return {
    ok: true,
    agent: "faiss_knowledge_agent",
    faiss_knowledge_agent_build_iso: FAISS_KNOWLEDGE_AGENT_BUILD_ISO,
    mode: "keyword-retrieval-ready-no-faiss-vector-search",
    faiss_index_path: FAISS_INDEX_PATH,
    faiss_metadata_path: FAISS_METADATA_PATH,
    chunks_metadata_path: CHUNKS_METADATA_PATH,
    faiss_index_status: indexStatus,
    faiss_metadata_status: metadataStatus,
    chunks_metadata_status: chunksStatus,
    faiss_index_ready: indexReady,
    faiss_metadata_ready: metadataReady,
    chunks_metadata_ready: chunksReady,
    faiss_files_ready: filesReady,
    retrieval_enabled: chunksReady,
    retrieval_ready: chunksReady,
    python_faiss_required: false,
    faiss_vector_search_enabled: false,
    note: chunksReady
      ? "Chunk keyword retrieval is available. FAISS vector search is not yet enabled."
      : "Chunk file is not ready."
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
    summary: status.retrieval_ready
      ? "Chunk keyword retrieval is ready. FAISS vector search remains disabled."
      : "Knowledge retrieval is not ready."
  };
}

export async function searchFaissKnowledgeByKeyword(query = "", options = {}) {
  const status = getFaissKnowledgeAgentStatus();

  const maxResults = Number.isFinite(options.maxResults)
    ? Math.max(1, Math.min(options.maxResults, 20))
    : 6;

  const maxLines = Number.isFinite(options.maxLines)
    ? Math.max(1, options.maxLines)
    : 250000;

  const terms = buildQueryTerms(query);

  if (!query || terms.length === 0) {
    return {
      ok: false,
      agent: "faiss_knowledge_agent",
      mode: "keyword",
      query,
      results: [],
      error: "No usable query terms were supplied."
    };
  }

  if (!status.chunks_metadata_ready) {
    return {
      ok: false,
      agent: "faiss_knowledge_agent",
      mode: "keyword",
      query,
      results: [],
      error: "Chunks metadata file is not ready.",
      status
    };
  }

  const candidates = [];
  let scannedLines = 0;
  let parsedLines = 0;

  const stream = fs.createReadStream(CHUNKS_METADATA_PATH, {
    encoding: "utf8"
  });

  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    scannedLines += 1;

    if (scannedLines > maxLines) {
      break;
    }

    const rawLine = String(line || "");

    if (!rawLine.trim()) {
      continue;
    }

    let record;

    try {
      record = JSON.parse(rawLine);
      parsedLines += 1;
    } catch {
      continue;
    }

    const scored = scoreRecord(record, rawLine, terms);

    if (scored.score <= 0) {
      continue;
    }

    candidates.push({
      score: scored.score,
      matched_terms: scored.matched_terms,
      chunk_id: record.chunk_id || "",
      chunk_index: record.chunk_index,
      source_collection: record.source_collection || "",
      source_file: record.source_file || "",
      source_folder: record.source_folder || "",
      source_type: record.source_type || "",
      text: record.text || "",
      snippet: makeSnippet(record.text || "")
    });

    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length > maxResults * 4) {
      candidates.length = maxResults * 4;
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const results = candidates.slice(0, maxResults);

  return {
    ok: true,
    agent: "faiss_knowledge_agent",
    faiss_knowledge_agent_build_iso: FAISS_KNOWLEDGE_AGENT_BUILD_ISO,
    mode: "keyword",
    query,
    terms,
    chunks_metadata_path: CHUNKS_METADATA_PATH,
    scanned_lines: scannedLines,
    parsed_lines: parsedLines,
    result_count: results.length,
    results
  };
}
