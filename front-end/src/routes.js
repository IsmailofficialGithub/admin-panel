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
import Dashboard from "views/Dashboard.js";
import Users from "views/Users.js";
import Consumers from "views/Consumers.js";
import UserProfile from "views/UserProfile.js";
import TableList from "views/TableList.js";
import Typography from "views/Typography.js";
import Icons from "views/Icons.js";
import Maps from "views/Maps.js";
import Notifications from "views/Notifications.js";
import Upgrade from "views/Upgrade.js";
import Resellers from "views/Resellers.js";
import ResellerDetail from "views/ResellerDetail.js";

const dashboardRoutes = [
  // Hidden routes (not shown in sidebar)
  {
    path: "/reseller/:id",
    component: ResellerDetail,
    layout: "/admin",
    invisible: true // This prevents it from showing in sidebar
  },
  // Sidebar routes
  // {
  //   path: "/dashboard",
  //   name: "Dashboard",
  //   icon: "nc-icon nc-chart-pie-35",
  //   component: Dashboard,
  //   layout: "/admin"
  // },
  {
    path: "/users",
    name: "Users",
    icon: "nc-icon nc-badge",
    component: Users,
    layout: "/admin"
  },
  {
    path: "/consumers",
    name: "Consumers",
    icon: "nc-icon nc-circle-09",
    component: Consumers,
    layout: "/admin",
    submenus: [
      {
        path: "/consumers?status=active",
        name: "Active",
        component: Consumers,
        layout: "/admin"
      },
      {
        path: "/consumers?status=deactive",
        name: "Deactive",
        component: Consumers,
        layout: "/admin"
      },
      {
        path: "/consumers?status=expired_subscription",
        name: "Expired",
        component: Consumers,
        layout: "/admin"
      }
    ]
  },
  {
    path: "/resellers",
    name: "Resellers",
    icon: "nc-icon nc-bulb-63",
    component: Resellers,
    layout: "/admin"
  },
  {
    upgrade: true,
    path: "/upgrade",
    name: "Upgrade to PRO",
    icon: "nc-icon nc-alien-33",
    component: Upgrade,
    layout: "/admin"
  },
  // {
  //   path: "/user-profile",
  //   name: "User Profile",
  //   icon: "nc-icon nc-circle-09",
  //   component: UserProfile,
  //   layout: "/admin"
  // },
  // {
  //   path: "/table",
  //   name: "Table List",
  //   icon: "nc-icon nc-notes",
  //   component: TableList,
  //   layout: "/admin"
  // },
  // {
  //   path: "/typography",
  //   name: "Typography",
  //   icon: "nc-icon nc-paper-2",
  //   component: Typography,
  //   layout: "/admin"
  // },
  // {
  //   path: "/icons",
  //   name: "Icons",
  //   icon: "nc-icon nc-atom",
  //   component: Icons,
  //   layout: "/admin"
  // },
  // {
  //   path: "/maps",
  //   name: "Maps",
  //   icon: "nc-icon nc-pin-3",
  //   component: Maps,
  //   layout: "/admin"
  // },
  // {
  //   path: "/notifications",
  //   name: "Notifications",
  //   icon: "nc-icon nc-bell-55",
  //   component: Notifications,
  //   layout: "/admin"
  // }
];

export default dashboardRoutes;
