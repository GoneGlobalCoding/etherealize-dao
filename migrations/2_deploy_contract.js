var EtherealizeDAO = artifacts.require("./EtherealizeDAO.sol");

module.exports = function(deployer) {
  deployer.deploy(EtherealizeDAO);
};
