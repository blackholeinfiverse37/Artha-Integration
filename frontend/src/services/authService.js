import api from './api';

export const authService = {
  async login(email, password) {
    console.log('AuthService: Attempting login for:', email);
    const response = await api.post('/auth/login', { email, password });
    console.log('AuthService: Login response:', response.data);
    
    if (response.data.success) {
      const { token, user } = response.data.data;
      console.log('AuthService: Storing token and user:', { token: token ? 'present' : 'missing', user });
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      console.log('AuthService: Login successful, data stored');
    } else {
      console.error('AuthService: Login failed - success is false');
      throw new Error(response.data.message || 'Login failed');
    }
    return response.data;
  },

  async register(userData) {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout() {
    console.log('AuthService: Logging out, clearing storage');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('AuthService: Storage cleared, redirecting to login');
    window.location.href = '/login';
  },

  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getToken() {
    return localStorage.getItem('token');
  },

  isAuthenticated() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const isAuth = !!(token && user);
    console.log('AuthService: isAuthenticated check:', { 
      hasToken: !!token, 
      hasUser: !!user, 
      isAuthenticated: isAuth 
    });
    return isAuth;
  },
};