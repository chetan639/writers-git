import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  withCredentials: true, // Crucial: Automatically sends the HttpOnly cookie with every request
});

export default api;