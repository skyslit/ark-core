import { AppPropType } from './app';
import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';

export const optionDefinitions = [
  {
    name: 'process',
    type: String,
    defaultOption: true,
    description: 'The input to process.',
    typeLabel: '{underline file}',
  },
  {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: 'Print this usage guide.',
  },
];

/**
 * Gets ppp props for CLI environment
 * @return {AppPropType}
 */
export function getAppProps(): AppPropType {
  const props: AppPropType = {
    cwd: process.cwd(),
    mode: 'normal',
    options: commandLineArgs(optionDefinitions),
  };

  if (props.options) {
    if (props.options.help) {
      props.mode = 'help';
    } else if (props.options.process) {
      props.mode = 'command';
    }
  }

  return props;
}

/**
 * Gets content to be displayed for --help flag
 * @return {string}
 */
export function getHelpText(): string {
  return commandLineUsage([
    {
      header: 'A typical app',
      content:
        'Generates something {italic very} important. This is a rather long, but ultimately inconsequential description intended solely to demonstrate description appearance. ',
    },
    {
      header: 'Options',
      optionList: optionDefinitions,
    },
    {
      content: 'Project home: {underline https://github.com/me/example}',
    },
  ]);
}
