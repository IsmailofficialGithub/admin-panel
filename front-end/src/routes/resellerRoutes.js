import ResellerDashboard from "views/ResellerDashboard.js";
import Account from "views/Account.js";
import Invoices from "views/Invoices.js";
import ResellerConsumers from "views/ResellerConsumers.js";
import ConsumerDetail from "views/ConsumerDetail.js";
// Import other reseller views here as needed

const resellerRoutes = [
  {
    path: "/account",
    component: Account,
    layout: "/reseller",
    invisible: true // Hidden from sidebar
  },
  {
    path: "/consumers/:id",
    component: ConsumerDetail,
    layout: "/reseller",
    invisible: true // Hidden from sidebar
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    icon: "nc-icon nc-chart-pie-35",
    component: ResellerDashboard,
    layout: "/reseller"
  },
  {
    path: "/consumers",
    name: "Consumers",
    icon: "nc-icon nc-circle-09",
    component: ResellerConsumers,
    layout: "/reseller"
  },
  {
    path: "/invoices",
    name: "Invoices",
    icon: "nc-icon nc-single-copy-04",
    component: Invoices,
    layout: "/reseller"
  },
];

export default resellerRoutes;
