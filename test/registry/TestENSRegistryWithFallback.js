const namehash = require('eth-ens-namehash')
const sha3 = require('web3-utils').sha3

const EVMNS = artifacts.require('EVMNSRegistryWithFallback.sol')

const EVMNSWithoutFallback = artifacts.require('./registry/EVMNSRegistry.sol')

contract('EVMNSRegistryWithFallback', function (accounts) {
  let old
  let ens

  beforeEach(async () => {
    old = await EVMNSWithoutFallback.new()
    ens = await EVMNS.new(old.address)
  })

  it('should allow setting the record', async () => {
    let result = await ens.setRecord('0x0', accounts[1], accounts[2], 3600, {
      from: accounts[0],
    })
    assert.equal(result.logs.length, 3)

    assert.equal(await ens.owner('0x0'), accounts[1])
    assert.equal(await ens.resolver('0x0'), accounts[2])
    assert.equal((await ens.ttl('0x0')).toNumber(), 3600)
  })

  it('should allow setting subnode records', async () => {
    let result = await ens.setSubnodeRecord(
      '0x0',
      sha3('test'),
      accounts[1],
      accounts[2],
      3600,
      { from: accounts[0] },
    )

    let hash = namehash.hash('test')
    assert.equal(await ens.owner(hash), accounts[1])
    assert.equal(await ens.resolver(hash), accounts[2])
    assert.equal((await ens.ttl(hash)).toNumber(), 3600)
  })

  it('should implement authorisations/operators', async () => {
    await ens.setApprovalForAll(accounts[1], true, { from: accounts[0] })
    await ens.setOwner('0x0', accounts[2], { from: accounts[1] })
    assert.equal(await ens.owner('0x0'), accounts[2])
  })

  describe('fallback', async () => {
    let hash = namehash.hash('evm')

    beforeEach(async () => {
      await old.setSubnodeOwner('0x0', sha3('evm'), accounts[0], {
        from: accounts[0],
      })
    })

    it('should use fallback ttl if owner not set', async () => {
      let hash = namehash.hash('evm')
      await old.setSubnodeOwner('0x0', sha3('evm'), accounts[0], {
        from: accounts[0],
      })
      await old.setTTL(hash, 3600, { from: accounts[0] })
      assert.equal((await ens.ttl(hash)).toNumber(), 3600)
    })

    it('should use fallback owner if owner not set', async () => {
      await old.setOwner(hash, accounts[0], { from: accounts[0] })
      assert.equal(await ens.owner(hash), accounts[0])
    })

    it('should use fallback resolver if owner not set', async () => {
      await old.setResolver(hash, accounts[0], { from: accounts[0] })
      assert.equal(await ens.resolver(hash), accounts[0])
    })
  })
})
