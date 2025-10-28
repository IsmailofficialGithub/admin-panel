import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ component: Component, ...rest }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user || !isAdmin) {
    return <Redirect to="/login" />;
  }

  return <Route {...rest} render={(props) => <Component {...props} />} />;
};

export default ProtectedRoute;
