type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
};

export function Skeleton({ width = '100%', height = 14, radius = 6 }: SkeletonProps) {
  return (
    <span
      className="animo-skeleton"
      aria-hidden="true"
      style={{ width, height, borderRadius: radius }}
    />
  );
}

type SkeletonTableRowsProps = {
  columns: number;
  rows?: number;
  cellStyle?: React.CSSProperties;
};

export function SkeletonTableRows({ columns, rows = 5, cellStyle }: SkeletonTableRowsProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row}>
          {Array.from({ length: columns }, (_, column) => (
            <td key={column} style={cellStyle}>
              <Skeleton width={column === 1 ? 140 : 64} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
