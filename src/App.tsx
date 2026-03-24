import { BrowserRouter as Router, Switch, Route, Redirect } from "react-router-dom";
import Client from './Client';
import LobbyPage from './components/lobby/LobbyPage';

const App = () => {
  return (
    <div>
      <Router>
        <Switch>
          <Route path="/test">
            <Client debug={"test"}/>
          </Route>
          <Route path="/lobby">
            <LobbyPage />
          </Route>
          <Route path="/:matchID/:numPlayers/:playerID">
              <Client />
          </Route>
          <Route exact path="/">
            <Redirect to="/lobby" />
          </Route>
        </Switch>
      </Router>
    </div>
  );
}

export default App;
