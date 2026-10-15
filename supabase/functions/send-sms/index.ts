import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { username, password, source_addr, messages } = await req.json();

    const verimorUsername = username || Deno.env.get("VERIMOR_USERNAME") || "908502428910";
    const verimorPassword = password || Deno.env.get("VERIMOR_PASSWORD") || "3e3f25f6-mpsp-1406";
    const verimorSourceAddr = source_addr || Deno.env.get("VERIMOR_SOURCE_ADDR") || "";

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error("Geçerli bir mesaj listesi (messages) gönderilmelidir.");
    }

    const payload = {
      username: verimorUsername,
      password: verimorPassword,
      source_addr: verimorSourceAddr,
      messages: messages.map((m: { msg: string; dest: string }) => ({
        msg: m.msg,
        dest: String(m.dest).replace(/[^\d]/g, '')
      }))
    };

    const verimorRes = await fetch("https://sms.verimor.com.tr/v2/send.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const responseText = await verimorRes.text();

    if (!verimorRes.ok) {
      return new Response(JSON.stringify({
        error: `Verimor API Hatası (${verimorRes.status}): ${responseText}`,
        status: verimorRes.status,
        raw: responseText
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: responseText
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
