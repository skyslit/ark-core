import fs from 'fs';
import { ensureDir, FileVolume } from '../index';

jest.mock('fs', () => require('memfs').fs);

test('ensureDir should create dir if not exists', () => {
  expect(fs.existsSync('/ensuredir-test/sample')).toStrictEqual(false);
  ensureDir('/ensuredir-test/sample/');
  expect(fs.existsSync('/ensuredir-test/sample')).toStrictEqual(true);
});

describe('FileVolume', () => {
  test('should put file to folder', () => {
    const volume = new FileVolume({
      baseDir: '/filevol-test',
    });

    volume.putAsync('src/doc/hello.txt', Buffer.from('Test Content', 'utf-8'));

    const fileContent = fs.readFileSync(
      '/filevol-test/src/doc/hello.txt',
      'utf8'
    );

    expect(fileContent).toEqual('Test Content');
  });

  test('should get file to folder', () => {
    const volume = new FileVolume({
      baseDir: '/filevol-test',
    });

    const fileContent = volume.getAsync('src/doc/hello.txt');

    expect(Buffer.from(fileContent).toString('utf8')).toEqual('Test Content');
  });

  test('should delete file from folder', () => {
    const volume = new FileVolume({
      baseDir: '/filevol-test',
    });

    volume.deleteAsync('src/doc/hello.txt');

    expect(fs.existsSync('/filevol-test/src/doc/hello.txt')).toStrictEqual(
      false
    );
  });
});
