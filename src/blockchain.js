/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if( this.height === -1){
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }

    
    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to 
     * create the `block hash` and push the block into the chain array. Don't for get 
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention 
     * that this method is a private method. 
     */
    _addBlock(block) {
        return new Promise(async (resolve, reject) => {
            // Get current height of the blockchain
            let chainHeight = await this.getChainHeight();
            // Check if there is a genesis block
            if(chainHeight >= 0) {
                // Get previous block
                const prevBlock = await this.getBlockByHeight(this.height);
                // Assign previous block's hash to the new block's constructor
                block.previousBlockHash = prevBlock.hash;
            }
            // Assign a new hash for this new block
            block.hash = SHA256(JSON.stringify(block)).toString();
            // Assign timestamp of this new block
            block.time = new Date().getTime().toString().slice(0,-3);
            // Validate block to make sure there is a link
            let isValid = await this.validateChain();
            // When blockchain link is not broken
            if(isValid){
                // Add the new block to the blockchain
                this.chain.push(block);
                // Update the new block height after pushing the new block
                block.height = chainHeight + 1;
                // Update the current height
                this.height = block.height
            }
            // Return the latest block added to blockchain
            resolve(block);
        });
    }
            
    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
            resolve(address + ':' + new Date().getTime().toString().slice(0, -3) + ':starRegistery')
        });
    }
    
    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
    */
    submitStar(address, message, signature, star) {
        return new Promise(async (resolve, reject) => {
            let msgTime = parseInt(message.split(':')[1]);
            let currTime = parseInt(new Date().getTime().toString().slice(0, -3));
            // Check if time elapsed is less than 5 minutes
            if ((currTime - msgTime) <= 300) {
                // Verify msg is valid using 'bitcoinjs-message' library
                const msgValid = bitcoinMessage.verify(message, address, signature);
                if (msgValid) {
                    // Create a new block
                    let newBlock = new BlockClass.Block({"star":star,"owner":address});
                    // Add the new block to the chain
                    await this._addBlock(newBlock);
                    resolve(newBlock);
                }
            } else {
                reject();
            }
        });
    }
            
    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        return new Promise((resolve, reject) => {
            // Find block that has matching hash
            let block = this.chain.find((block) => hash === block.hash);
            if (block) {
                resolve(block);
            } else {
                reject();
            }
        });
    }
            
    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {
        return new Promise((resolve, reject) => {
            // Find block that has matching height
            let block = this.chain.find(block => block.height === height);
            if (block) {
                resolve(block);
            } else {
                reject();
            }
        });
    }
            
    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and are belongs to the owner with the wallet address passed as parameter.
     * Remember the star should be returned decoded.
     * @param {*} address 
     */
    getStarsByWalletAddress (address) {
        let stars = [];
        return new Promise((resolve, reject) => {
            // Loop through each block
            this.chain.forEach(async(block) => {
                // Get decoded block data
                let data = await block.getBData();
                // If there is matching owner by the address, add the decoded block data to list and return
                if (data.owner === address) {
                    stars.push(data);
                } else {
                    reject();
                }
            });
            resolve(stars);
        });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */
    validateChain() {
        let errorLog = [];
        return new Promise(async (resolve, reject) => {
            this.chain.forEach(async(block) => {
                // Check if its Genesis Block
                if (block.height === 0) {
                    // Check if genesis block is valid
                    let isValid = await block.validate();
                    if (isValid){
                        errorLog.push("Genesis Block is not valid");
                    }
                // Check current block's previousBlockHash matches to make sure link isn't broken
                } else if (block.previousBlockHash === this.chain[block.height-1].hash) {
                    // Check if current block is valid
                    let isValid = await block.validate();
                    if (isValid){
                        errorLog.push(block + "is not validated");
                    }
                }
            });
            resolve(errorLog);
        });
    }

}

module.exports.Blockchain = Blockchain;   