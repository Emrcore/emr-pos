import { useEffect } from "react";

export default function useBarcodeInput(onCode) {
  useEffect(() => {
    let buffer = "";
    let tm;
    const handler = (e) => {
      if (e.key === "Enter") {
        if (buffer) { onCode(buffer); buffer = ""; }
        return;
      }
      if (e.key.length === 1) {
        buffer += e.key;
        clearTimeout(tm);
        tm = setTimeout(() => { buffer = ""; }, 80); // wedge timeout
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCode]);
}
