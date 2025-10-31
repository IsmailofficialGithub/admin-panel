
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
import UserDetail from "views/UserDetail.js";
import ConsumerDetail from "views/ConsumerDetail.js";
import Account from "views/Account.js";
import Products from "views/Products.js";
import Invoices from "views/Invoices.js";

const dashboardRoutes = [
  // Hidden routes (not shown in sidebar)
  {
    path: "/reseller/:id",
    component: ResellerDetail,
    layout: "/admin",
    invisible: true // This prevents it from showing in sidebar
  },
  {
    path: "/users/:id",
    component: UserDetail,
    layout: "/admin",
    invisible: true // This prevents it from showing in sidebar
  },
  {
    path: "/consumers/:id",
    component: ConsumerDetail,
    layout: "/admin",
    invisible: true // This prevents it from showing in sidebar
  },
  {
    path: "/account",
    component: Account,
    layout: "/admin",
    invisible: true // This prevents it from showing in sidebar
  },
  // Sidebar routes
  {
    path: "/dashboard",
    name: "Dashboard",
    icon: "nc-icon nc-chart-pie-35",
    component: Dashboard,
    layout: "/admin"
  },
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
        name: "Expired Subscription",
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
    path: "/products",
    name: "Products",
    icon: "nc-icon nc-notes",
    component: Products,
    layout: "/admin"
  },
  {
    path: "/invoices",
    name: "Invoices",
    icon: "nc-icon nc-single-copy-04",
    component: Invoices,
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
