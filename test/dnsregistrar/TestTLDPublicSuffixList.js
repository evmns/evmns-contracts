const TLDPublicSuffixList = artifacts.require('./TLDPublicSuffixList.sol')
const utils = require('./Helpers/Utils')

contract('TLDPublicSuffixList', function (accounts) {
  var suffixList = null

  beforeEach(async function () {
    suffixList = await TLDPublicSuffixList.new()
  })

  it('treats all TLDs as public suffixes', async function () {
    assert.equal(
      await suffixList.isPublicSuffix(utils.hexEncodeName('evm')),
      true,
    )
    assert.equal(
      await suffixList.isPublicSuffix(utils.hexEncodeName('com')),
      true,
    )
  })

  it('treats non-TLDs as non-public suffixes', async function () {
    assert.equal(
      await suffixList.isPublicSuffix(utils.hexEncodeName('')),
      false,
    )
    assert.equal(
      await suffixList.isPublicSuffix(utils.hexEncodeName('foo.evm')),
      false,
    )
    assert.equal(
      await suffixList.isPublicSuffix(utils.hexEncodeName('a.b.foo.evm')),
      false,
    )
  })
})
