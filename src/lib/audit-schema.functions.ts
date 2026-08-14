import { createServerFn } from "@tanstack/react-start";

export type AuditTable = {
  schema: string;
  name: string;
  type: string;
  rlsEnabled: boolean | null;
};

export type AuditPolicy = {
  schema: string;
  table: string;
  name: string;
  command: string;
  permissive: string | null;
  roles: string[];
  using: string | null;
  withCheck: string | null;
};

export type AuditColumn = {
  schema: string;
  table: string;
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: string | null;
};

export type SchemaAuditResult = {
  ok: boolean;
  connected: boolean;
  source: "rpc" | "exposed-schema" | "none";
  message: string;
  generatedAt: string;
  tables: AuditTable[];
  policies: AuditPolicy[];
  columns: AuditColumn[];
};

const EMPTY = {
  tables: [] as AuditTable[],
  policies: [] as AuditPolicy[],
  columns: [] as AuditColumn[],
};

/**
 * READ-ONLY schema/RLS introspection for the audit UI.
 * Performs SELECTs against information_schema / pg_policies only.
 * No DDL, no INSERT/UPDATE/DELETE, no migrations.
 */
export const getSchemaAudit = createServerFn({ method: "GET" }).handler(
  async (): Promise<SchemaAuditResult> => {
    const url = process.env["SUPABASE_URL"];
    const key =
      process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"];
    const generatedAt = new Date().toISOString();

    if (!url || !key) {
      return {
        ok: false,
        connected: false,
        source: "none",
        message:
          "No Supabase connection detected (SUPABASE_URL / key env vars are unset). Attach the existing production project, then re-run the audit.",
        generatedAt,
        ...EMPTY,
      };
    }

    const { introspect } = await import("./audit-schema.server");
    try {
      const result = await introspect(url, key);
      return { ...result, generatedAt };
    } catch (error) {
      return {
        ok: false,
        connected: true,
        source: "none",
        message: `Introspection failed: ${error instanceof Error ? error.message : String(error)}`,
        generatedAt,
        ...EMPTY,
      };
    }
  },
);
