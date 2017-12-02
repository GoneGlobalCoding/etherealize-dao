### Pre-requisites

```
$ truffle --version
Truffle v4.0.1 - a development framework for Ethereum
```

### Pull repo and proceed straight to the node setup/truffle.js config sections
```
git clone https://github.com/etherealize/etherealize-dao.git
```
### ALTERNATIVE - development from empty directory using these steps (if starting from an empty directory)
```
mkdir -p ~/etherealize-dao
truffle init
```

### Create and write the DAO contract. 
Code reference from https://ethereum.org/dao

```
cat contracts/EtherealizeDAO.sol
```
```
pragma solidity ^0.4.16;

contract owned {
    address public owner;

    function owned()  public {
        owner = msg.sender;
    }

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    function transferOwnership(address newOwner) onlyOwner  public {
        owner = newOwner;
    }
}

contract tokenRecipient {
    event receivedEther(address sender, uint amount);
    event receivedTokens(address _from, uint256 _value, address _token, bytes _extraData);

    function receiveApproval(address _from, uint256 _value, address _token, bytes _extraData) public {
        Token t = Token(_token);
        require(t.transferFrom(_from, this, _value));
        receivedTokens(_from, _value, _token, _extraData);
    }

    function () payable  public {
        receivedEther(msg.sender, msg.value);
    }
}

interface Token {
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success);
}

contract EtherealizeDAO is owned, tokenRecipient {
    // Contract Variables and events
    uint public minimumQuorum;
    uint public debatingPeriodInMinutes;
    int public majorityMargin;
    Proposal[] public proposals;
    uint public numProposals;
    mapping (address => uint) public memberId;
    Member[] public members;

    event ProposalAdded(uint proposalID, address recipient, uint amount, string description);
    event Voted(uint proposalID, bool position, address voter, string justification);
    event ProposalTallied(uint proposalID, int result, uint quorum, bool active);
    event MembershipChanged(address member, bool isMember);
    event ChangeOfRules(uint newMinimumQuorum, uint newDebatingPeriodInMinutes, int newMajorityMargin);

    struct Proposal {
        address recipient;
        uint amount;
        string description;
        uint votingDeadline;
        bool executed;
        bool proposalPassed;
        uint numberOfVotes;
        int currentResult;
        bytes32 proposalHash;
        Vote[] votes;
        mapping (address => bool) voted;
    }

    struct Member {
        address member;
        string name;
        uint memberSince;
    }

    struct Vote {
        bool inSupport;
        address voter;
        string justification;
    }

    // Modifier that allows only shareholders to vote and create new proposals
    modifier onlyMembers {
        require(memberId[msg.sender] != 0);
        _;
    }

    /**
     * Constructor function
     */
    function EtherealizeDAO (
        uint minimumQuorumForProposals,
        uint minutesForDebate,
        int marginOfVotesForMajority
    )  payable public {
        changeVotingRules(minimumQuorumForProposals, minutesForDebate, marginOfVotesForMajority);
        // It’s necessary to add an empty first member
        addMember(0, "");
        // and let's add the founder, to save a step later
        addMember(owner, 'founder');
    }

    /**
     * Add member
     *
     * Make `targetMember` a member named `memberName`
     *
     * @param targetMember ethereum address to be added
     * @param memberName public name for that member
     */
    function addMember(address targetMember, string memberName) onlyOwner public {
        uint id = memberId[targetMember];
        if (id == 0) {
            memberId[targetMember] = members.length;
            id = members.length++;
        }

        members[id] = Member({member: targetMember, memberSince: now, name: memberName});
        MembershipChanged(targetMember, true);
    }

    /**
     * Remove member
     *
     * @notice Remove membership from `targetMember`
     *
     * @param targetMember ethereum address to be removed
     */
    function removeMember(address targetMember) onlyOwner public {
        require(memberId[targetMember] != 0);

        for (uint i = memberId[targetMember]; i<members.length-1; i++){
            members[i] = members[i+1];
        }
        delete members[members.length-1];
        members.length--;
    }

    /**
     * Change voting rules
     *
     * Make so that proposals need tobe discussed for at least `minutesForDebate/60` hours,
     * have at least `minimumQuorumForProposals` votes, and have 50% + `marginOfVotesForMajority` votes to be executed
     *
     * @param minimumQuorumForProposals how many members must vote on a proposal for it to be executed
     * @param minutesForDebate the minimum amount of delay between when a proposal is made and when it can be executed
     * @param marginOfVotesForMajority the proposal needs to have 50% plus this number
     */
    function changeVotingRules(
        uint minimumQuorumForProposals,
        uint minutesForDebate,
        int marginOfVotesForMajority
    ) onlyOwner public {
        minimumQuorum = minimumQuorumForProposals;
        debatingPeriodInMinutes = minutesForDebate;
        majorityMargin = marginOfVotesForMajority;

        ChangeOfRules(minimumQuorum, debatingPeriodInMinutes, majorityMargin);
    }

    /**
     * Add Proposal
     *
     * Propose to send `weiAmount / 1e18` ether to `beneficiary` for `jobDescription`. `transactionBytecode ? Contains : Does not contain` code.
     *
     * @param beneficiary who to send the ether to
     * @param weiAmount amount of ether to send, in wei
     * @param jobDescription Description of job
     * @param transactionBytecode bytecode of transaction
     */
    function newProposal(
        address beneficiary,
        uint weiAmount,
        string jobDescription,
        bytes transactionBytecode
    )
        onlyMembers public
        returns (uint proposalID)
    {
        proposalID = proposals.length++;
        Proposal storage p = proposals[proposalID];
        p.recipient = beneficiary;
        p.amount = weiAmount;
        p.description = jobDescription;
        p.proposalHash = keccak256(beneficiary, weiAmount, transactionBytecode);
        p.votingDeadline = now + debatingPeriodInMinutes * 1 minutes;
        p.executed = false;
        p.proposalPassed = false;
        p.numberOfVotes = 0;
        ProposalAdded(proposalID, beneficiary, weiAmount, jobDescription);
        numProposals = proposalID+1;

        return proposalID;
    }

    /**
     * Add proposal in Ether
     *
     * Propose to send `etherAmount` ether to `beneficiary` for `jobDescription`. `transactionBytecode ? Contains : Does not contain` code.
     * This is a convenience function to use if the amount to be given is in round number of ether units.
     *
     * @param beneficiary who to send the ether to
     * @param etherAmount amount of ether to send
     * @param jobDescription Description of job
     * @param transactionBytecode bytecode of transaction
     */
    function newProposalInEther(
        address beneficiary,
        uint etherAmount,
        string jobDescription,
        bytes transactionBytecode
    )
        onlyMembers public
        returns (uint proposalID)
    {
        return newProposal(beneficiary, etherAmount * 1 ether, jobDescription, transactionBytecode);
    }

    /**
     * Check if a proposal code matches
     *
     * @param proposalNumber ID number of the proposal to query
     * @param beneficiary who to send the ether to
     * @param weiAmount amount of ether to send
     * @param transactionBytecode bytecode of transaction
     */
    function checkProposalCode(
        uint proposalNumber,
        address beneficiary,
        uint weiAmount,
        bytes transactionBytecode
    )
        constant public
        returns (bool codeChecksOut)
    {
        Proposal storage p = proposals[proposalNumber];
        return p.proposalHash == keccak256(beneficiary, weiAmount, transactionBytecode);
    }

    /**
     * Log a vote for a proposal
     *
     * Vote `supportsProposal? in support of : against` proposal #`proposalNumber`
     *
     * @param proposalNumber number of proposal
     * @param supportsProposal either in favor or against it
     * @param justificationText optional justification text
     */
    function vote(
        uint proposalNumber,
        bool supportsProposal,
        string justificationText
    )
        onlyMembers public
        returns (uint voteID)
    {
        Proposal storage p = proposals[proposalNumber];         // Get the proposal
        require(!p.voted[msg.sender]);         // If has already voted, cancel
        p.voted[msg.sender] = true;                     // Set this voter as having voted
        p.numberOfVotes++;                              // Increase the number of votes
        if (supportsProposal) {                         // If they support the proposal
            p.currentResult++;                          // Increase score
        } else {                                        // If they don't
            p.currentResult--;                          // Decrease the score
        }

        // Create a log of this event
        Voted(proposalNumber,  supportsProposal, msg.sender, justificationText);
        return p.numberOfVotes;
    }

    /**
     * Finish vote
     *
     * Count the votes proposal #`proposalNumber` and execute it if approved
     *
     * @param proposalNumber proposal number
     * @param transactionBytecode optional: if the transaction contained a bytecode, you need to send it
     */
    function executeProposal(uint proposalNumber, bytes transactionBytecode) public {
        Proposal storage p = proposals[proposalNumber];

        require(now > p.votingDeadline                                            // If it is past the voting deadline
            && !p.executed                                                         // and it has not already been executed
            && p.proposalHash == keccak256(p.recipient, p.amount, transactionBytecode)  // and the supplied code matches the proposal
            && p.numberOfVotes >= minimumQuorum);                                  // and a minimum quorum has been reached...

        // ...then execute result

        if (p.currentResult > majorityMargin) {
            // Proposal passed; execute the transaction

            p.executed = true; // Avoid recursive calling
            require(p.recipient.call.value(p.amount)(transactionBytecode));

            p.proposalPassed = true;
        } else {
            // Proposal failed
            p.proposalPassed = false;
        }

        // Fire Events
        ProposalTallied(proposalNumber, p.currentResult, p.numberOfVotes, p.proposalPassed);
    }
}
```

### Set up the truffle.js config appropriate to your deploy network

You have two options when using the below truffle.js config:
1. Deploy to your local RPC docker container
or
1. Deploy to ropsten testnet

#### Reminder: this is how you bring up your local RPC docker container on port 8545
```
git clone https://github.com/trufflesuite/ganache-cli.git
cd ganache-cli
docker build -t trufflesuite/ganache-cli .
docker run -d -p 8545:8545 trufflesuite/ganache-cli:latest -a 10 --debug
```
#### Reminder: if deploying to ropsten network via infura, make sure you have the hd wallet provider
```
cd ~/etherealize-dao
npm install truffle-hdwallet-provider -S
```

```
cat truffle.js
```
```
var HDWalletProvider = require("truffle-hdwallet-provider");

var infura_apikey = "<enter infua api key here>";
var mnemonic = "<enter meta mask mnemonic for your ropsten wallet here>";

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
```

### If deploying your contract to local ropsten node, bring the node up on your machine
Note: must have geth on your machine. Get go-ethereum from associated git following their quick install.
```
geth --unlock <ENTER HASH OF ACCOUNT ON NODE THAT HAS ETH AND CAN DEPLOY CONTRACTS> --testnet --cache=1024 --bootnodes "enode://20c9ad97c081d63397d7b685a412227a40e23c8bdc6688c6f37e97cfbc22d2b4d1db1510d8f61e6a8866ad7f0e17c02b14182d37ea7c3c8b9c2683aeb6b733a1@52.169.14.227:30303,enode://6ce05930c72abc632c58e2e4324f7c7ea478cec0ed4fa2528982cf34483094e9cbc9216e7aa349691242576d552a2a56aaeae426c5303ded677ce455ba1acd9d@13.84.180.240:30303" --rpc --rpcaddr "127.0.0.1" --rpcport "8545" --rpccorsdomain "*" --rpcapi "web3,db,net,personal,txpool,eth,admin,shh,debug"
```
You can attach to the node to execute web3 command like below
```
geth attach ipc:/home/$USER/.ethereum/testnet/geth.ipc
> web3.eth.syncing
false

> web3.eth.blockNumber
2179597
```
### Modify the truffle.js config to be appropriate for the node. The key is to specify the from address that has been unlocked already
```
cat truffle.js
```
```
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
      from: "0xe47c4befb25055860fd026e96885b30c7a244b30", // Enter your geth node wallet public address here that is unlocked as per above geth node
      gas: 4612388,
      gasPrice: 2776297000
    }
  }
}

```
### You'll have to ensure that the node you are connecting to has an account that enables deploying of contracts
If you don't unlock an account on your go-ethereum node, your attempt to deploy will be met with the following error
```
Error encountered, bailing. Network state unknown. Review successful transactions manually.
Error: authentication needed: password or unlock
```
1. Ensure your go-ethereum node that you launched above had a --unlock flag with the subsequent public address of a linked account
1. Attach to your node to ensure that unlocked account is set to the default account of the node - for future contract deploy requests
```
$ geth attach ipc:/home/$USER/.ethereum/testnet/geth.ipc
> eth.accounts
["0xf02c6879a095869357d792a501530254ed68aeb3", "0xe47c4befb25055860fd026e96885b30c7a244b30"]
> eth.defaultAccount
undefined
> eth.defaultAccount = eth.accounts[1]
"0xe47c4befb25055860fd026e96885b30c7a244b30"
```
### Alternatively a new migration file can accept an environment variable for the purpose of unlocking the geth node account for contract deploy.
This is a FYI - do not actually do this
```
npm install web3 -S
```
```
cat migrations/3_deploy_contract_geth.js
```
```
const Web3 = require('web3');

const TruffleConfig = require('../truffle');

var EtherealizeDAO = artifacts.require("./EtherealizeDAO.sol");


module.exports = function(deployer, network, addresses) {
  const config = TruffleConfig.networks[network];

  if (process.env.ACCOUNT_PASSWORD) {
    const web3 = new Web3(new Web3.providers.HttpProvider('http://' + config.host + ':' + config.port));

    console.log('>> Unlocking account ' + config.from);
    web3.personal.unlockAccount(config.from, process.env.ACCOUNT_PASSWORD, 36000);
  }

  console.log('>> Deploying EtherealizeDAO');
  deployer.deploy(EtherealizeDAO);
};
```

Move other migrations in the migrations folder to another filename to avoid them migration
```
mv migrations/1_initial_migration.js migrations/1_initial_migration.js.bak
mv migrations/2_deploy_contract.js.bak migrations/2_deploy_contract.js.bak
```

### Use truffle to migrate contract to the target network
```
ACCOUNT_PASSWORD="PASS PHRASE TO UNLOCK YOUR GETH 'from' ACCOUNT" truffle migrate --network ropsten
```

## Back on track - deploy the contract
### Prior to deployment, ensure you've created a migration file that links to the contract
```
cat migrations/2_deploy_contract.js
```
```
var EtherealizeDAO = artifacts.require("./EtherealizeDAO.sol");

module.exports = function(deployer) {
  deployer.deploy(EtherealizeDAO);
};
```

### Use truffle to migrate contract to the target network
```
cd ~/etherealize-dao
truffle migrate --network ropsten
Using network 'ropsten'.

Running migration: 2_deploy_contract.js
  Deploying EtherealizeDAO...
  ... 0x43e234a2fad5125b9f0a4ee9f5e69d24bcef1f7131658dda9fb0a2c9f07b1966
  EtherealizeDAO: 0x0e0e3d3e8e7347d446b4956ba65aed39dd625967
Saving successful migration to network...
  ... 0x359ddbbb86216f117b8ab29e23306ff6df0106d214e9ce04584ce83ed342874f
Saving artifacts...
```

### Grab the EtherealizeDAO address after successful deploy
https://ropsten.etherscan.io/address/0x0e0e3d3e8e7347d446b4956ba65aed39dd625967#code

You should now be able to interact with the contract. Use web3 from a front end app for example.

## Start the react front end development web server. Opens up on localhost:3006
```
npm install
npm start
```
