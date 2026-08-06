import { useLocation } from "react-router-dom";

export function DbgProbe() {
  const loc = useLocation();
  // eslint-disable-next-line no-console
  console.log("SRC-PROBE pathname=", loc.pathname);
  return null;
}
