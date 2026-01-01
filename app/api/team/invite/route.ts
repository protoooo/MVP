import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { workspace_id, email } = await request.json();

    if (!workspace_id || !email) {
      return NextResponse.json(
        { error: "workspace_id and email are required" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check workspace member limit
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("max_members")
      .eq("id", workspace_id)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const { count: memberCount } = await supabase
      .from("workspace_members")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace_id);

    if ((memberCount || 0) >= workspace.max_members) {
      return NextResponse.json(
        { error: `Maximum of ${workspace.max_members} team members reached` },
        { status: 400 }
      );
    }

    // Generate invite token
    const inviteToken = `invite_${Math.random().toString(36).substring(2, 15)}${Date.now().toString(36)}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: invite, error: inviteError } = await supabase
      .from("workspace_invites")
      .insert({
        workspace_id: workspace_id,
        email: email,
        invited_by: workspace_id,
        token: inviteToken,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invite:", inviteError);
      return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
    }

    return NextResponse.json({ success: true, invite: invite });
  } catch (error) {
    console.error("Team invite error:", error);
    return NextResponse.json({ error: "Failed to process invite request" }, { status: 500 });
  }
}
