import { createSlice } from '@reduxjs/toolkit';

const TOKEN_KEY = 'admin_token';

const storedToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: storedToken,
    username: null,
  },
  reducers: {
    setCredentials(state, action) {
      state.token = action.payload.token;
      state.username = action.payload.username;
      localStorage.setItem(TOKEN_KEY, action.payload.token);
    },
    logout(state) {
      state.token = null;
      state.username = null;
      localStorage.removeItem(TOKEN_KEY);
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
