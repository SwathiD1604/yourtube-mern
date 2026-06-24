import axios from "axios";
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "https://yourtube-backend-sc57.onrender.com",
  timeout: 30000, // 30 second timeout
});
export default axiosInstance;

