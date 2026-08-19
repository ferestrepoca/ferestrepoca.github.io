import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const DEFAULT_DATA_DIR = path.join(ROOT, "web", "src", "data");

export function getDataDir(override) {
  return path.resolve(override || process.env.SITE_DATA_DIR || DEFAULT_DATA_DIR);
}

export function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function readJson(name, { dataDir } = {}) {
  const file = path.join(getDataDir(dataDir), name);
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    error.message = `Cannot read ${file}: ${error.message}`;
    throw error;
  }
}

async function currentText(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

/** Stage every changed JSON file before replacing any destination. */
export async function writeJsonBatch(entries, { dataDir } = {}) {
  const dir = getDataDir(dataDir);
  await mkdir(dir, { recursive: true });
  const staged = [];
  const written = [];

  try {
    for (let index = 0; index < entries.length; index++) {
      const [name, value] = entries[index];
      const file = path.join(dir, name);
      const next = jsonText(value);
      if ((await currentText(file)) === next) continue;

      const temp = path.join(dir, `.${name}.${process.pid}.${index}.tmp`);
      await writeFile(temp, next, "utf8");
      // Parse the staged bytes before touching the canonical file.
      JSON.parse(await readFile(temp, "utf8"));
      staged.push({ name, file, temp });
    }

    for (const item of staged) {
      await rename(item.temp, item.file);
      written.push(item.name);
    }
    return written;
  } catch (error) {
    await Promise.all(staged.map(({ temp }) => unlink(temp).catch(() => {})));
    throw error;
  }
}

export async function writeJson(name, value, options) {
  return writeJsonBatch([[name, value]], options);
}
