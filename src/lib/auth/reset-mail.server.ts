/** Sends the password-reset letter. Uses Resend when RESEND_API_KEY is set. */
export async function sendPasswordReset(to: string, url: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Mail is not configured");
  const from = process.env.MAIL_FROM ?? "Midgard <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Change your Midgard password",
      html: `<p>A traveler asked to change the password on this account.</p><p><a href="${url}">Choose a new password</a></p><p>The link lasts one hour. If you did not ask, ignore this letter.</p>`,
    }),
  });
  if (!res.ok) throw new Error("The letter could not be sent");
}
