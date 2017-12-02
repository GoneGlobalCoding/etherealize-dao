import React, {Component} from 'react';
import { Link } from 'react-router-dom';
import Web3 from 'web3'
import config from '../config'

class Dashboard extends Component {
  constructor (props) {
    super(props);
    this.state = {

    };
    this.web3 = null;
    this.initContract = this.initContract.bind(this);
    this.getLatestBlock = this.getLatestBlock.bind(this);
  }
  initContract(){
    const web3provider = config.EthereumDAO.provider;
    const web3 = new Web3(new Web3.providers.HttpProvider(web3provider));
    const abi = config.EthereumDAO.abi;
    const address = config.EthereumDAO.liveAddress;
    const contract = new web3.eth.Contract(abi,address);
    return contract;
  }
  getLatestBlock(){
    return <div>Still a work in progress</div>
  }
  render () {
    const array = this.initContract();
    return (
      <div>
        <h1>Dashboard</h1>
        <p>Current block number as defined by (web3.eth.blockNumber)</p>
        {this.getLatestBlock()}
        Check console.log to see the contract array that would have returned during page load.
        {console.log(array)}
      </div>
    )
  }
}

export default Dashboard
