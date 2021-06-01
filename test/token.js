
const { expect } = require('chai')
const toWei = ethers.utils.parseEther

describe('Token contract', function () {
  let token, admin1, admin2, holder1, holder2
  const TOTAL_SUPPLY = toWei('100000000')

  before(async () => {
    [admin1, admin2, holder1, holder2] = await ethers.getSigners()

    const Token = await ethers.getContractFactory('Token')
    token = await Token.deploy()
  })

  describe('balances tests', function () {
    it('should have total supply of 100,000,000', async () => {
      expect((await token.totalSupply()).toString()).to.equal(TOTAL_SUPPLY)
    })

    it('admin should have total supply', async () => {
      expect((await token.balanceOf(admin1.address)).toString()).to.equal(TOTAL_SUPPLY)
    })
  })

  describe('pausing tests', function () {
    beforeEach(async function () {
      const paused = await token.paused()

      if (paused) {
        await token.unpause({ from: admin1.address })
      }
    })

    it('admin can pause', async function () {
      await expect(token.pause({ from: admin1.address }))
        .to.emit(token, 'Paused')

      expect(await token.paused()).to.equal(true)
    })

    it('admin can unpause', async function () {
      await token.pause({ from: admin1.address })
      await expect(token.unpause({ from: admin1.address })).to.emit(token, 'Unpaused')

      await expect(await token.paused()).to.equal(false)
    })

    it('only admin can pause', async function () {
      await expect(token.pause({ from: holder1 })).to.be.reverted
    })

    it('only admin can unpause', async function () {
      await token.pause({ from: admin1.address })
      await expect(await token.paused()).to.equal(true)

      await expect(token.unpause({ from: holder1 })).to.be.reverted
      await expect(await token.paused()).to.equal(true)

      await expect(token.unpause({ from: admin1.address })).to.emit(token, 'Unpaused')
      await expect(await token.paused()).to.equal(false)
    })

    it('admin can add other admin', async function () {
      const initialAdminCount = (await token.adminCount()).toNumber()

      await token.connect(admin1).addAdmin(admin2.address)
      await expect(await token.isAdmin(admin2.address)).to.equal(true)

      await expect((await token.adminCount()).toNumber()).to.equal(initialAdminCount + 1)
    })

    it('admin can remove other admin', async function () {
      const initialAdminCount = (await token.adminCount()).toNumber()

      await token.connect(admin1).removeAdmin(admin2.address)
      await expect(await token.isAdmin(admin2.address)).to.equal(false)

      await expect((await token.adminCount()).toNumber()).to.equal(initialAdminCount - 1)
    })

    it('only admin can add other admin', async function () {
      const initialAdminCount = (await token.adminCount()).toNumber()

      await expect(token.connect(holder1).addAdmin(holder2.address)).to.be.reverted
      await expect((await token.adminCount()).toNumber()).to.equal(initialAdminCount)
    })

    it('only admin can remove other admin', async function () {
      await token.connect(admin1).addAdmin(admin2.address)
      await expect(await token.isAdmin(admin2.address)).to.equal(true)

      await expect(token.connect(holder1).removeAdmin(admin2.address)).to.be.reverted
      await expect(await token.isAdmin(admin2.address)).to.equal(true)
    })

    it('admin can renounce', async function () {
      await token.connect(admin2).renounceAdmin()
      await expect(await token.isAdmin(admin2.address)).to.equal(false)
    })

    it('cannot remove last admin', async function () {
      await expect(await token.isAdmin(admin1.address)).to.equal(true)

      await expect(token.connect(admin1).removeAdmin(admin1.address)).to.be.reverted
      await expect(token.connect(admin1).renounceAdmin()).to.be.reverted

      await expect(await token.isAdmin(admin1.address)).to.equal(true)
    })

    it('transfers happen when not paused', async function () {
      const amountToTransfer = 1000
      const initialHolderBalance = (await token.balanceOf(holder1.address)).toNumber()
      await token.transfer(holder1.address, amountToTransfer, { from: admin1.address })

      const expectedTotalHolderBalance = initialHolderBalance + amountToTransfer
      const currentBalance = (await token.balanceOf(holder1.address)).toNumber()

      expect(currentBalance).to.be.equal(expectedTotalHolderBalance)
    })

    it('no transfers when paused', async function () {
      await token.pause({ from: admin1.address })
      await expect(token.transfer(holder1.address, 100, { from: admin1.address })).to.be.reverted
    })

    it('transfers work after pausing and unpausing', async function () {
      await token.pause({ from: admin1.address })
      await token.unpause({ from: admin1.address })

      const amountToTransfer = 1000
      const initialHolderBalance = (await token.balanceOf(holder1.address)).toNumber()

      await token.transfer(holder1.address, amountToTransfer, { from: admin1.address })

      const expectedTotalHolderBalance = initialHolderBalance + amountToTransfer
      const currentBalance = (await token.balanceOf(holder1.address)).toNumber()

      expect(currentBalance).to.be.equal(expectedTotalHolderBalance)
    })
  })

  describe('burn tests', function () {
    it('holders can burn', async function () {
      const amountToTransfer = 1000
      const amountToBurn = 500
      const initialHolderBalance = (await token.balanceOf(holder1.address)).toNumber()

      await token.transfer(holder1.address, amountToTransfer)
      await token.connect(holder1).burn(amountToBurn)

      const expectedTotalHolderBalance = initialHolderBalance + amountToTransfer - amountToBurn
      const currentBalance = (await token.balanceOf(holder1.address)).toNumber()

      expect(currentBalance).to.be.equal(expectedTotalHolderBalance)
    })
  })
})
