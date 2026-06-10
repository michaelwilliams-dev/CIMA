/**
 * AIVS / PGB CIMA - Trainer Notes Route
 * File: training/trainer_notes_route.js
 * ISO Timestamp: 2026-06-10T06:35:00Z
 *
 * Purpose:
 * - Registers the /cima-trainer-notes route.
 * - Keeps server.js clean by moving route logic out of server.js.
 *
 * Change Log:
 * - v0.1.0: created standalone route registration file for Trainer Notes.
 *
 * ISO Control Notes:
 * - This route calls the Trainer Notes agent only.
 * - It does not send email.
 * - It writes audit events through the audit function provided by server.js.
 * - It does not use FAISS until the controlled index is connected.
 */

import {
  buildTrainerNotes
} from "./trainer_notes_agent.js";

export function registerTrainerNotesRoute(app, {
  BUILD_ISO,
  writeAuditEvent
}) {
  app.post("/cima-trainer-notes", async (req, res) => {
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
          event_type: "trainer_notes_rejected",
          route: "/cima-trainer-notes",
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
          error: "Terms and Conditions must be confirmed before using the trainer notes agent.",
          build_iso: BUILD_ISO
        });
      }

      if (!question) {
        await writeAuditEvent({
          event_type: "trainer_notes_rejected",
          route: "/cima-trainer-notes",
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

      const trainerNotesOutput = buildTrainerNotes({
        question,
        answer,
        context
      });

      await writeAuditEvent({
        event_type: "trainer_notes_generated",
        route: "/cima-trainer-notes",
        success: true,
        user_email: userEmail,
        access_mode: access.mode || "",
        terms_accepted: true,
        question,
        context_mode: context.mode || "",
        command_level: context.level || "",
        persona: context.persona || "",
        requested_output: context.output || "",
        trainer_notes_agent_build_iso: trainerNotesOutput.trainer_notes_agent_build_iso || "",
        ip_address: req.ip,
        user_agent: req.get("user-agent")
      });

      return res.json({
        ok: true,
        build_iso: BUILD_ISO,
        generated_at: new Date().toISOString(),
        trainer_notes_agent_build_iso: trainerNotesOutput.trainer_notes_agent_build_iso || "",
        trainer_notes: trainerNotesOutput
      });
    } catch (err) {
      console.error("ERROR /cima-trainer-notes failed:", err);

      await writeAuditEvent({
        event_type: "trainer_notes_failed",
        route: "/cima-trainer-notes",
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
        error: "CIMA trainer notes route failed.",
        detail: err.message,
        build_iso: BUILD_ISO
      });
    }
  });
}
