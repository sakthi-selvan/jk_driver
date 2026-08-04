import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config';

class ApiClient {
  private client: AxiosInstance;
  private inMemoryToken: string | null = null;
  private isRefreshing: boolean = false;
  private failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      async (config) => {
        console.log('🚗 [DRIVER API REQUEST]', config.method?.toUpperCase(), config.url);
        console.log('📍 [BASE URL]', config.baseURL);
        console.log('📦 [DATA]', JSON.stringify(config.data));

        try {
          const token = await AsyncStorage.getItem('access_token');
          if (token) {
            this.inMemoryToken = token;
            config.headers.Authorization = `Bearer ${token}`;
            console.log('🔑 [AUTH] Token added from storage');
          } else if (this.inMemoryToken) {
            config.headers.Authorization = `Bearer ${this.inMemoryToken}`;
            console.log('🔑 [AUTH] Token added from memory');
          } else {
            console.log('🔓 [AUTH] No token');
          }
        } catch (error) {
          console.log('⚠️  [STORAGE] Could not access token storage:', error);
          if (this.inMemoryToken) {
            config.headers.Authorization = `Bearer ${this.inMemoryToken}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log('✅ [DRIVER API SUCCESS]', response.status, response.config.url);
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (originalRequest.url?.includes('/auth/refresh')) {
            await this.handleUnauthorized();
            return Promise.reject(error);
          }

          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            if (!refreshToken) throw new Error('No refresh token');

            const response = await axios.post(
              `${API_CONFIG.BASE_URL}/api/auth/refresh`,
              { refresh_token: refreshToken },
              { headers: { 'Content-Type': 'application/json' } }
            );

            const { access_token, refresh_token: newRefreshToken } = response.data;

            this.inMemoryToken = access_token;
            await AsyncStorage.setItem('access_token', access_token);
            await AsyncStorage.setItem('refresh_token', newRefreshToken);

            console.log('🔄 [TOKEN REFRESHED] New access token obtained');

            this.failedQueue.forEach(({ resolve }) => resolve(access_token));
            this.failedQueue = [];

            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            console.log('🚪 [REFRESH FAILED] Logging out');
            this.failedQueue.forEach(({ reject }) => reject(refreshError));
            this.failedQueue = [];
            await this.handleUnauthorized();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        const isNoActiveRide = error.response?.status === 404 &&
                               error.config?.url?.includes('/active');
        const isCancelledRide = error.response?.status === 404 &&
                                (error.config?.url?.includes('/rides/') || error.config?.url?.includes('/cancel'));
        const isMustBeOnline = error.response?.status === 400 &&
                               error.config?.url?.includes('/available') &&
                               JSON.stringify(error.response?.data).includes('must be online');

        if (!isNoActiveRide && !isCancelledRide && !isMustBeOnline && error.response?.status !== 401) {
          console.error('❌ [DRIVER API ERROR]', error.message);
          console.error('📍 [URL]', error.config?.url);
          if (error.response) {
            console.error('📝 [STATUS]', error.response.status);
            console.error('📝 [DATA]', JSON.stringify(error.response.data));
          }
        } else if (isNoActiveRide) {
          console.log('ℹ️  [NO ACTIVE RIDE] Driver has no active ride (this is normal)');
        } else if (isCancelledRide) {
          console.log('ℹ️  [CANCELLED RIDE] Ride was cancelled and no longer exists (this is normal)');
        } else if (isMustBeOnline) {
          console.log('ℹ️  [OFFLINE] Driver is offline, cannot see available rides (this is normal)');
        }

        return Promise.reject(error);
      }
    );
  }

  private async handleUnauthorized() {
    this.inMemoryToken = null;
    try {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'driver']);
    } catch (error) {
      console.log('⚠️  [STORAGE] Could not clear storage:', error);
    }
  }

  public getClient(): AxiosInstance {
    return this.client;
  }

  public setToken(token: string) {
    this.inMemoryToken = token;
  }

  public clearToken() {
    this.inMemoryToken = null;
  }
}

const apiClientInstance = new ApiClient();
export const apiClient = apiClientInstance.getClient();
export const setApiToken = (token: string) => apiClientInstance.setToken(token);
export const clearApiToken = () => apiClientInstance.clearToken();
export default apiClient;
