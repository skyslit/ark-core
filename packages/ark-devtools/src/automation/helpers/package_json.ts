// import fs from 'fs';
// import path from 'path';
// import rimraf from 'rimraf';
import { ContextType } from '../services/FileIO';
import { CoreProperties } from '@schemastore/package';

type DepTypes =
  | 'auto'
  | 'dependencies'
  | 'devDependencies'
  | 'peerDependencies';
type DepDeclaration = {
  type: DepTypes;
  name: string;
  version: string;
};

type Options = {
  hasDependency: (name: string, type?: DepTypes) => boolean;
};

export const depExtractor = (
  content: CoreProperties,
  name: string,
  type: DepTypes = 'auto'
): Array<DepDeclaration> => {
  try {
    const results: DepDeclaration[] = [];

    const extract = (depKey: DepTypes) => {
      if (content[depKey]) {
        results.push(
          ...Object.keys(content[depKey]).reduce<DepDeclaration[]>(
            (acc, key) => {
              if (key === name) {
                acc.push({
                  name: key,
                  type: depKey,
                  version: content[depKey][key],
                });
              }
              return acc;
            },
            []
          )
        );
      }
    };

    switch (type) {
      case 'auto':
      case 'dependencies': {
        extract('dependencies');
        if (type !== 'auto') {
          break;
        }
      }
      case 'devDependencies': {
        extract('devDependencies');
        if (type !== 'auto') {
          break;
        }
      }
      case 'peerDependencies': {
        extract('peerDependencies');
        if (type !== 'auto') {
          break;
        }
      }
    }

    return results;
  } catch (e) {
    return [];
  }
};

export const openPackageJson = (ctx: ContextType): Options => {
  return {
    hasDependency: (name, dep) => {
      return depExtractor(ctx.content, name, dep).length > 0;
    },
  };
};
