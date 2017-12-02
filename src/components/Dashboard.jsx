import React, {Component} from 'react';
import { Link } from 'react-router-dom';
import Web3 from 'web3'
import config from '../config'

import {Card, CardActions, CardHeader, CardMedia, CardTitle, CardText} from 'material-ui/Card';
import FlatButton from 'material-ui/FlatButton';
import List, { ListItem, ListItemText } from 'material-ui/List';
import Divider from 'material-ui/Divider';
import Table, { TableBody, TableCell, TableHead, TableRow } from 'material-ui/Table';
import Paper from 'material-ui/Paper';

import Moment from 'moment'

class Dashboard extends Component {
  constructor (props) {
    super(props);
    this.web3 = this.initProvider()
    this.state = {
      contract : null,
      latestBlock : null,
      currentBlockNumber : null,
      currentBlockUpdate : null,
      networkName : config.EthereumDAO.network,
      daoAddress :  config.EthereumDAO.liveAddress
    };
  }
  initProvider(){
    const web3provider = config.EthereumDAO.provider
    const web3 = new Web3(new Web3.providers.HttpProvider(web3provider))
    return web3
  }
  getDAOContract(){
    const abi = config.EthereumDAO.abi
    const address = config.EthereumDAO.liveAddress
    const contract = new this.web3.eth.Contract(abi,address)
    this.setState({contract: contract})
    return contract
  }
  getLatestBlock(){
    const recentBlock = this.web3.eth.getBlock('latest')
    .then((block)=>{
      this.setState({latestBlock: block})
      console.log(block)
    })
    .catch((error)=>{
      console.log(error)
    })
  }
  getCurrentBlockNumber(){
    this.web3.eth.getBlockNumber(
      function(error,number){
        if(error == null){
          console.log("No error and " + number)
          Moment.locale('en');
          let dt = Date.now()
          let currentTime = Moment(dt).format('LLLL HH:mm:ss')
          this.setState({ currentBlockNumber: number,
                          currentBlockUpdate: currentTime})
        } else {
          console.log(error)
        }
      }.bind(this)
    )
  }
  componentDidMount(){
    this.getDAOContract()
    this.getLatestBlock()
    this.getCurrentBlockNumber()   
    setInterval(() => this.getCurrentBlockNumber(), 20000);
  }
  render () {
    const { contract, latestBlock, currentBlockNumber,
            networkName, daoAddress, currentBlockUpdate } = this.state;
    const card = {
      maxWidth: 600,
      margin: "0 auto"
    };
    
    return (
      <Card style={card}>
        <CardHeader
          title={<h1 style={{margin: 0}}>EtherealizeDAO Contract</h1>}
          subtitle={
            <div>
              <p>Using Ethereum Network: <strong>{networkName}</strong></p>
              <span>Contract Address: </span><a href={`http://ropsten.etherscan.io/address/${daoAddress}#code`}>{daoAddress}</a>
            </div>}
          avatar={require("../static/img/avatar.jpg")}
        />
        <CardMedia
            overlay={
              <CardTitle 
                title={`EtherealizeDAO Contract`}/>
              }>
          <img src={require("../static/img/test.jpg")} alt="" />
        </CardMedia>
        <CardTitle title="Web3 Interactions" subtitle="web3.eth.functions" />
        <CardText>
          <div style={{"height" : "60px"}}>
            <span style={{"display":"block","color":"grey","float":"left","clear":"both"}}>
              web3.eth.getBlockNumber().then(function(error,number)). Set interval: 20 seconds
            </span>
            <span style={{"display":"block","float":"left","clear":"left","marginRight":"15px"}}>
              BlockNumber:
            </span> 
            <span style={{"display":"block","color":"blue", "float":"left"}}>
              {currentBlockNumber}
            </span>
            <span style={{"display":"block","color":"grey", "clear": "both","float":"left"}}>
              Last updated at {currentBlockUpdate}
            </span>
          </div>
        </CardText>
        <CardActions>
          <FlatButton label="Action1" />
          <FlatButton label="Action2" />
        </CardActions>
      </Card>
    )
  }
}

export default Dashboard;
