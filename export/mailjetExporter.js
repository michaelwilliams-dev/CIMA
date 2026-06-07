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
}
