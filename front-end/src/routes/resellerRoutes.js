import ResellerConsumers from "views/ResellerConsumers.js";

const resellerRoutes = [
  {
    path: "/consumers",
    name: "My Consumers",
    icon: "nc-icon nc-single-02",
    component: ResellerConsumers,
    layout: "/resellers"
  }
];

export default resellerRoutes;

