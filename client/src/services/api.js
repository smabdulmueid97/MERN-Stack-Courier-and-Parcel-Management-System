// client/src/services/api.js
import axios from "axios";

// Backend origin. Set REACT_APP_API_URL in Vercel to the deployed server
// URL (e.g. https://<your-server>.onrender.com). Falls back to local dev.
const API_ORIGIN =
  process.env.REACT_APP_API_URL || "http://localhost:5001";

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
});

export default api;
