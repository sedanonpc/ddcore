const hre = require("hardhat");
const { ethers } = hre;

/**
 * Deployment script for SportsBetting contracts
 * Deploys NFT contract first, then the main betting contract
 */
async function main() {
  console.log("Starting deployment to Core Testnet2...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  // Check deployer balance
  const balance = await deployer.getBalance();
  console.log("Account balance:", ethers.utils.formatEther(balance), "tCORE2");
  
  if (balance.lt(ethers.utils.parseEther("0.1"))) {
    console.warn("Warning: Low balance. Make sure you have enough tCORE2 for deployment.");
  }
  
  // Deploy SportsBettingNFT contract
  console.log("\n1. Deploying SportsBettingNFT contract...");
  const SportsBettingNFT = await ethers.getContractFactory("SportsBettingNFT");
  const nftContract = await SportsBettingNFT.deploy();
  await nftContract.deployed();
  
  console.log("SportsBettingNFT deployed to:", nftContract.address);
  console.log("Transaction hash:", nftContract.deployTransaction.hash);
  
  // Deploy SportsBetting contract
  console.log("\n2. Deploying SportsBetting contract...");
  const SportsBetting = await ethers.getContractFactory("SportsBetting");
  const bettingContract = await SportsBetting.deploy(nftContract.address);
  await bettingContract.deployed();
  
  console.log("SportsBetting deployed to:", bettingContract.address);
  console.log("Transaction hash:", bettingContract.deployTransaction.hash);
  
  // Transfer NFT contract ownership to betting contract
  console.log("\n3. Transferring NFT contract ownership...");
  const transferTx = await nftContract.transferOwnership(bettingContract.address);
  await transferTx.wait();
  console.log("NFT contract ownership transferred to betting contract");
  console.log("Transfer transaction hash:", transferTx.hash);
  
  // Verify deployment
  console.log("\n4. Verifying deployment...");
  const nftOwner = await nftContract.owner();
  console.log("NFT contract owner:", nftOwner);
  console.log("Betting contract address:", bettingContract.address);
  console.log("Ownership transfer successful:", nftOwner === bettingContract.address);
  
  // Display deployment summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("Network: Core Testnet2 (Chain ID: 1114)");
  console.log("Deployer:", deployer.address);
  console.log("SportsBettingNFT:", nftContract.address);
  console.log("SportsBetting:", bettingContract.address);
  console.log("Block Explorer:", "https://scan.test2.btcs.network");
  console.log("=".repeat(60));
  
  // Save deployment addresses to a file
  const deploymentInfo = {
    network: "coreTestnet2",
    chainId: 1114,
    deployer: deployer.address,
    contracts: {
      SportsBettingNFT: nftContract.address,
      SportsBetting: bettingContract.address
    },
    deployedAt: new Date().toISOString(),
    blockExplorer: "https://scan.test2.btcs.network"
  };
  
  const fs = require("fs");
  fs.writeFileSync(
    "deployment-info.json", 
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\nDeployment info saved to deployment-info.json");
  console.log("\nNext steps:");
  console.log("1. Update your .env file with the contract addresses:");
  console.log(`   REACT_APP_NFT_CONTRACT_ADDRESS=${nftContract.address}`);
  console.log(`   REACT_APP_BETTING_CONTRACT_ADDRESS=${bettingContract.address}`);
  console.log("2. Verify contracts on block explorer if needed");
  console.log("3. Fund test wallets with tCORE2 for testing");
}

// Handle deployment errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
