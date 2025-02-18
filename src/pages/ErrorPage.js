import React from 'react';
import { Link } from 'react-router-dom';

const Page404 = () => {
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1 style={{ fontSize: '3rem', color: 'red' }}>404 - Page Not Found</h1>
      <p style={{ fontSize: '1.5rem' }}>
        Oops! The page you're looking for doesn't exist.
      </p>
      <Link to="/login" style={{ fontSize: '1.25rem', color: 'blue' }}>
        Go back to Login
      </Link>
    </div>
  );
};

export default Page404;
