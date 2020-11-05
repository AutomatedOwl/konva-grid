import React, { Component } from "react";
import SquaresGrid from "./SquaresGrid"
import {
  BrowserRouter as Router
} from "react-router-dom";

class App extends Component {
  render() {
    console.log("Host URL" + process.env.PUBLIC_URL);
    return (
      <Router basename={process.env.PUBLIC_URL}>
        <div className="App">
          <div>
            <SquaresGrid />
          </div>
        </div>
      </Router>
    );
  }
}

export default App;
