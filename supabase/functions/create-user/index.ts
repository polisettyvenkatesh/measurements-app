import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateUserBody {
  user_id: string;
  password: string;
  full_name?: string;
  business_id: string;
  role?: "admin" | "member";
}

interface UpdateUserBody {
  user_id: string;
  full_name?: string;
  business_id?: string;
  role?: "admin" | "member";
  disabled?: boolean;
  password?: string;
}

function passwordValidationError(pw: string): string | null {
  if (!pw) return "Password is required";
  if (pw.length < 8) return "Password must be at least 8 characters long";
  const hasLetter = /[a-zA-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  if (!hasLetter || !hasNumber) return "Password must contain both letters and numbers";
  return null;
}

function toAuthEmail(userId: string): string {
  const v = userId.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@userid.local`;
}

async function verifyAdmin(req: Request, url: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { error: "Missing authorization header", status: 401 };

  const callerClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerData, error: callerErr } = await callerClient.auth.getUser();
  if (callerErr || !callerData.user) {
    return { error: "Unauthorized", status: 401 };
  }

  const { data: profile, error: profileErr } = await callerClient
    .from("user_profiles")
    .select("role, business_id")
    .eq("id", callerData.user.id)
    .maybeSingle();
  if (profileErr || !profile || profile.role !== "admin") {
    return { error: "Only admins can manage users", status: 403 };
  }

  const superAdmin = !profile.business_id;
  return {
    adminClient: createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!),
    callerId: callerData.user.id,
    superAdmin,
    businessId: profile.business_id,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;

    if (req.method === "POST") {
      const verified = await verifyAdmin(req, url);
      if ("error" in verified) {
        return new Response(JSON.stringify({ error: verified.error }), {
          status: verified.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const adminClient = verified.adminClient!;
      const { superAdmin, businessId: callerBizId } = verified;

      const body: CreateUserBody = await req.json();
      const { user_id, password, full_name, business_id, role } = body;

      if (!user_id || !password || !business_id) {
        return new Response(JSON.stringify({ error: "user_id, password, and business_id are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const pwErr = passwordValidationError(password);
      if (pwErr) {
        return new Response(JSON.stringify({ error: pwErr }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!superAdmin) {
        if (business_id !== callerBizId) {
          return new Response(JSON.stringify({ error: "You can only add users to your own business" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (role === "admin") {
          return new Response(JSON.stringify({ error: "Only a Super Admin can create admin users" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email: toAuthEmail(user_id),
        password,
        email_confirm: true,
      });

      if (createErr) {
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: profileInsertErr } = await adminClient.from("user_profiles").insert({
        id: newUser.user.id,
        business_id,
        role: role || "member",
        full_name: full_name || "",
        disabled: false,
        login_id: user_id.trim(),
      });

      if (profileInsertErr) {
        await adminClient.auth.admin.deleteUser(newUser.user.id);
        return new Response(JSON.stringify({ error: profileInsertErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ user: { id: newUser.user.id, user_id: newUser.user.email } }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (req.method === "PUT") {
      const verified = await verifyAdmin(req, url);
      if ("error" in verified) {
        return new Response(JSON.stringify({ error: verified.error }), {
          status: verified.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const adminClient = verified.adminClient!;
      const { superAdmin, businessId: callerBizId } = verified;

      const body: UpdateUserBody = await req.json();
      const { user_id, full_name, business_id, role, disabled, password } = body;

      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!superAdmin) {
        const { data: target, error: tErr } = await adminClient
          .from("user_profiles")
          .select("role, business_id")
          .eq("id", user_id)
          .maybeSingle();
        if (tErr || !target) {
          return new Response(JSON.stringify({ error: "User not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (target.business_id !== callerBizId) {
          return new Response(JSON.stringify({ error: "You can only manage users in your own business" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (role === "admin") {
          return new Response(JSON.stringify({ error: "Only a Super Admin can grant admin role" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (business_id && business_id !== callerBizId) {
          return new Response(JSON.stringify({ error: "You can only assign users to your own business" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const profilePatch: Record<string, unknown> = {};
      if (full_name !== undefined) profilePatch.full_name = full_name;
      if (business_id !== undefined) profilePatch.business_id = business_id;
      if (role !== undefined) profilePatch.role = role;
      if (disabled !== undefined) profilePatch.disabled = disabled;
      if (Object.keys(profilePatch).length > 0) {
        const { error: profErr } = await adminClient
          .from("user_profiles")
          .update(profilePatch)
          .eq("id", user_id);
        if (profErr) {
          return new Response(JSON.stringify({ error: profErr.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (password) {
        const pwErr = passwordValidationError(password);
        if (pwErr) {
          return new Response(JSON.stringify({ error: pwErr }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error: pwdErr } = await adminClient.auth.admin.updateUserById(user_id, {
          password,
        });
        if (pwdErr) {
          return new Response(JSON.stringify({ error: pwdErr.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (disabled === true) {
        await adminClient.auth.admin.updateUserById(user_id, { ban_duration: "876000h" });
      } else if (disabled === false) {
        await adminClient.auth.admin.updateUserById(user_id, { ban_duration: "none" });
      }

      return new Response(
        JSON.stringify({ user: { id: user_id } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});