const TestNameEncoder = artifacts.require('TestNameEncoder.sol')
const { namehash } = require('../test-utils/ens')
const { dns } = require('../test-utils')

contract('UniversalResolver', function () {
  let testNameEncoder

  beforeEach(async () => {
    testNameEncoder = await TestNameEncoder.new()
  })

  describe('encodeName()', () => {
    it('should encode a name', async () => {
      const result = await testNameEncoder.encodeName('foo.evm')
      expect(result['0']).to.equal(dns.hexEncodeName('foo.evm'))
      expect(result['1']).to.equal(namehash('foo.evm'))
    })

    it('should encode an empty name', async () => {
      const result = await testNameEncoder.encodeName('')
      expect(result['0']).to.equal(dns.hexEncodeName(''))
      expect(result['1']).to.equal(namehash(''))
    })

    it('should encode a long name', async () => {
      const result = await testNameEncoder.encodeName('something.else.test.evm')
      expect(result['0']).to.equal(dns.hexEncodeName('something.else.test.evm'))
      expect(result['1']).to.equal(namehash('something.else.test.evm'))
    })
  })
})
