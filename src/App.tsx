import { BrowserRouter as Router, Switch, Route, Redirect } from "react-router-dom";
import Client from './Client';

const App = () => {
  return (
    <div>
      <Router>
        <Switch>
          <Route path="/test">
            <Client debug={"test"}/>
          </Route>
          <Route path="/:matchID/:numPlayers/:playerID">
              <Client />
          </Route>
          <Route exact path="/">
            <Redirect to="/test" />
          </Route>
        </Switch>
      </Router>
    </div>
  );
}

export default App;
