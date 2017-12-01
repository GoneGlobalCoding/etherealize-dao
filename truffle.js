var HDWalletProvider = require("truffle-hdwallet-provider");

var infura_apikey = null;
var mnemonic = null;

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*"
    },
    ropsten: {
      provider: new HDWalletProvider(mnemonic, "https://ropsten.infura.io/"+infura_apikey),
      network_id: 3,
      gas: 4712388
    }
  }
}