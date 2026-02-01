/**
 * db-proxy — Edge function that proxies database operations for the Python bot.
 *
 * Accepts JSON body:
 *   { operation, table, data, filters, select, order, limit }
 *
 * Operations: "select", "insert", "update", "delete", "upsert"
 */
module.exports = async function (request) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const respond = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await request.json();
    const { operation, table, data, filters, select, order, limit } = body;

    if (!operation || !table) {
      return respond({ error: "Missing operation or table" }, 400);
    }

    const client = createClient({
      baseUrl: Deno.env.get("INSFORGE_INTERNAL_URL") || "http://insforge:7130",
      anonKey: Deno.env.get("ANON_KEY"),
    });

    let query;

    switch (operation) {
      case "select": {
        query = client.database.from(table).select(select || "*");

        // Apply filters
        if (filters && typeof filters === "object") {
          for (const [col, val] of Object.entries(filters)) {
            query = query.eq(col, val);
          }
        }

        // Apply order
        if (order) {
          // order format: "column.desc" or "column.asc"
          const [col, dir] = order.split(".");
          query = query.order(col, { ascending: dir !== "desc" });
        }

        // Apply limit
        if (limit) {
          query = query.limit(limit);
        }

        const { data: rows, error } = await query;
        if (error) return respond({ error: error.message }, 500);
        return respond({ data: rows });
      }

      case "insert": {
        if (!data) return respond({ error: "Missing data for insert" }, 400);

        const { data: result, error } = await client.database
          .from(table)
          .insert(data)
          .select();

        if (error) return respond({ error: error.message }, 500);
        return respond({ data: result });
      }

      case "update": {
        if (!data) return respond({ error: "Missing data for update" }, 400);
        if (!filters)
          return respond({ error: "Missing filters for update" }, 400);

        let q = client.database.from(table).update(data);

        for (const [col, val] of Object.entries(filters)) {
          q = q.eq(col, val);
        }

        const { data: result, error } = await q.select();
        if (error) return respond({ error: error.message }, 500);
        return respond({ data: result });
      }

      case "delete": {
        if (!filters)
          return respond({ error: "Missing filters for delete" }, 400);

        let q = client.database.from(table).delete();

        for (const [col, val] of Object.entries(filters)) {
          q = q.eq(col, val);
        }

        const { error } = await q;
        if (error) return respond({ error: error.message }, 500);
        return respond({ data: null });
      }

      case "upsert": {
        if (!data) return respond({ error: "Missing data for upsert" }, 400);

        const { data: result, error } = await client.database
          .from(table)
          .insert(data)
          .select();

        if (error) {
          // If conflict, try update approach
          if (
            error.message &&
            (error.message.includes("duplicate") ||
              error.message.includes("conflict") ||
              error.message.includes("unique"))
          ) {
            return respond({ data: [data], note: "already_exists" });
          }
          return respond({ error: error.message }, 500);
        }
        return respond({ data: result });
      }

      default:
        return respond({ error: `Unknown operation: ${operation}` }, 400);
    }
  } catch (err) {
    return respond({ error: err.message || "Internal error" }, 500);
  }
};
