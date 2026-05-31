import { supabaseServer } from "@/lib/supabase/server";

export type AuthedUser = {
  id: string;
  email: string | null;
};

// Authorization: Bearer <token> を検証し、認証済みユーザーを返す。
// トークンが無い／不正な場合は null を返す（呼び出し側で 401 を返す）。
export async function getAuthedUser(
  request: Request
): Promise<AuthedUser | null> {
  const authHeader = request.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1].trim();
  if (!token) return null;

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
}
