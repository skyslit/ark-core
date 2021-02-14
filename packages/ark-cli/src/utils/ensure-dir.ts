import fs from 'fs';
import path from 'path';
/**
 * Ensure directory exists
 * @param {string} filePath
 */
export default function ensureDir(filePath: string) {
  const dirPath = path.dirname(filePath);
  const exists = fs.existsSync(dirPath);
  if (!exists) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
