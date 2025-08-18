import { useNavigate } from "react-router-dom";

export default function RequireAuth({ children }) {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  if (!isLoggedIn) {
    window.location.href = "/"; // navigate yerine tam yönlendirme
    return null;
  }

  return children;
}
