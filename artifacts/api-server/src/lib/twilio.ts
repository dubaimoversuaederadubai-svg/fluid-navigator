import twilio from "twilio";

let _cachedSettings: {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
} | null = null;

async function getCredentials() {
  if (_cachedSettings) return _cachedSettings;

  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  ) {
    _cachedSettings = {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    };
    console.log("[Twilio] Using env ACCOUNT_SID + AUTH_TOKEN");
    return _cachedSettings;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (hostname && xReplitToken) {
    try {
      const data = await fetch(
        "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=twilio",
        {
          headers: {
            Accept: "application/json",
            "X-Replit-Token": xReplitToken,
          },
        }
      )
        .then((r) => r.json())
        .then((d: any) => d.items?.[0]);

      if (data?.settings?.account_sid) {
        _cachedSettings = {
          accountSid: data.settings.account_sid,
          authToken: data.settings.auth_token || data.settings.api_key,
          phoneNumber: data.settings.phone_number || "",
        };
        console.log("[Twilio] Using Replit connector credentials");
        return _cachedSettings;
      }
    } catch (e) {
      console.warn("[Twilio] Replit connector fetch failed:", e);
    }
  }

  return null;
}

export async function getTwilioClient() {
  const creds = await getCredentials();
  if (!creds) return null;
  return twilio(creds.accountSid, creds.authToken);
}

export async function getTwilioFromNumber() {
  const creds = await getCredentials();
  return creds?.phoneNumber || null;
}

export async function isTwilioConfigured() {
  const creds = await getCredentials();
  return !!creds;
}
