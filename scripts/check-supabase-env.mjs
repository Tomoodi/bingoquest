import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
const requiredVariables = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];

function parseEnvFile(path) {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        return env;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        return env;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      env[key] = value;
      return env;
    }, {});
}

const fileEnv = existsSync(envPath) ? parseEnvFile(envPath) : {};
const env = { ...fileEnv, ...process.env };
const missingVariables = requiredVariables.filter((key) => !env[key]);

if (missingVariables.length > 0) {
  if (!existsSync(envPath)) {
    console.error("Missing .env.local. Copy .env.sample to .env.local first.");
  }

  console.error(`Missing required variables: ${missingVariables.join(", ")}`);
  process.exit(1);
}

let hasError = false;

try {
  const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);

  if (url.protocol !== "https:") {
    console.error("NEXT_PUBLIC_SUPABASE_URL should start with https://");
    hasError = true;
  }

  if (!url.hostname.endsWith(".supabase.co")) {
    console.warn(
      "NEXT_PUBLIC_SUPABASE_URL does not look like a hosted Supabase project URL."
    );
  }
} catch {
  console.error("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
  hasError = true;
}

if (!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY should be a Supabase publishable key that starts with sb_publishable_."
  );
  hasError = true;
}

if (hasError) {
  process.exit(1);
}

console.log("Supabase environment variables are set.");
