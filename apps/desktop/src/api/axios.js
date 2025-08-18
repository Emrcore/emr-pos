import axios from "axios";

const BASE_URL = "http://185.149.103.223:3021/api"; // API sunucunun doðru IP ve port'u

export default axios.create({
  baseURL: BASE_URL,
});