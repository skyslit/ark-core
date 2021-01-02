import fs from 'fs';
import path from 'path';

/**
 * Used to throw when manifest is not matching the schema
 */
export class InvalidManifestError {
  public message: string;
  /**
   * Constructor
   * @param {string} message
   */
  constructor(message: string) {
    this.message = message;
  }
}

export interface Manifest {}

const PATH_CONFIG = './ark.manifest.json';

/**
 * Provides utility function to manage Ark project configuration file
 */
export class ManifestManager {
  public cwd: string;
  public configuration: Manifest;
  public isLoaded: boolean;
  /**
   * Constructor
   * @param {string=} cwd
   * @param {Manifest=} manifest (Optional)
   */
  constructor(cwd?: string, manifest?: Manifest) {
    this.cwd = cwd || process.cwd();
    if (manifest) {
      this.configuration = manifest;
      this.isLoaded = true;
    } else {
      this.configuration = null;
      this.isLoaded = false;
    }
  }

  /**
   * Get absolute path within cwd
   * @param {string} p Path
   * @return {string} Absolute path
   */
  getPath(p: string) {
    return path.join(this.cwd, p);
  }

  /**
   * Load manifest file and build up services
   * @return {boolean} TRUE if success, otherwise FALSE
   */
  load() {
    const configPath = this.getPath(PATH_CONFIG);
    if (fs.existsSync(configPath)) {
      let data: string | Manifest = fs.readFileSync(configPath, 'utf-8');
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
          // TODO: Json Validation
        } catch (e) {
          throw new InvalidManifestError('Invalid JSON provided in file');
        }
      }
      if (typeof data === 'object') {
        this.configuration = data;
        this.isLoaded = true;
        return true;
      }
    } else {
      return false;
    }
  }

  /**
   * Write manifest file to disk
   */
  write() {
    const configPath = this.getPath(PATH_CONFIG);
    fs.writeFileSync(configPath, JSON.stringify(this.configuration));
  }
}

export const ManifestUtils = {
  createManifest: (
    opts: Partial<Manifest>,
    defaultOpts?: Partial<Manifest>
  ) => {
    return Object.assign<Manifest, Partial<Manifest>, Partial<Manifest>>(
      {},
      defaultOpts || {},
      opts
    );
  },
};
