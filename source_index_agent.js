/**
 * AIVS / PGB CIMA - Source Index Agent
 * File: source_index_agent.js
 * ISO Timestamp: 2026-06-10T13:55:00Z
 *
 * Purpose:
 * - Reports the current source/index status for the CIMA system.
 * - Keeps source-index logic outside server.js.
 * - Reports the real FAISS index and metadata files on the Render disk.
 *
 * Change Log:
 * - v0.1.0: created controlled source index status agent.
 * - v0.2.0: tightened readiness checks to require controlled manifest files.
 * - v0.3.0: requires non-empty valid source manifest and retrieval_enabled true in index manifest.
 * - v0.4.0: reports real Render disk FAISS files at /mnt/data/faiss.index and /mnt/data/faiss_metadata.pkl.
 *
 * ISO Control Notes:
 * - This agent reports file readiness only.
 * - This agent does not perform FAISS retrieval.
 * - This agent does not write audit records directly.
 * - Retrieval must not be wired into /cima-chat until the FAISS search agent is explicitly connected and tested.
 */

import fs from "fs";
import path from "path";

const SOURCE_INDEX_AGENT_BUILD_ISO = "2026-06-10T13:55:00Z";

const DEFAULT_SOURCE_ROOT = process.env.CIMA_SOURCE_ROOT || "/mnt/data/cima_sources";
const DEFAULT_INDEX_ROOT = process.env.CIMA_INDEX_ROOT || "/mnt/data/cima_index";

const SOURCE_MANIFEST_PATH =
  process.env.CIMA_SOURCE_MANIFEST_PATH ||
  path.join(DEFAULT_SOURCE_ROOT, "source_manifest.jsonl");

const INDEX_MANIFEST_PATH =
  process.env.CIMA_INDEX_MANIFEST_PATH ||
  path.join(DEFAULT_INDEX_ROOT, "index_manifest.json");

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

function readJsonFile(filePath = "") {
  try {
    if (!fileExists(filePath)) {
      return {
        ok: false,
        data: null,
        error: "File does not exist."
      };
    }

    const raw = fs.readFileSync(filePath, "utf8").trim();

    if (!raw) {
      return {
        ok: false,
        data: null,
        error: "File is empty."
      };
    }

    return {
      ok: true,
      data: JSON.parse(raw),
      error: ""
    };
  } catch (err) {
    return {
      ok: false,
      data: null,
      error: err.message
    };
  }
}

function countJsonlRecords(filePath = "") {
  try {
    if (!fileExists(filePath)) {
      return 0;
    }

    const raw = fs.readFileSync(filePath, "utf8").trim();

    if (!raw) {
      return 0;
    }

    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => {
        try {
          JSON.parse(line);
          return true;
        } catch {
          return false;
        }
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

  const faissIndexStatus = safeStat(FAISS_INDEX_PATH);
  const faissMetadataStatus = safeStat(FAISS_METADATA_PATH);

  const sourceFileCount = countFilesInDirectory(DEFAULT_SOURCE_ROOT);
  const indexFileCount = countFilesInDirectory(DEFAULT_INDEX_ROOT);

  const sourceManifestRecordCount = countJsonlRecords(SOURCE_MANIFEST_PATH);
  const indexManifestRead = readJsonFile(INDEX_MANIFEST_PATH);

  const manifestRetrievalEnabled =
    indexManifestRead.ok &&
    indexManifestRead.data &&
    indexManifestRead.data.retrieval_enabled === true;

  const faiss_index_ready =
    faissIndexStatus.exists &&
    faissIndexStatus.type === "file" &&
    faissIndexStatus.size_bytes > 0;

  const faiss_metadata_ready =
    faissMetadataStatus.exists &&
    faissMetadataStatus.type === "file" &&
    faissMetadataStatus.size_bytes > 0;

  const faiss_files_ready =
    faiss_index_ready &&
    faiss_metadata_ready;

  const source_ready = faiss_metadata_ready;

  const index_ready = faiss_index_ready;

  const retrieval_enabled = false;

  const retrieval_ready = false;

  return {
    ok: true,
    agent: "source_index_agent",
    source_index_agent_build_iso: SOURCE_INDEX_AGENT_BUILD_ISO,
    mode: "faiss-files-detected-status-only",

    source_root: DEFAULT_SOURCE_ROOT,
    index_root: DEFAULT_INDEX_ROOT,
    source_manifest_path: SOURCE_MANIFEST_PATH,
    index_manifest_path: INDEX_MANIFEST_PATH,

    faiss_index_path: FAISS_INDEX_PATH,
    faiss_metadata_path: FAISS_METADATA_PATH,

    source_root_status: sourceRootStatus,
    index_root_status: indexRootStatus,
    source_manifest_status: sourceManifestStatus,
    index_manifest_status: indexManifestStatus,

    faiss_index_status: faissIndexStatus,
    faiss_metadata_status: faissMetadataStatus,

    source_file_count: sourceFileCount,
    index_file_count: indexFileCount,
    source_manifest_record_count: sourceManifestRecordCount,

    index_manifest_valid: indexManifestRead.ok,
    index_manifest_error: indexManifestRead.error,
    manifest_retrieval_enabled: manifestRetrievalEnabled,

    faiss_index_ready,
    faiss_metadata_ready,
    faiss_files_ready,

    source_ready,
    index_ready,
    retrieval_enabled,
    retrieval_ready,

    note: faiss_files_ready
      ? "FAISS files are present on /mnt/data. Retrieval is not yet wired into /cima-chat."
      : "FAISS files are not fully present. Retrieval is not connected."
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
    faiss_index_ready: status.faiss_index_ready,
    faiss_metadata_ready: status.faiss_metadata_ready,
    faiss_files_ready: status.faiss_files_ready,
    retrieval_enabled: status.retrieval_enabled,
    retrieval_ready: status.retrieval_ready,
    summary: status.faiss_files_ready
      ? "FAISS files are present. Retrieval wiring is the next step."
      : "FAISS files are not ready."
  };
}
