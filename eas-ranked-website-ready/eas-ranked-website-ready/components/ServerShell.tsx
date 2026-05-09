import Shell from "@/components/Shell";
import { getSession } from "@/lib/auth";

/**
 * Server component wrapper around Shell.
 * Fetches the current session on the server and passes the Discord user
 * to Shell so AuthButton renders correctly on first paint (no flash).
 */
export default async function ServerShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  return <Shell user={session?.discordUser ?? null}>{children}</Shell>;
}
