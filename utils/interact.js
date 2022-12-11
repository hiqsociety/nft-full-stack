const { createAlchemyWeb3 } = require('@alch/alchemy-web3')
import { Network, Alchemy } from 'alchemy-sdk';
import getRevertReason from 'eth-revert-reason';
import { ethers } from "ethers";
const {goerliApiKey} = require('../secrets.json')

// const { MerkleTree } = require('merkletreejs')
// const keccak256 = require('keccak256')
// const whitelist = require('../scripts/whitelist.js')


const eth_goerli_settings = {
  apiKey: `${goerliApiKey}`,
  network: Network.ETH_GOERLI,

};
const alchemy = new Alchemy(eth_goerli_settings);

/** @type import('hardhat/config').HardhatUserConfig */
const GOERLI_RPC_URL = `https://eth-goerli.g.alchemy.com/v2/${eth_goerli_settings.apiKey}`
// const GANACHE_RPC_URL = `http://localhost:8545`


const web3 = createAlchemyWeb3(GOERLI_RPC_URL)

import { config } from '../dapp.config'

const contract = require('../artifacts/contracts/PRT.sol/PRT.json')
const prtContract = new web3.eth.Contract(contract.abi, config.contractAddress)

// // Calculate merkle root from the whitelist array
// const leafNodes = whitelist.map((addr) => keccak256(addr))
// const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true })
// const root = merkleTree.getRoot()

export const getTotalPRT = async () => {
  return await prtContract.methods.getTotalPRT().call()
}


export const getTotalMinted = async () => {
  return await prtContract.methods.getTotalMinted().call()
}


export const getMaxSupply = async () => {
  const MAX_SUPPLY_PRT = await prtContract.methods.MAX_SUPPLY_PRT().call()
  return MAX_SUPPLY_PRT
}

export const getMaxSupplyForNFT = async () => {
  const MAX_SUPPLY_FOR_TOKEN = await prtContract.methods.MAX_SUPPLY_FOR_TOKEN().call()
  return MAX_SUPPLY_FOR_TOKEN
}


export const isPreSalePRT = async () => {
  return await prtContract.methods.presalePRT().call()
}

export const getIsMintIsOpen = async () => {
  return await prtContract.methods.mintIsOpen().call()
}


export const getPrice = async () => {
  const price = await prtContract.methods.PRICE_PRT().call()
  return price
}

export const getPerAccountPRT = async (wallet) => {
  if (!wallet?.accounts[0]?.address) {
    return 0
  }

  const perAccountPRT = await prtContract.methods.perAccountPRT(wallet?.accounts[0]?.address).call()
  return perAccountPRT
}

export const isWinner = async (wallet) => {
  if (!wallet?.accounts[0]?.address) {
    return 0
  }

  return await prtContract.methods.isWinner(wallet?.accounts[0]?.address).call()
}


export const buyPRT = async (prtAmount, wallet) => {
  
  

  if (!window.ethereum.selectedAddress) {
    return {
      success: false,
      status: 'To be able to buy, you need to connect your wallet.'
    }
  }

  if (window.ethereum.selectedAddress !== wallet?.accounts[0]?.address) {
    return {
      success: false,
      status: 'Select correct account in metamask.'
    }
  }


  const nonce = await web3.eth.getTransactionCount(
    window.ethereum.selectedAddress,
    'latest'
  )

  // Set up our Ethereum transaction
  // function buyPRT (address account, uint8 _amount_wanted_able_to_get)
  const tx = {
    to: config.contractAddress,
    from: window.ethereum.selectedAddress,
    value: parseInt(
      web3.utils.toWei(String(config.price * prtAmount), 'ether')
    ).toString(16), // hex
    data: prtContract.methods
      .buyPRT(window.ethereum.selectedAddress, prtAmount)
      .encodeABI(),
    nonce: nonce.toString(16) 
  }

  async function checkStatusTx(txHash) {
    let isPending = true;

    return new Promise(async(resolve, reject) => {
      while (isPending) {
          
        const res = await alchemy.core.getTransaction(txHash)
        const {blockHash, blockNumber, transactionIndex} = res ?? {}
        isPending =  blockHash === null && blockNumber === null && transactionIndex === null
      }

  
      if (!isPending) {
        const receipt = await alchemy.core.getTransactionReceipt(txHash)
        resolve(receipt)
      }

    });   
  }

  let isReverted = false;
  let txHash = '';
  try {
    txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [tx]
    })
    console.log({txHash})
    const receipt = await checkStatusTx(txHash)
    console.log({receipt});


    isReverted = receipt.status === 0 
    if (isReverted) {
      const reason = await getRevertReason(txHash, 'goerli', receipt?.blockNumber) 
      console.log({reason})
      return {
        success: false,
        status: '😞 Transaction is reverted:' + reason +  (txHash ? `. https://goerli.etherscan.io/tx/${txHash}` : '')
      }
    }

    let prtTokens_owned = ''
    
    if (receipt?.logs?.length > 0) {

      const parced_logs = receipt?.logs.map(log => {
        const {data, topics} = log
        const iface = new ethers.utils.Interface(contract.abi)
        const parced = iface.parseLog({ data, topics });
        return parced
      });

      const [ditributePRTs_log] =  parced_logs?.filter(i => i?.name === 'DitributePRTs' ) 
      prtTokens_owned =  ditributePRTs_log?.args?.list?.map(_BigNumber => _BigNumber?.toString())?.join(', ')

      // alchemy.core.getLogs({
      //   address: config.contractAddress,
      //   topics: [
      //     ...log.topics
      //   ],
      //   blockHash: log.blockHash,
      // }).then((res) => console.log(`log?`, res));

    }


    return {
      success: true,
      status: (
        <a href={`https://goerli.etherscan.io/tx/${txHash}`} rel="noreferrer" target="_blank">
          <span>✅ Success, check out your transaction on Etherscan:</span><br/>
          <span>{`https://goerli.etherscan.io/tx/${txHash}`}</span><br/>
          <span>PRT tokens owned: {prtTokens_owned}</span>
        </a>
      )
    }



  } catch (error) {
    return {
      success: false,
      status: (isReverted ? '😞 Transaction is reverted: ' : '😞 Smth went wrong: ') + error.message + (txHash ? `. https://goerli.etherscan.io/tx/${txHash}` : '')
    }
  }
}

export const mintNFT = async (wallet) => {
  
  if (!window.ethereum.selectedAddress) {
    return {
      success: false,
      status: 'To be able to buy, you need to connect your wallet.'
    }
  }

  if (window.ethereum.selectedAddress !== wallet?.accounts[0]?.address) {
    return {
      success: false,
      status: 'Select correct account in metamask.'
    }
  }


  const nonce = await web3.eth.getTransactionCount(
    window.ethereum.selectedAddress,
    'latest'
  )

    // Set up our Ethereum transaction
  // const tx = {
  //   to: config.contractAddress,
  //   from: window.ethereum.selectedAddress,
  //   value: parseInt(
  //     web3.utils.toWei(String(config.price * prtAmount), 'ether')
  //   ).toString(16), // hex
  //   data: prtContract.methods.publicSaleMint(prtAmount).encodeABI(),
  //   nonce: nonce.toString(16)
  // }

  // Set up our Ethereum transaction
  // function buyPRT (address account, uint8 _amount_wanted_able_to_get)
  const counterTokenID = await getTotalMinted()
  const val = counterTokenID < 1000 ? String(0) : String(config.priceNFT * 1)

  const tx = {
    to: config.contractAddress,
    from: window.ethereum.selectedAddress,
    value: parseInt(
      web3.utils.toWei(val, 'ether')
    ).toString(16), // hex
    data: prtContract.methods
      .publicSaleMint()
      .encodeABI(),
    nonce: nonce.toString(16) 
  }

  async function checkStatusTx(txHash) {
    let isPending = true;

    return new Promise(async(resolve, reject) => {
      while (isPending) {
          
        const res = await alchemy.core.getTransaction(txHash)
        const {blockHash, blockNumber, transactionIndex} = res ?? {}
        isPending =  blockHash === null && blockNumber === null && transactionIndex === null
      }

  
      if (!isPending) {
        const receipt = await alchemy.core.getTransactionReceipt(txHash)
        resolve(receipt)
      }

    });   
  }

  let isReverted = false;
  let txHash = '';
  try {
    txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [tx]
    })
    console.log({txHash})
    const receipt = await checkStatusTx(txHash)
    console.log({receipt});


    isReverted = receipt.status === 0 
    if (isReverted) {
      const reason = await getRevertReason(txHash, 'goerli', receipt?.blockNumber) 
      console.log({reason})
      return {
        success: false,
        status: '😞 Transaction is reverted:' + reason +  (txHash ? `. https://goerli.etherscan.io/tx/${txHash}` : '')
      }
    }

    let minterLogOutput = {}
    
    if (receipt?.logs?.length > 0) {

      const parced_logs = receipt?.logs.map(log => {
        const {data, topics} = log
        const iface = new ethers.utils.Interface(contract.abi)
        const parced = iface.parseLog({ data, topics });
        return parced
      });

      const arr =  parced_logs?.filter(i => i?.name === 'Minter' ) 
      const [log] = arr
      minterLogOutput.tokenID =  log?.args?.tokenID?.toString()
      minterLogOutput.price = log?.args?.price?.toString()

      // alchemy.core.getLogs({
      //   address: config.contractAddress,
      //   topics: [
      //     ...log.topics
      //   ],
      //   blockHash: log.blockHash,
      // }).then((res) => console.log(`log?`, res));

    }


    return {
      success: true,
      status: (
        <a href={`https://goerli.etherscan.io/tx/${txHash}`} rel="noreferrer" target="_blank">
          <span>✅ Success, check out your transaction on Etherscan:</span><br/>
          <span>{`https://goerli.etherscan.io/tx/${txHash}`}</span><br/>
          <span>Minted NFT ID: {minterLogOutput?.tokenID}, price of NFT: {minterLogOutput?.price}</span>
        </a>
      )
    }



  } catch (error) {
    return {
      success: false,
      status: (isReverted ? '😞 Transaction is reverted: ' : '😞 Smth went wrong: ') + error.message + (txHash ? `. https://goerli.etherscan.io/tx/${txHash}` : '')
    }
  }
}


