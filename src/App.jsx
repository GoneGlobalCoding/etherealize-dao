import React, {Component} from 'react'
import { Route, Redirect, Switch, Link } from 'react-router-dom'
import axios from 'axios'
import NotFound from './components/NotFound'
import Dashboard from './components/Dashboard'
import { MuiThemeProvider, createMuiTheme } from 'material-ui/styles';

class App extends Component {
  // Upon construction of the app, first check if there exists an authToken key and user, if so set authenticated to true.
  constructor (props) {
    super(props)
    this.state = {
      isAuthenticated: false
    }
    this.axois = this.axois.bind(this)
  }
  axois(){
    let authToken = window.localStorage.getItem("authToken");
    if(authToken === null){
      return false;
    }
    const options = {
      url: 'http://localhost:3000/users/user',
      method: 'get',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    };
    return axios(options)
    .then((res) => {
      console.log("THEN");
      window.localStorage.setItem('user', res.data.user)
      this.setState({ isAuthenticated: true })
      this.createFlashMessage('Welcome back!')
      return true;
    })
    .catch((error) => {
      // const errorMessage = error.response.data.error
      console.log("ERROR");
      this.setState({ isAuthenticated: false })
      this.createFlashMessage("failed")
      return false;
    })
  }

  render () {
    const {isAuthenticated} = this.state
    const theme = createMuiTheme;
    return (
      <MuiThemeProvider theme={theme} styles={{"#root" : {"background-color":"#b7a7b7"}}}>
        <div className='App container'>
          <Switch>
            <Route 
              exact path='/protected' 
              render={() => (
                isAuthenticated
                ? <h1>Authenticated</h1>
                : <Redirect to={{
                  pathname: '/'
              }} />
            )} />
            <Route 
              path='/' 
              render={() => (
                <Dashboard/>
              )} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </MuiThemeProvider>
    )
  }
}

export default App
