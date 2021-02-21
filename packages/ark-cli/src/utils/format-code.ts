import pt from 'prettier';
/**
 * Format code
 * @param {string} inputStr
 * @return {string}
 */
export default function formatCode(inputStr: string) {
  return pt.format(inputStr, {
    parser: 'babel-ts',
  });
}
