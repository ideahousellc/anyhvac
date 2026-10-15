import { loadConfigFromFile } from "vite";
const config = await loadConfigFromFile({ command: "serve", mode: "test" }, "vitest.config.mts");
console.log(config ? "Default bundle loader: OK" : "Config missing");
