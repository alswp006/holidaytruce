import { useState } from "react";
import { createElement as h, Fragment } from "react";
import { Top, Paragraph } from "@toss/tds-mobile";
import { HOLIDAYS } from "@/lib/holidays";

export default function Foo() {
  const [x, setX] = useState(HOLIDAYS);
  return h(Top, { title: h(Top.TitleParagraph, null, "hi") });
}
