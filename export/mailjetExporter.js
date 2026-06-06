// agents/email_agent.js
// ISO Timestamp: 2026-06-02T13:40:00Z
// Purpose: Controlled Mailjet email agent for AIVS / PGB CIMA

import MailjetPackage from "node-mailjet";

const EMAIL_AGENT_BUILD_ISO = "2026-06-02T13:40:00Z";

function envValue(...names) {
  for (const name of names) {
    const value = String(process.env[name] || "").trim();

    if (value) {
      return value;
    }
  }

  return "";
}

function requiredEnv(...names) {
  const value = envValue(...names);

  if (!value) {
    throw new Error(`${names.join(" or ")} environment variable is not set.`);
  }

  return value;
}

function escapeHtml(value = "") {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normaliseEmailList(value) {
  if (Array.isArray(value)) {
    return value
      .map((email) => String(email || "").trim())
      .filter((email) => email.includes("@"));
  }

  return String(value || "")
    .split(/[;,]/)
    .map((email) => email.trim())
    .filter((email) => email.includes("@"));
}

function getMailjetClient() {
  const apiKey = requiredEnv("MAILJET_API_KEY", "MJ_APIKEY_PUBLIC");
  const apiSecret = requiredEnv("MAILJET_API_SECRET", "MJ_APIKEY_PRIVATE");

  const Mailjet = MailjetPackage?.default || MailjetPackage;

  if (Mailjet?.apiConnect) {
    return Mailjet.apiConnect(apiKey, apiSecret);
  }

  return new Mailjet({
    apiKey,
    apiSecret
  });
}

function buildAttachments({
  pdfBuffer,
  pdfFilename,
  docxBuffer,
  docxFilename,
  attachments = []
}) {
  const output = [];

  if (pdfBuffer && pdfFilename) {
    output.push({
      ContentType: "application/pdf",
      Filename: pdfFilename,
      Base64Content: pdfBuffer.toString("base64")
    });
  }

  if (docxBuffer && docxFilename) {
    output.push({
      ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      Filename: docxFilename,
      Base64Content: docxBuffer.toString("base64")
    });
  }

  if (Array.isArray(attachments)) {
    for (const attachment of attachments) {
      if (
        attachment &&
        attachment.ContentType &&
        attachment.Filename &&
        attachment.Base64Content
      ) {
        output.push(attachment);
      }
    }
  }

  return output;
}

export async function sendCimaEmail({
  toEmails,
  toEmail,
  secondEmail,
  subject,
  bodyText,
  htmlPart,
  pdfBuffer,
  pdfFilename,
  docxBuffer,
  docxFilename,
  attachments = []
}) {
  const recipients = normaliseEmailList(
    toEmails || [toEmail, secondEmail]
  );

  if (!recipients.length) {
    throw new Error("At least one valid recipient email address is required.");
  }

  const fromEmail = requiredEnv("MAILJET_FROM_EMAIL", "MJ_FROM_EMAIL");
  const fromName = envValue("MAILJET_FROM_NAME", "MJ_FROM_NAME") || "AIVS Software Limited";

  const mailjet = getMailjetClient();

  const message = {
    From: {
      Email: fromEmail,
      Name: fromName
    },
    To: recipients.map((email) => ({
      Email: email
    })),
    Subject: String(subject || "PGB CIMA email").trim(),
    TextPart: String(bodyText || ""),
    HTMLPart: htmlPart || `<pre>${escapeHtml(bodyText || "")}</pre>`,
    Attachments: buildAttachments({
      pdfBuffer,
      pdfFilename,
      docxBuffer,
      docxFilename,
      attachments
    })
  };

  const response = await mailjet
    .post("send", { version: "v3.1" })
    .request({
      Messages: [message]
    });

  const providerMessage = response?.body?.Messages?.[0] || {};

  return {
    ok: true,
    provider: "Mailjet",
    email_agent_build_iso: EMAIL_AGENT_BUILD_ISO,
    status: providerMessage.Status || "sent",
    to: recipients
  };
}

export async function sendAccessCodeEmail({
  toEmail,
  secondEmail,
  accessCode
}) {
  const cleanCode = String(accessCode || "").trim();

  if (!cleanCode) {
    throw new Error("Access code is not configured.");
  }

  const subject = "PGB CIMA access code";

  const bodyText = [
    "PGB CIMA access code",
    "",
    `Your access code is: ${cleanCode}`,
    "",
    "This code is for authorised demonstration use only.",
    "",
    "AIVS Software Limited copyright 2026. All rights reserved."
  ].join("\n");

  const htmlPart = [
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#14232B;line-height:1.5;">',
    '<h2 style="margin-bottom:4px;">PGB CIMA access code</h2>',
    "<p>Your access code is:</p>",
    `<p style="font-size:22px;font-weight:bold;letter-spacing:0.08em;">${escapeHtml(cleanCode)}</p>`,
    '<p style="font-size:12px;color:#4A5F6C;">',
    "This code is for authorised demonstration use only.",
    "</p>",
    '<p style="font-size:12px;color:#4A5F6C;">',
    "AIVS Software Limited copyright 2026. All rights reserved.",
    "</p>",
    "</div>"
  ].join("");

  return sendCimaEmail({
    toEmail,
    secondEmail,
    subject,
    bodyText,
    htmlPart
  });
}

export async function sendTranscriptEmail({
  toEmails,
  toEmail,
  secondEmail,
  subject,
  bodyText,
  htmlPart,
  pdfBuffer,
  pdfFilename,
  docxBuffer,
  docxFilename
}) {
  return sendCimaEmail({
    toEmails,
    toEmail,
    secondEmail,
    subject,
    bodyText,
    htmlPart,
    pdfBuffer,
    pdfFilename,
    docxBuffer,
    docxFilename
  });
}

export function getEmailAgentStatus() {
  return {
    ok: true,
    agent: "email_agent",
    email_agent_build_iso: EMAIL_AGENT_BUILD_ISO,
    mailjet_ready: Boolean(
      envValue("MAILJET_API_KEY", "MJ_APIKEY_PUBLIC") &&
      envValue("MAILJET_API_SECRET", "MJ_APIKEY_PRIVATE")
    ),
    from_email_ready: Boolean(
      envValue("MAILJET_FROM_EMAIL", "MJ_FROM_EMAIL")
    )
  };
}  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normaliseEmailList(value) {
  if (Array.isArray(value)) {
    return value
      .map((email) => String(email || "").trim())
      .filter((email) => email.includes("@"));
  }

  return String(value || "")
    .split(/[;,]/)
    .map((email) => email.trim())
    .filter((email) => email.includes("@"));
}

function getMailjetClient() {
  const apiKey = requiredEnv("MAILJET_API_KEY", "MJ_APIKEY_PUBLIC");
  const apiSecret = requiredEnv("MAILJET_API_SECRET", "MJ_APIKEY_PRIVATE");

  const Mailjet = MailjetPackage?.default || MailjetPackage;

  if (Mailjet?.apiConnect) {
    return Mailjet.apiConnect(apiKey, apiSecret);
  }

  return new Mailjet({
    apiKey,
    apiSecret
  });
}

function buildAttachments({
  pdfBuffer,
  pdfFilename,
  docxBuffer,
  docxFilename,
  attachments = []
}) {
  const output = [];

  if (pdfBuffer && pdfFilename) {
    output.push({
      ContentType: "application/pdf",
      Filename: pdfFilename,
      Base64Content: pdfBuffer.toString("base64")
    });
  }

  if (docxBuffer && docxFilename) {
    output.push({
      ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      Filename: docxFilename,
      Base64Content: docxBuffer.toString("base64")
    });
  }

  if (Array.isArray(attachments)) {
    for (const attachment of attachments) {
      if (
        attachment &&
        attachment.ContentType &&
        attachment.Filename &&
        attachment.Base64Content
      ) {
        output.push(attachment);
      }
    }
  }

  return output;
}

function normaliseContext(context = {}) {
  if (!context || typeof context !== "object") {
    return {};
  }

  return {
    thread: context.thread || "CIMA Training Session",
    mode: context.mode || "N/A",
    level: context.level || "N/A",
    persona: context.persona || "N/A",
    output: context.output || "Training output"
  };
}

function textToHtml(value = "") {
  const lines = String(value || "").split("\n");
  let html = "";
  let inList = false;

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }

      continue;
    }

    if (line.startsWith("## ")) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }

      html += `<h3 style="margin:18px 0 8px 0;color:#14232B;">${escapeHtml(line.replace(/^##\s+/, ""))}</h3>`;
      continue;
    }

    if (line.startsWith("# ")) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }

      html += `<h2 style="margin:20px 0 10px 0;color:#14232B;">${escapeHtml(line.replace(/^#\s+/, ""))}</h2>`;
      continue;
    }

    if (line.startsWith("- ")) {
      if (!inList) {
        html += '<ul style="margin:8px 0 14px 22px;padding:0;">';
        inList = true;
      }

      html += `<li style="margin:5px 0;">${escapeHtml(line.replace(/^-+\s*/, ""))}</li>`;
      continue;
    }

    if (inList) {
      html += "</ul>";
      inList = false;
    }

    html += `<p style="margin:8px 0;">${escapeHtml(line)}</p>`;
  }

  if (inList) {
    html += "</ul>";
  }

  return html || '<p style="margin:8px 0;">No training output text was provided.</p>';
}

function buildTrainingTextBody({
  trainingTitle = "CIMA training output",
  trainingOutput = "",
  trainingSummary = "",
  context = {},
  generatedAt = new Date().toISOString()
}) {
  const cleanContext = normaliseContext(context);

  const parts = [
    trainingTitle,
    "",
    `Generated at: ${generatedAt}`,
    "",
    "Training context",
    `Thread: ${cleanContext.thread}`,
    `Mode: ${cleanContext.mode}`,
    `Command level: ${cleanContext.level}`,
    `Persona: ${cleanContext.persona}`,
    `Requested output: ${cleanContext.output}`,
    ""
  ];

  if (trainingSummary) {
    parts.push("Training summary");
    parts.push(String(trainingSummary || ""));
    parts.push("");
  }

  parts.push("Training output");
  parts.push(String(trainingOutput || "No training output text was provided."));
  parts.push("");
  parts.push("This training material is draft support only and requires authorised human review before operational use.");
  parts.push("");
  parts.push("AIVS Software Limited copyright 2026. All rights reserved.");

  return parts.join("\n");
}

function buildTrainingHtmlBody({
  trainingTitle = "CIMA training output",
  trainingOutput = "",
  trainingSummary = "",
  context = {},
  generatedAt = new Date().toISOString()
}) {
  const cleanContext = normaliseContext(context);

  const summaryHtml = trainingSummary
    ? [
        '<div style="border:1px solid #D6CBBD;border-left:5px solid #DC9325;border-radius:14px;background:#FFFAF2;padding:14px;margin:16px 0;">',
        '<h3 style="margin:0 0 8px 0;color:#14232B;">Training summary</h3>',
        textToHtml(trainingSummary),
        "</div>"
      ].join("")
    : "";

  return [
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#14232B;line-height:1.5;background:#F8F5EE;padding:22px;">',
    '<div style="max-width:760px;margin:0 auto;background:#FFFFFF;border:1px solid #D6CBBD;border-radius:18px;overflow:hidden;">',

    '<div style="background:#14232B;color:#FFFFFF;padding:22px 24px;">',
    '<h2 style="margin:0 0 6px 0;font-size:24px;line-height:1.2;">PGB CIMA training output</h2>',
    `<p style="margin:0;color:#D9E1E6;font-size:13px;">${escapeHtml(trainingTitle)}</p>`,
    "</div>",

    '<div style="padding:22px 24px;">',
    `<p style="margin:0 0 14px 0;font-size:13px;color:#4A5F6C;"><strong>Generated at:</strong> ${escapeHtml(generatedAt)}</p>`,

    '<table style="width:100%;border-collapse:collapse;margin:12px 0 18px 0;font-size:13px;">',
    '<tbody>',
    `<tr><td style="border:1px solid #E5DED2;padding:8px;background:#F8F5EE;font-weight:bold;">Thread</td><td style="border:1px solid #E5DED2;padding:8px;">${escapeHtml(cleanContext.thread)}</td></tr>`,
    `<tr><td style="border:1px solid #E5DED2;padding:8px;background:#F8F5EE;font-weight:bold;">Mode</td><td style="border:1px solid #E5DED2;padding:8px;">${escapeHtml(cleanContext.mode)}</td></tr>`,
    `<tr><td style="border:1px solid #E5DED2;padding:8px;background:#F8F5EE;font-weight:bold;">Command level</td><td style="border:1px solid #E5DED2;padding:8px;">${escapeHtml(cleanContext.level)}</td></tr>`,
    `<tr><td style="border:1px solid #E5DED2;padding:8px;background:#F8F5EE;font-weight:bold;">Persona</td><td style="border:1px solid #E5DED2;padding:8px;">${escapeHtml(cleanContext.persona)}</td></tr>`,
    `<tr><td style="border:1px solid #E5DED2;padding:8px;background:#F8F5EE;font-weight:bold;">Output</td><td style="border:1px solid #E5DED2;padding:8px;">${escapeHtml(cleanContext.output)}</td></tr>`,
    "</tbody>",
    "</table>",

    summaryHtml,

    '<div style="border:1px solid #D6CBBD;border-left:5px solid #DC9325;border-radius:14px;background:#FFFFFF;padding:14px;margin:16px 0;">',
    '<h3 style="margin:0 0 8px 0;color:#14232B;">Training output</h3>',
    textToHtml(trainingOutput),
    "</div>",

    '<p style="font-size:12px;color:#4A5F6C;margin:16px 0 0 0;">',
    "This training material is draft support only and requires authorised human review before operational use.",
    "</p>",
    '<p style="font-size:12px;color:#4A5F6C;margin:6px 0 0 0;">',
    "AIVS Software Limited copyright 2026. All rights reserved.",
    "</p>",

    "</div>",
    "</div>",
    "</div>"
  ].join("");
}

export async function sendCimaTrainingEmail({
  toEmails,
  toEmail,
  secondEmail,
  subject,
  bodyText,
  htmlPart,
  trainingTitle = "CIMA training output",
  trainingOutput = "",
  trainingSummary = "",
  context = {},
  generatedAt = new Date().toISOString(),
  pdfBuffer,
  pdfFilename,
  docxBuffer,
  docxFilename,
  attachments = []
}) {
  const recipients = normaliseEmailList(
    toEmails || [toEmail, secondEmail]
  );

  if (!recipients.length) {
    throw new Error("At least one valid recipient email address is required.");
  }

  const fromEmail = requiredEnv("MAILJET_FROM_EMAIL", "MJ_FROM_EMAIL");
  const fromName = envValue("MAILJET_FROM_NAME", "MJ_FROM_NAME") || "AIVS Software Limited";

  const finalSubject = String(subject || `PGB CIMA training output - ${trainingTitle}`).trim();

  const finalBodyText = bodyText || buildTrainingTextBody({
    trainingTitle,
    trainingOutput,
    trainingSummary,
    context,
    generatedAt
  });

  const finalHtmlPart = htmlPart || buildTrainingHtmlBody({
    trainingTitle,
    trainingOutput,
    trainingSummary,
    context,
    generatedAt
  });

  const mailjet = getMailjetClient();

  const message = {
    From: {
      Email: fromEmail,
      Name: fromName
    },
    To: recipients.map((email) => ({
      Email: email
    })),
    Subject: finalSubject,
    TextPart: finalBodyText,
    HTMLPart: finalHtmlPart,
    Attachments: buildAttachments({
      pdfBuffer,
      pdfFilename,
      docxBuffer,
      docxFilename,
      attachments
    })
  };

  const response = await mailjet
    .post("send", { version: "v3.1" })
    .request({
      Messages: [message]
    });

  const providerMessage = response?.body?.Messages?.[0] || {};

  return {
    ok: true,
    provider: "Mailjet",
    agent: "training_email_agent",
    training_email_agent_build_iso: TRAINING_EMAIL_AGENT_BUILD_ISO,
    status: providerMessage.Status || "sent",
    to: recipients
  };
}

export async function sendTrainingOutputEmail(options = {}) {
  return sendCimaTrainingEmail(options);
}

export async function sendTrainingEmail(options = {}) {
  return sendCimaTrainingEmail(options);
}

export function getTrainingEmailAgentStatus() {
  return {
    ok: true,
    agent: "training_email_agent",
    training_email_agent_build_iso: TRAINING_EMAIL_AGENT_BUILD_ISO,
    mailjet_ready: Boolean(
      envValue("MAILJET_API_KEY", "MJ_APIKEY_PUBLIC") &&
      envValue("MAILJET_API_SECRET", "MJ_APIKEY_PRIVATE")
    ),
    from_email_ready: Boolean(
      envValue("MAILJET_FROM_EMAIL", "MJ_FROM_EMAIL")
    )
  };
}
