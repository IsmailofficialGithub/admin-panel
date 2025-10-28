import Dashboard from "views/Dashboard.js";
import UserProfile from "views/UserProfile.js";

const consumerRoutes = [
  {
    path: "/dashboard",
    name: "Dashboard",
    icon: "nc-icon nc-chart-pie-35",
    component: Dashboard,
    layout: "/consumer"
  },
  {
    path: "/profile",
    name: "My Profile",
    icon: "nc-icon nc-circle-09",
    component: UserProfile,
    layout: "/consumer"
  }
];

export default consumerRoutes;

