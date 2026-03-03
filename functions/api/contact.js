// Cloudflare Pages Function — handles POST from the contact form
// Endpoint: /api/contact (auto-routed by Cloudflare Pages Functions)
//
// SETUP: Add these environment variables in Cloudflare Pages settings:
//   CONTACT_EMAIL  — where submissions are sent (e.g. tantasquaboosterclub@gmail.com)
//   RESEND_API_KEY — your Resend.com API key (free tier: 100 emails/day)
//
// Alternatively, swap the email provider section for SendGrid, Mailgun, etc.

export async function onRequestPost(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    // Parse form data
    const formData = await context.request.formData();
    const name = formData.get("name")?.trim();
    const email = formData.get("email")?.trim();
    const message = formData.get("message")?.trim();

    // Validate required fields
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "All fields are required." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Please enter a valid email address." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ── Send email via Resend ──────────────────────────────────
    const RESEND_API_KEY = context.env.RESEND_API_KEY;
    const CONTACT_EMAIL = context.env.CONTACT_EMAIL || "tantasquaboosterclub@gmail.com";

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set");
      return new Response(
        JSON.stringify({ success: false, error: "Email service is not configured." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Tantasqua Boosters Website <noreply@tantasquaboosters.com>",
        to: [CONTACT_EMAIL],
        subject: `New Contact Form Message from ${name}`,
        reply_to: email,
        html: `
          <h2>New message from the Tantasqua Boosters website</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errBody = await emailResponse.text();
      console.error("Resend API error:", errBody);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to send message. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Thank you! Your message has been sent." }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (err) {
    console.error("Contact form error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Something went wrong. Please try again later." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// Prevent XSS in email body
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
