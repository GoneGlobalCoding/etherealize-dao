module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*"
    },
    ropsten: {
      host: "localhost",
      port: 8545,
      network_id: 3,
      from: "0xe47c4befb25055860fd026e96885b30c7a244b30", // Enter your own address here that is available on the geth node and unlocked.
      gas: 4612388,
      gasPrice: 2776297000
    }
  }
}