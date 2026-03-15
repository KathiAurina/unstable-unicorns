import { BrowserRouter as Router, Switch, Route, Redirect } from "react-router-dom";
import Client from './Client';
import Lobby from './Lobby';

const App = () => {
  return (
    <div>
      <Router>
        <Switch>
          <Route path="/test">
            <Client debug={"test"}/>
          </Route>
          <Route path="/lobby">
            <Lobby />
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
