import api from './api';

export const authService = {
  async login(email, password) {
    try {
      console.log('AuthService: Attempting login for:', email);
      const response = await api.post('/auth/login', { email, password });
      console.log('AuthService: Login response:', response.data);
      
      if (response.data.success) {
        const { token, user } = response.data.data;
        console.log('AuthService: Storing token and user:', { token: token ? 'present' : 'missing', user });
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        console.log('AuthService: Login successful, data stored');
        return { success: true, data: response.data.data };
      } else {
        console.error('AuthService: Login failed - success is false');
        return { success: false, message: response.data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('AuthService: Login error:', error);
      const message = error.response?.data?.message || 
                     error.message || 
                     'Login failed. Please check your credentials.';
      return { success: false, message };
    }
  },

  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('AuthService: Register error:', error);
      throw error;
    }
  },

  async getMe() {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      console.error('AuthService: GetMe error:', error);
      throw error;
    }
  },

  logout() {
    console.log('AuthService: Logging out, clearing storage');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('AuthService: Storage cleared, redirecting to login');
    window.location.href = '/login';
  },

  getCurrentUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('AuthService: Error parsing user data:', error);
      localStorage.removeItem('user');
      return null;
    }
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