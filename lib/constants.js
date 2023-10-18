import { fileURLToPath } from 'url';
import path from 'path';
import fs from "fs";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

export const INTROSPECTION_QUERY = fs.readFileSync(
    path.resolve(__dirname, "./queries/introspection.graphql"),
    "utf-8"
  );