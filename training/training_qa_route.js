/**
 * AIVS / PGB CIMA - Training Questions and Answers Route
 * File: training/training_qa_route.js
 * ISO Timestamp: 2026-06-09T18:15:00Z
 *
 * Purpose:
 * - Registers the /cima-training-qa route.
 * - Keeps server.js clean by moving route logic out of server.js.
 *
 * Change Log:
 * - v0.1.0: created standalone route registration file for Training Questions and Answers.
 *
 * ISO Control Notes:
 * - This route calls the Training Questions and Answers agent only.
 * - It does not send email.
 * - It writes audit events through the audit function provided by server.js.
 * - It does not use FAISS until the controlled index is connected.
 */

import {
  buildTrainingQa
} from "./training_qa_agent.js";

export function registerTrainingQaRoute(app, {
  BUILD_ISO,
  writeAuditEvent
}) {
  app.post("/cima-training-qa", async (req, res) => {
    const question = String(req.body.question || "").trim();

    const answer = String(
      req.body.answer ||
      req.body.cima_answer ||
      ""
    ).trim();

    const context = req.body.context && typeof req.body.context === "object"
      ? req.body.context
      : {};

    const terms = req.body.terms && typeof req.body.terms === "object"
      ? req.body.terms
      : {};

    const access = req.body.access && typeof req.body.access === "object"
      ? req.body.access
      : {};

    const userEmail = String(
      access.email ||
      req.body.email ||
      req.body.user_email ||
      ""
    ).trim();

    try {
      if (!terms.accepted) {
        await writeAuditEvent({
          event_type: "training_qa_rejected",
          route: "/cima-training-qa",
          success: false,
          error: "Terms and Conditions not accepted.",
          user_email: userEmail,
          access_mode: access.mode || "",
          terms_accepted: false,
          question,
          context_mode: context.mode || "",
          command_level: context.level || "",
          persona: context.persona || "",
          requested_output: context.output || "",
          ip_address: req.ip,
          user_agent: req.get("user-agent")
        });

        return res.status(403).json({
          ok: false,
          error: "Terms and Conditions must be confirmed before using the training questions and answers agent.",
          build_iso: BUILD_ISO
        });
      }

      if (!question) {
        await writeAuditEvent({
          event_type: "training_qa_rejected",
          route: "/cima-training-qa",
          success: false,
          error: "Question required.",
          user_email: userEmail,
          access_mode: access.mode || "",
          terms_accepted: true,
          question,
          context_mode: context.mode || "",
          command_level: context.level || "",
          persona: context.persona || "",
          requested_output: context.output || "",
          ip_address: req.ip,
          user_agent: req.get("user-agent")
        });

        return res.status(400).json({
          ok: false,
          error: "Question required.",
          build_iso: BUILD_ISO
        });
      }

      const qaOutput = buildTrainingQa({
        question,
        answer,
        context
      });

      await writeAuditEvent({
        event_type: "training_qa_generated",
        route: "/cima-training-qa",
        success: true,
        user_email: userEmail,
        access_mode: access.mode || "",
        terms_accepted: true,
        question,
        context_mode: context.mode || "",
        command_level: context.level || "",
        persona: context.persona || "",
        requested_output: context.output || "",
        training_qa_agent_build_iso: qaOutput.training_qa_agent_build_iso || "",
        ip_address: req.ip,
        user_agent: req.get("user-agent")
      });

      return res.json({
        ok: true,
        build_iso: BUILD_ISO,
        generated_at: new Date().toISOString(),
        training_qa_agent_build_iso: qaOutput.training_qa_agent_build_iso || "",
        qa: qaOutput
      });
    } catch (err) {
      console.error("ERROR /cima-training-qa failed:", err);

      await writeAuditEvent({
        event_type: "training_qa_failed",
        route: "/cima-training-qa",
        success: false,
        error: err.message,
        user_email: userEmail,
        access_mode: access.mode || "",
        terms_accepted: terms.accepted === true,
        question,
        context_mode: context.mode || "",
        command_level: context.level || "",
        persona: context.persona || "",
        requested_output: context.output || "",
        ip_address: req.ip,
        user_agent: req.get("user-agent")
      });

      return res.status(500).json({
        ok: false,
        error: "CIMA training questions and answers route failed.",
        detail: err.message,
        build_iso: BUILD_ISO
      });
    }
  });
}
