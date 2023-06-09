const sha3 = require('js-sha3').keccak_256
// @ts-ignore
import { normalize } from '@ensdomains/eth-ens-namehash'

// @ts-ignore
export function encodeLabelhash(hash) {
  if (!hash.startsWith('0x')) {
    throw new Error('Expected label hash to start with 0x')
  }

  if (hash.length !== 66) {
    throw new Error('Expected label hash to have a length of 66')
  }

  return `[${hash.slice(2)}]`
}
// @ts-ignore
export function decodeLabelhash(hash) {
  if (!(hash.startsWith('[') && hash.endsWith(']'))) {
    throw Error(
      'Expected encoded labelhash to start and end with square brackets',
    )
  }

  if (hash.length !== 66) {
    throw Error('Expected encoded labelhash to have a length of 66')
  }

  return `${hash.slice(1, -1)}`
}
// @ts-ignore
export function isEncodedLabelhash(hash) {
  return hash.startsWith('[') && hash.endsWith(']') && hash.length === 66
}
// @ts-ignore
export function isDecrypted(name) {
  const nameArray = name.split('.')
  const decrypted = nameArray.reduce((acc: boolean, label: any) => {
    if (acc === false) return false
    return isEncodedLabelhash(label) ? false : true
  }, true)

  return decrypted
}
// @ts-ignore
export function labelhash(unnormalisedLabelOrLabelhash) {
  if (unnormalisedLabelOrLabelhash === '[root]') {
    return ''
  }
  return isEncodedLabelhash(unnormalisedLabelOrLabelhash)
    ? '0x' + decodeLabelhash(unnormalisedLabelOrLabelhash)
    : '0x' + sha3(normalize(unnormalisedLabelOrLabelhash))
}
