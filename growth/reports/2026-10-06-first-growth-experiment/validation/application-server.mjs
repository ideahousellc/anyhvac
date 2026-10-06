// Isolated copy only. Canonical URLs are represented locally for origin-gate QA.
import { createServer } from "node:http";
import { resolve } from "node:path";
import next from "next";

const directory = resolve("growth/.generated/measurement-validation/application");
process.chdir(directory);
process.env.NODE_ENV = "production";
process.env.GROWTH_MEASUREMENT_ENABLED = "true";
process.env.SUPABASE_URL = "http://127.0.0.1:55440";
process.env.SUPABASE_SECRET_KEY = "anyhvac-isolated-validation-not-a-production-key";
process.env.NEXT_TELEMETRY_DISABLED = "1";
// Virtual proxy metadata; the actual listener remains loopback port 3107.
const application = next({ dev: false, dir: directory, hostname: "www.anyhvac.net", port: 443 });
await application.prepare();
const handle = application.getRequestHandler();
createServer((request, response) => {
  if (request.headers["x-forwarded-host"] !== "www.anyhvac.net") {
    response.writeHead(403).end();
    return;
  }
  // A test transport adapter, not a production host/HTTPS configuration change.
  request.headers.host = "www.anyhvac.net";
  void handle(request, response);
}).listen(3107, "127.0.0.1", () => console.log("Isolated copied application listening on loopback:3107"));
