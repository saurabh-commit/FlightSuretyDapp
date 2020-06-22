var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "canvas antique alley bounce donkey plug bargain noodle razor release sign acid";

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 50);
      },
      network_id: '*',
      gas: 6000000
    }
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};