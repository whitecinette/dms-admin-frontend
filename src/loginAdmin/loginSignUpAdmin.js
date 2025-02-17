import React, { useState } from 'react';
import './style.scss';
import config from '../config';
import axios from 'axios';
const backend_url = config.backend_url;

const LoginSignUpAdmin = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');

  // Signup form state
  const [signupData, setSignupData] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    password: ''
  });

  // Login form state
  const [loginData, setLoginData] = useState({
    userRole: '',
    email: '',
    password: ''
  });

  // Handle input changes
  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData((prevData) => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData((prevData) => ({
      ...prevData,
      [name]: value
    }));
  };

  // Handle Login Submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous error

    try {
      const response = await axios.post(`${backend_url}/login-admin`, loginData);
      console.log("Sending login data:", loginData);


      if (response.status === 200) {
        localStorage.setItem('isAuthenticated', 'true');
        alert('Login successful!');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Invalid email or password.');
    }
  };


  return (
    <div className='login_container'>
      <div className="main">
        <div className="logo-container">
          <div className="company-logo">
            <img src="./sc.jpg" alt="Company Logo" /><h2 style={{ fontFamily: "revert" }}>Welcome To Siddha Connect</h2>
          </div>
        </div>
        <div className={`form-container ${isSignup ? 'signup-active' : 'login-active'}`}>
          {!isSignup ? (
            <form onSubmit={handleLoginSubmit} className="login-form">
              <h2>Login</h2>
              <select className="form-input" name="userRole" required value={loginData.userRole} onChange={handleLoginChange}>
                <option value="" disabled>Select User Role</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
              </select>
              <input className="form-input" type="email" name="email" placeholder="Email" required value={loginData.email} onChange={handleLoginChange} />
              <input className="form-input" type="password" name="password" placeholder="Password" required value={loginData.password} onChange={handleLoginChange} />
              {error && <p className="error">{error}</p>}
              <div>
                <button className="form-login-button" type="submit">Login</button>
                <p>Don't have an account? <span onClick={() => setIsSignup(true)}>Sign Up</span></p>
              </div>
            </form>
          ) : (
            <form className="signup-form">
              <h2>Sign Up</h2>
              <input className="form-input" type="text" name="username" placeholder="Username" required value={signupData.username} onChange={handleSignupChange} />
              <input className="form-input" type="email" name="email" placeholder="Email" required value={signupData.email} onChange={handleSignupChange} />
              <input className="form-input" type="number" name="phoneNumber" placeholder="Phone Number" required value={signupData.phoneNumber} onChange={handleSignupChange} />
              <input className="form-input" type="password" name="password" placeholder="Password" required value={signupData.password} onChange={handleSignupChange} />
              <div>
                <button className="form-signup-button" type="submit">Sign Up</button>
                <p>Already have an account? <span onClick={() => setIsSignup(false)}>Login</span></p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginSignUpAdmin;
