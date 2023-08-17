const DummyOracle = artifacts.require('./DummyOracle')
const StablePriceOracle = artifacts.require('./StablePriceOracle')

const { expect } = require('chai')
const { ethers } = require('hardhat')

contract('StablePriceOracle', function (accounts) {
  let priceOracle

  before(async () => {
    // Dummy oracle with 1 ETH == 10 USD
    const signers = await ethers.getSigners()

    var dummyOracle = await DummyOracle.new(1000000000n, signers[0].address)
    // 4 attousd per second for 3 character names, 2 attousd per second for 4 character names,
    // 1 attousd per second for longer names.
    priceOracle = await StablePriceOracle.new(
      dummyOracle.address,
      [0, 0, 4, 2, 1],
    )
  })

  it('should return correct prices', async () => {
    expect(parseInt(await priceOracle.price('foo', 0, 3600))).to.equal(1440)
    expect(parseInt(await priceOracle.price('quux', 0, 3600))).to.equal(720)
    expect(parseInt(await priceOracle.price('fubar', 0, 3600))).to.equal(360)
    expect(parseInt(await priceOracle.price('foobie', 0, 3600))).to.equal(360)
  })

  it('should work with larger values', async () => {
    const signers = await ethers.getSigners()
    const dummyOracle2 = await DummyOracle.new(1000000000n, signers[0].address)
    // 4 attousd per second for 3 character names, 2 attousd per second for 4 character names,
    // 1 attousd per second for longer names.
    const priceOracle2 = await StablePriceOracle.new(dummyOracle2.address, [
      0,
      0,
      // 1 USD per second!
      1000000000000000000n,
      2,
      1,
    ])
    expect((await priceOracle2.price('foo', 0, 86400)).toString()).to.equal(
      '8640000000000000000000',
    )
  })
})
