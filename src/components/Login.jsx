import React, { useState } from 'react';
import { auth } from '../firebase-config';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import '../styles/Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      setError('Error signing in with Google. Please try again.');
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    try {
      // First, check what sign-in methods are available for this email
      const methods = await fetchSignInMethodsForEmail(auth, email);
      
      if (methods.includes('google.com')) {
        setError('This email is registered with Google. Please use the Google sign-in button.');
        return;
      }
      
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setError(
        error.code === 'auth/user-not-found' 
          ? 'No account found with this email' 
          : error.code === 'auth/wrong-password'
          ? 'Incorrect password'
          : 'Error signing in'
      );
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      // Check if email is already registered and how
      const methods = await fetchSignInMethodsForEmail(auth, email);
      
      if (methods.length > 0) {
        if (methods.includes('google.com')) {
          setError('This email is already registered with Google. Please use the Google sign-in button.');
        } else {
          setError('An account already exists with this email. Please sign in instead.');
        }
        return;
      }
      
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setError(
        error.code === 'auth/email-already-in-use'
          ? 'An account already exists with this email'
          : error.code === 'auth/weak-password'
          ? 'Password should be at least 6 characters'
          : 'Error creating account'
      );
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="welcome-title">Welcome to the AI-PC-Builder</h1>
        <form onSubmit={handleEmailSignIn}>
          {error && <div className="error-message">{error}</div>}
          <div className="input-group">
            <input
              type="email"
              placeholder="EMAIL"
              className="login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="input-group">
            <input
              type="password"
              placeholder="PASSWORD"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="auth-buttons">
            <button type="submit" className="auth-button">Sign In</button>
            <button type="button" onClick={handleSignUp} className="auth-button">Sign Up</button>
          </div>
        </form>
        <div className="auth-button-container">
          <button className="google-button" onClick={signInWithGoogle}>
            <img 
              src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMTcuNiA5LjJsLS4xLTEuOEg5djMuNGg0LjhDMTMuNiAxMiAxMyAxMyAxMiAxMy42djIuMmgzYTguOCA4LjggMCAwIDAgMi42LTYuNnoiIGZpbGw9IiM0Mjg1RjQiIGZpbGwtcnVsZT0ibm9uemVybyIvPjxwYXRoIGQ9Ik05IDE4YzIuNCAwIDQuNS0uOCA2LTIuMmwtMy0yLjJhNS40IDUuNCAwIDAgMS04LTIuOUgxVjEzYTkgOSAwIDAgMCA4IDV6IiBmaWxsPSIjMzRBODUzIiBmaWxsLXJ1bGU9Im5vbnplcm8iLz48cGF0aCBkPSJNNCAxMC43YTUuNCA1LjQgMCAwIDEgMC0zLjRWNUgxYTkgOSAwIDAgMCAwIDhsMy0yLjN6IiBmaWxsPSIjRkJCQzA1IiBmaWxsLXJ1bGU9Im5vbnplcm8iLz48cGF0aCBkPSJNOSAzLjZjMS4zIDAgMi41LjQgMy40IDEuM0wxNSAyLjNBOSA5IDAgMCAwIDEgNWwzIDIuNGE1LjQgNS40IDAgMCAxIDUtMy43eiIgZmlsbD0iI0VBNDMzNSIgZmlsbC1ydWxlPSJub256ZXJvIi8+PHBhdGggZD0iTTAgMGgxOHYxOEgweiIvPjwvZz48L3N2Zz4="
              alt="Google"
              className="google-icon"
            /> 
            <span>Google</span>
          </button>
        </div>
        <div className="stay-signed">
          <input type="checkbox" id="stay-signed-in" />
          <label htmlFor="stay-signed-in">Stay signed in</label>
        </div>
      </div>
    </div>
  );
}

export default Login; 