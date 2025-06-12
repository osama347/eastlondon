import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { memberId, memberName, memberEmail, paymentStatus } =
      await req.json();

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get email template based on payment status
    const emailTemplate = getEmailTemplate(memberName, paymentStatus);

    // Send email using your preferred email service
    // This is an example using a hypothetical email service
    const emailResponse = await fetch("https://api.email-service.com/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("EMAIL_SERVICE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: memberEmail,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      }),
    });

    if (!emailResponse.ok) {
      throw new Error("Failed to send email");
    }

    // Log the reminder in the notifications table
    await supabaseClient.from("notifications").insert({
      member_id: memberId,
      type: "payment_reminder",
      message: `Payment reminder sent to ${memberEmail} for ${paymentStatus} status`,
      created_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

function getEmailTemplate(memberName: string, paymentStatus: string) {
  const templates = {
    Pending: {
      subject: "Payment Reminder - Your Payment is Due Soon",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment Reminder</h2>
          <p>Dear ${memberName},</p>
          <p>This is a friendly reminder that your payment is due soon. Please make your payment to maintain your active membership status.</p>
          <p>If you have already made the payment, please ignore this reminder.</p>
          <br>
          <p>Best regards,<br>East London Community</p>
        </div>
      `,
    },
    Overdue: {
      subject: "Urgent: Payment Overdue",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment Overdue Notice</h2>
          <p>Dear ${memberName},</p>
          <p>This is to inform you that your payment is now overdue. Your membership status has been affected.</p>
          <p>Please make your payment as soon as possible to restore your active membership status.</p>
          <br>
          <p>Best regards,<br>East London Community</p>
        </div>
      `,
    },
    Invalid: {
      subject: "Payment Status Update Required",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment Status Update</h2>
          <p>Dear ${memberName},</p>
          <p>We noticed an issue with your recent payment. Please contact us to resolve this matter and update your payment status.</p>
          <br>
          <p>Best regards,<br>East London Community</p>
        </div>
      `,
    },
  };

  return (
    templates[paymentStatus as keyof typeof templates] || templates["Pending"]
  );
}
