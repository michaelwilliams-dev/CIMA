/**
 * AIVS / PGB CIMA - Source Index Agent
 * File: source_index_agent.js
 * ISO Timestamp: 2026-06-05T07:05:00Z
 *
 * Purpose:
 * - Reports the current source/index status for the CIMA system.
 * - Keeps source-index logic outside server.js.
 * - Provides a controlled status layer before FAISS/source retrieval is connected.
 *
 * Change Log:
 * - v0.1.0: created controlled source index status agent.
 * - v0.2.0: tightened readiness checks to require controlled manifest files.
 *
 * ISO Control Notes:
 * - This agent must not invent source availability.
 * - This agent must report clearly when no source index is connected.
 * - This agent must not perform uncontrolled retrieval.
 * - This agent must not write audit records directly.
 * - Future source retrieval must use approved indexed material only.
 */

import fs from "fs";
import path from "path";

const SOURCE_INDEX_AGENT_BUILD_ISO = "2026-06-05T07:05:00Z";

const DEFAULT_SOURCE_ROOT = process.env.CIMA_SOURCE_ROOT || "/mnt/data/cima_sources";
const DEFAULT_INDEX_ROOT = process.env.CIMA_INDEX_ROOT || "/mnt/data/cima_index";

const SOURCE_MANIFEST_PATH =
  process.env.CIMA_SOURCE_MANIFEST_PATH ||
  path.join(DEFAULT_SOURCE_ROOT, "source_manifest.jsonl");

const INDEX_MANIFEST_PATH =
  process.env.CIMA_INDEX_MANIFEST_PATH ||
  path.join(DEFAULT_INDEX_ROOT, "index_manifest.json");

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

function countFilesInDirectory(dirPath = "") {
  try {
    if (!fileExists(dirPath)) {
      return 0;
    }

    const stat = fs.statSync(dirPath);

    if (!stat.isDirectory()) {
      return 0;
    }

    return fs.readdirSync(dirPath).filter((item) => {
      const fullPath = path.join(dirPath, item);
      return fs.statSync(fullPath).isFile();
    }).length;
  } catch {
    return 0;
  }
}

export function getSourceIndexAgentStatus() {
  const sourceRootStatus = safeStat(DEFAULT_SOURCE_ROOT);
  const indexRootStatus = safeStat(DEFAULT_INDEX_ROOT);
  const sourceManifestStatus = safeStat(SOURCE_MANIFEST_PATH);
  const indexManifestStatus = safeStat(INDEX_MANIFEST_PATH);

  const sourceFileCount = countFilesInDirectory(DEFAULT_SOURCE_ROOT);
  const indexFileCount = countFilesInDirectory(DEFAULT_INDEX_ROOT);

  const source_ready =
    sourceRootStatus.exists &&
    sourceRootStatus.type === "directory" &&
    sourceManifestStatus.exists &&
    sourceManifestStatus.type === "file";

  const index_ready =
    indexRootStatus.exists &&
    indexRootStatus.type === "directory" &&
    indexManifestStatus.exists &&
    indexManifestStatus.type === "file";

  return {
    ok: true,
    agent: "source_index_agent",
    source_index_agent_build_iso: SOURCE_INDEX_AGENT_BUILD_ISO,
    mode: "status-only-no-retrieval",
    source_root: DEFAULT_SOURCE_ROOT,
    index_root: DEFAULT_INDEX_ROOT,
    source_manifest_path: SOURCE_MANIFEST_PATH,
    index_manifest_path: INDEX_MANIFEST_PATH,
    source_root_status: sourceRootStatus,
    index_root_status: indexRootStatus,
    source_manifest_status: sourceManifestStatus,
    index_manifest_status: indexManifestStatus,
    source_file_count: sourceFileCount,
    index_file_count: indexFileCount,
    source_ready,
    index_ready,
    retrieval_ready: false,
    note: "CIMA source/index retrieval is not connected yet. Readiness requires controlled manifest files."
  };
}

export function getSourceIndexReadinessSummary() {
  const status = getSourceIndexAgentStatus();

  return {
    ok: true,
    agent: "source_index_agent",
    source_index_agent_build_iso: SOURCE_INDEX_AGENT_BUILD_ISO,
    source_ready: status.source_ready,
    index_ready: status.index_ready,
    retrieval_ready: status.retrieval_ready,
    summary: status.retrieval_ready
      ? "Source retrieval is connected."
      : "Source retrieval is not connected yet."
  };
}
