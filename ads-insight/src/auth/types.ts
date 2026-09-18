/**
 * What every MCP tool call knows about who is calling (SPEC §5.1, §5.4).
 *
 * Kept to just the email on purpose: there is one owner account in scope
 * right now (SPEC "ขอบเขตตอนนี้: บัญชีเจ้าของ 1 บัญชี"), so no tool branches on
 * identity today. It exists mainly so `audit_log` (D1, M3) can record who
 * triggered a call without every layer between the OAuth callback and the
 * tool handler needing to be replumbed when that lands.
 */
export interface AuthProps {
  /** The Google account email that completed login, already checked against OWNER_EMAILS. */
  email: string;
}
