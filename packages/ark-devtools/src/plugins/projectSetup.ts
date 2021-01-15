import { createPlugin } from '../utils/ManifestManager';
import { useFileSystem } from '../automation/services/FileIO';

export default {
  setup: () =>
    createPlugin(
      'package',
      /^name$/,
      (opts) => {
        opts.evaluate(function* ({ automator }) {
          const { useFile } = useFileSystem(automator);
          yield useFile('package.json')
            .readFromDisk()
            .parse('json')
            .act(function* (opts) {
              opts.content = {
                name: 'Dameem',
              };
              opts.saveFile();
            });
        });
      },
      true
    ),
};
