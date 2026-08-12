import axios from 'axios'

const request = axios.create({
  baseURL: import.meta.env.VITE_OPS_API_URL,
  timeout: 10000,
})

request.interceptors.request.use(function (config) {
  if (localStorage.getItem('accessToken')) {
    config.headers.Authorization = `Bearer ${localStorage.getItem('accessToken')}`
  }
  return config;
}, function (error) {
  return Promise.reject(error);
});

request.interceptors.response.use(function (response) {
  return response;
},async function (error) {
  const originalRequest = error.config;
  if(error.response?.status === 401 && !originalRequest._retry){
    originalRequest._retry = true;

    const refreshToken = localStorage.getItem('refreshToken');
    if(!refreshToken){
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    try{
      const res = await axios.post(
        `${import.meta.env.VITE_USER_API_URL}/api/token/refresh/`,
        { refresh: refreshToken }
      );
      localStorage.setItem('accessToken', res.data.access);
      originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
      return request(originalRequest);
    } catch (error) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return Promise.reject(error);
    }
  }
  return Promise.reject(error);
});

export const get = <T = any>(url: string, params?: object) =>
  request.get<T>(url, { params }).then(res => res.data)

export const post = <T = any>(url: string, data?: object) =>
  request.post<T>(url, data).then(res => res.data)

export const put = <T = any>(url: string, data?: object) =>
  request.put<T>(url, data).then(res => res.data)

export const del = <T = any>(url: string) =>
  request.delete<T>(url).then(res => res.data)

export default request
