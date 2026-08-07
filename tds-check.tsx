import { ListRow } from "@toss/tds-mobile";

export function X() {
  return (
    <ListRow
      data-testid="nav-calendar"
      onClick={() => {}}
      contents={<ListRow.Texts type="2RowTypeA" top="a" bottom="b" />}
    />
  );
}
