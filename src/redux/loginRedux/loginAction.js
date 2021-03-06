import {
  LOGIN_FAILURE,
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  LOGOUT,
  REDIRECT_TO_JOIN
} from './loginActionTypes';
import axios from 'axios';

import Notifications from 'react-notification-system-redux';
/*
                store.addNotification({
                  title: 'Invalid Username or Password',
                  message: 'Please Try Again',
                  type: 'danger',
                  // insert: "top",
                  container: 'top-right',
                  animationIn: ['animated', 'fadeIn'],
                  animationOut: ['animated', 'fadeOut'],
                  dismiss: {
                    duration: 3000,
                    pauseOnHover: true
                  }
                });
                */

const notificationOpts = {
  // uid: 'once-please', // you can specify your own uid if required
  title: 'Error',
  message: 'Invalid Username or Password',
  position: 'tr',
  autoDismiss: 2
};

export const loginRequest = () => ({
  type: LOGIN_REQUEST
});

export const loginSuccess = (username) => ({
  type: LOGIN_SUCCESS,
  username: username
});

export const loginFailure = (error) => ({
  type: LOGIN_FAILURE,
  error: error
});

export const redirectToJoinPage = () => ({
  type: REDIRECT_TO_JOIN
});

export const logout = () => {
  localStorage.clear();
  return {
    type: LOGOUT
  };
};

export const login = (username, password) => async (dispatch) => {
  const reqData = { username, password };
  dispatch(loginRequest());
  try {
    const res = await axios.post(`${global.config.backendURL}/api/login`, reqData);
    localStorage.setItem('milaap-auth-token', res.data.token);
    localStorage.setItem('username', username);
    dispatch(loginSuccess(username));
  } catch (err) {
    dispatch(loginFailure(err));
    dispatch(Notifications.error(notificationOpts));
  }
};

export const getTokenForTempUser = (reqData) => async (dispatch) => {
  dispatch(loginRequest());
  try {
    const res = await axios.post(
      `${global.config.backendURL}/api/user/gettokenfortempuser`,
      reqData
    );
    localStorage.setItem('milaap-auth-token', res.data.token);
    localStorage.setItem('username', reqData.username);
    dispatch(loginSuccess(reqData.username));
  } catch (err) {
    dispatch(loginFailure(err));
    if (err && err.response?.status === 400) {
      dispatch(
        Notifications.error({
          title: 'Invalid Room',
          message: 'Room Not Found',
          position: 'tr',
          autoDismiss: 2
        })
      );
    }
    if (err && err.response?.status === 401) {
      dispatch(
        Notifications.error({
          title: 'Username already taken',
          message: 'Try some other name',
          position: 'tr',
          autoDismiss: 3
        })
      );
    }
  }
};
