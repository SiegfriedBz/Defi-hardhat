const { ethers, getNamedAccounts } = require("hardhat")

async function getWeth(ethAmount) {
  const { deployer } = await getNamedAccounts()
  // call the deposit function on the Weth ERC20 contract
  /// need ABI (IWeth.sol) + MAIN Net address (forked main net)
  const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
  const iweth = await ethers.getContractAt("IWeth", wethAddress, deployer)
  let transactionResponse = await iweth.deposit({ value: ethAmount })
  await transactionResponse.wait(1)
  const wethBalance = await iweth.balanceOf(deployer)
  console.log(`wethBalance: ${ethers.utils.formatEther(wethBalance)} WETH`)
  return wethBalance
}

module.exports = { getWeth }
