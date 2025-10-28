/*!

=========================================================
* Light Bootstrap Dashboard React - v2.0.1
=========================================================

* Product Page: https://www.creative-tim.com/product/light-bootstrap-dashboard-react
* Copyright 2022 Creative Tim (https://www.creative-tim.com)
* Licensed under MIT (https://github.com/creativetimofficial/light-bootstrap-dashboard-react/blob/master/LICENSE.md)

* Coded by Creative Tim

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/
import React from "react";
import ReactDOM from "react-dom/client";

import { BrowserRouter, Route, Switch, Redirect } from "react-router-dom";

import "bootstrap/dist/css/bootstrap.min.css";
import "./assets/css/animate.min.css";
import "./assets/scss/light-bootstrap-dashboard-react.scss?v=2.0.0";
import "./assets/css/demo.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

import AdminLayout from "layouts/Admin.js";
import UserLayout from "layouts/User.js";
import ViewerLayout from "layouts/Viewer.js";
import ConsumerLayout from "layouts/Consumer.js";
import ResalerLayout from "layouts/Resaler.js";
import Login from "views/Login.js";
import TrialExpired from "views/TrialExpired.js";
import RoleBasedRoute from "auth/RoleBasedRoute.js";
import { AuthProvider } from "contexts/AuthContext";
import { Toaster } from "react-hot-toast";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <BrowserRouter>
    <AuthProvider>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4caf50',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#f44336',
              secondary: '#fff',
            },
          },
        }}
      />
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/trial-expired" component={TrialExpired} />
        <RoleBasedRoute path="/admin" allowedRole="admin" component={AdminLayout} />
        <RoleBasedRoute path="/user" allowedRole="user" component={UserLayout} />
        <RoleBasedRoute path="/viewer" allowedRole="viewer" component={ViewerLayout} />
        <RoleBasedRoute path="/consumer" allowedRole="consumer" component={ConsumerLayout} />
        <RoleBasedRoute path="/resalers" allowedRole="resaler" component={ResalerLayout} />
        <Redirect from="/" to="/login" />
      </Switch>
    </AuthProvider>
  </BrowserRouter>
);
