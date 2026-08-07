import { useState } from "react";
import type { ChangeEvent } from "react";

export default function Foo() {
  const [x, setX] = useState(0);
  return x;
}
