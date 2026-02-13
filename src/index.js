import ReactDOM from 'react-dom/client';
import './index.css';  /* This line must be here */
import App from './App';

import React from "react";
import { HashRouter } from "react-router-dom";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <HashRouter>
    <App />
  </HashRouter>
);
