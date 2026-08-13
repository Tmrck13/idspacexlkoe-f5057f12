import type {
  AuditColumn,
  AuditPolicy,
  AuditTable,
  SchemaAuditResult,
} from "./audit-schema.functions";

const SYSTEM_SCHEMAS = ["pg_catalog", "information_schema", "pg_toast"];

type Rest = (path: string, schema?: string) => Promise<unknown>;

function makeRest(url: string, key: string): Rest {
  return async (path, schema) => {
    const headers: Record<string, string> = { apikey: key, Accept: "application/json" };
    if (!key.startsWith("sb_")) headers["Authorization"] = `Bearer ${key}`;
    if (schema) headers["Accept-Profile"] = schema;

    const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, {
      method: "GET",
      headers,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 300)}`);
    }
    return text ? JSON.parse(text) : null;
  };
}

/** Read-only introspection. Only SELECT-style GET requests are issued. */
export async function introspect(
  url: string,
  key: string,
): Promise<Omit<SchemaAuditResult, "generatedAt">> {
  const rest = makeRest(url, key);

  // Preferred path: a database-side read-only RPC exposing the catalog.
  try {
    const payload = (await rest("rpc/audit_schema_snapshot")) as {
      tables?: AuditTable[];
      policies?: AuditPolicy[];
      columns?: AuditColumn[];
    } | null;
    if (payload && Array.isArray(payload.tables)) {
      return {
        ok: true,
        connected: true,
        source: "rpc",
        message: "Introspected via read-only audit_schema_snapshot() RPC.",
        tables: payload.tables,
        policies: payload.policies ?? [],
        columns: payload.columns ?? [],
      };
    }
  } catch {
    // fall through to the exposed-schema path
  }

  // Fallback: information_schema exposed through the Data API.
  const notIn = `(${SYSTEM_SCHEMAS.join(",")})`;
  const [rawTables, rawColumns] = await Promise.all([
    rest(
      `tables?select=table_schema,table_name,table_type&table_schema=not.in.${notIn}&order=table_schema,table_name`,
      "information_schema",
    ),
    rest(
      `columns?select=table_schema,table_name,column_name,data_type,is_nullable,column_default&table_schema=not.in.${notIn}&order=table_schema,table_name,ordinal_position`,
      "information_schema",
    ),
  ]);

  let policies: AuditPolicy[] = [];
  let policyNote = "";
  try {
    const rawPolicies = (await rest(
      "pg_policies?select=schemaname,tablename,policyname,cmd,permissive,roles,qual,with_check&order=schemaname,tablename",
      "pg_catalog",
    )) as Array<Record<string, unknown>>;
    policies = rawPolicies.map((p) => ({
      schema: String(p["schemaname"] ?? ""),
      table: String(p["tablename"] ?? ""),
      name: String(p["policyname"] ?? ""),
      command: String(p["cmd"] ?? "ALL"),
      permissive: p["permissive"] == null ? null : String(p["permissive"]),
      roles: Array.isArray(p["roles"])
        ? (p["roles"] as unknown[]).map(String)
        : typeof p["roles"] === "string"
          ? String(p["roles"]).replace(/[{}]/g, "").split(",").filter(Boolean)
          : [],
      using: p["qual"] == null ? null : String(p["qual"]),
      withCheck: p["with_check"] == null ? null : String(p["with_check"]),
    }));
  } catch (error) {
    policyNote = ` Policies unavailable: ${error instanceof Error ? error.message : String(error)}`;
  }

  const tables: AuditTable[] = (rawTables as Array<Record<string, unknown>>).map((t) => ({
    schema: String(t["table_schema"] ?? ""),
    name: String(t["table_name"] ?? ""),
    type: String(t["table_type"] ?? ""),
    rlsEnabled: null,
  }));

  const columns: AuditColumn[] = (rawColumns as Array<Record<string, unknown>>).map((c) => ({
    schema: String(c["table_schema"] ?? ""),
    table: String(c["table_name"] ?? ""),
    name: String(c["column_name"] ?? ""),
    dataType: String(c["data_type"] ?? ""),
    isNullable: String(c["is_nullable"] ?? "") === "YES",
    defaultValue: c["column_default"] == null ? null : String(c["column_default"]),
  }));

  // Tables that carry at least one policy necessarily have RLS enabled.
  const withPolicy = new Set(policies.map((p) => `${p.schema}.${p.table}`));
  for (const table of tables) {
    if (withPolicy.has(`${table.schema}.${table.name}`)) table.rlsEnabled = true;
  }

  return {
    ok: true,
    connected: true,
    source: "exposed-schema",
    message:
      "Introspected via information_schema / pg_policies through the Data API (read-only)." +
      policyNote,
    tables,
    policies,
    columns,
  };
}
