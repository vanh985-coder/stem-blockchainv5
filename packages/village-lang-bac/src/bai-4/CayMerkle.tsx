import React, { useMemo } from 'react';
import { bai4Texts } from '@so-chung/core/content/lessons/bai-4';
import { formatNumber } from '@so-chung/core/lib/format';

const T = bai4Texts.cayMerkle;

export type CellStatus = 'trong' | 'dung' | 'sai' | 'doi-mau' | 'mo-nhap';

export interface CayMerkleProps {
  /**
   * Ma trận giá trị các tầng từ lá (level 0) lên gốc (level max).
   * Giá trị ô trống là null.
   */
  treeValues: (number | null)[][];
  /** Ma trận trạng thái cho từng ô */
  cellStatuses?: (CellStatus | undefined)[][];
  /** Nhãn cho các nút lá, mặc định ['T1', 'T2', ...] */
  leafLabels?: string[];
  /** Render tuỳ biến bên trong ô (dùng cho NumberInput hoặc DroppableSlot) */
  renderSlot?: (
    level: number,
    index: number,
    value: number | null,
    status: CellStatus
  ) => React.ReactNode;
  /** Callback khi người dùng chạm hoặc click vào một ô */
  onCellClick?: (level: number, index: number) => void;
  /** Ô đang được chú ý / kích hoạt */
  highlightCell?: { level: number; index: number } | null;
  /** Danh sách các ô trên đường đi đổi màu (ví dụ khi Cáo Tí sửa giao dịch) */
  highlightPath?: Array<{ level: number; index: number }>;
  className?: string;
  /** Chú thích bên dưới cây nếu cần */
  caption?: string;
}

export const CayMerkle: React.FC<CayMerkleProps> = ({
  treeValues,
  cellStatuses,
  leafLabels,
  renderSlot,
  onCellClick,
  highlightCell,
  highlightPath = [],
  className = '',
  caption,
}) => {
  const numLevels = treeValues.length;
  const numLeaves = treeValues[0]?.length || 4;
  const isEightLeaves = numLeaves >= 8;

  // Chiều rộng canvas SVG tối thiểu để không bị co chữ
  const canvasWidth = isEightLeaves ? 720 : 420;
  const canvasHeight = isEightLeaves ? 360 : 280;

  // Tính tọa độ (x, y) cho từng ô
  // Root ở trên cùng (y nhỏ), lá ở dưới cùng (y lớn)
  const nodePositions = useMemo(() => {
    const positions: Array<Array<{ x: number; y: number; width: number; height: number }>> = [];
    const yPadding = 40;
    const availableHeight = canvasHeight - yPadding * 2;
    const yStep = numLevels > 1 ? availableHeight / (numLevels - 1) : 0;

    for (let lvl = 0; lvl < numLevels; lvl++) {
      const levelRow: Array<{ x: number; y: number; width: number; height: number }> = [];
      const nodeCount = treeValues[lvl].length;
      // lvl = 0 là lá (ở đáy), lvl = numLevels - 1 là gốc (ở đỉnh)
      const y = canvasHeight - yPadding - lvl * yStep;

      // Kích thước ô theo tầng
      let w = 64;
      let h = 48;
      if (lvl === numLevels - 1) {
        w = isEightLeaves ? 100 : 90;
        h = 52;
      } else if (lvl === 1) {
        w = 72;
      } else if (lvl === 2 && isEightLeaves) {
        w = 84;
      }

      for (let i = 0; i < nodeCount; i++) {
        const x = ((i + 0.5) / nodeCount) * canvasWidth;
        levelRow.push({ x, y, width: w, height: h });
      }
      positions.push(levelRow);
    }
    return positions;
  }, [numLevels, numLeaves, canvasWidth, canvasHeight, treeValues, isEightLeaves]);

  // Sinh các đoạn đường nối giữa nút cha và 2 nút con
  const connectingLines = useMemo(() => {
    const lines: Array<{
      key: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      isHighlighted: boolean;
    }> = [];

    // Kiểm tra xem một cạnh (cha-con) có thuộc highlightPath không
    const isPathEdge = (
      pLvl: number,
      pIdx: number,
      cLvl: number,
      cIdx: number
    ) => {
      const hasParent = highlightPath.some((h) => h.level === pLvl && h.index === pIdx);
      const hasChild = highlightPath.some((h) => h.level === cLvl && h.index === cIdx);
      return hasParent && hasChild;
    };

    for (let lvl = 1; lvl < numLevels; lvl++) {
      const parentRow = nodePositions[lvl];
      const childRow = nodePositions[lvl - 1];

      for (let pIdx = 0; pIdx < parentRow.length; pIdx++) {
        const parent = parentRow[pIdx];
        const leftChildIdx = pIdx * 2;
        const rightChildIdx = pIdx * 2 + 1;

        if (childRow[leftChildIdx]) {
          const child = childRow[leftChildIdx];
          lines.push({
            key: `line-${lvl}-${pIdx}-left`,
            x1: parent.x,
            y1: parent.y + parent.height / 2,
            x2: child.x,
            y2: child.y - child.height / 2,
            isHighlighted: isPathEdge(lvl, pIdx, lvl - 1, leftChildIdx),
          });
        }

        if (childRow[rightChildIdx]) {
          const child = childRow[rightChildIdx];
          lines.push({
            key: `line-${lvl}-${pIdx}-right`,
            x1: parent.x,
            y1: parent.y + parent.height / 2,
            x2: child.x,
            y2: child.y - child.height / 2,
            isHighlighted: isPathEdge(lvl, pIdx, lvl - 1, rightChildIdx),
          });
        }
      }
    }
    return lines;
  }, [numLevels, nodePositions, highlightPath]);

  // Tạo nhãn mặc định cho nút
  const getNodeLabel = (lvl: number, idx: number): string => {
    if (lvl === numLevels - 1) return T.goc;
    if (lvl === 0) {
      if (leafLabels && leafLabels[idx]) return leafLabels[idx];
      return `T${idx + 1}`;
    }
    if (lvl === 1) {
      const a = idx * 2 + 1;
      const b = idx * 2 + 2;
      return `T${a}${b}`;
    }
    if (lvl === 2) {
      const a = idx * 4 + 1;
      const b = idx * 4 + 4;
      return `T${a}-${b}`;
    }
    return `N${lvl}-${idx}`;
  };

  return (
    <div className={`w-full flex flex-col items-center select-none ${className}`}>
      {/* Gợi ý vuốt ngang cho điện thoại màn hình nhỏ */}
      {isEightLeaves && (
        <div className="sm:hidden text-sm text-nau-go-dam font-medium flex items-center gap-1 mb-2 bg-giay px-3 py-1 rounded-full border border-nau-go/30">
          <span>👉</span>
          <span>{T.vuotNgangDeXemCa}</span>
        </div>
      )}

      {/* Khung cuộn ngang */}
      <div className="w-full overflow-x-auto pb-4 pt-1 flex justify-center">
        <div
          style={{ width: canvasWidth, height: canvasHeight }}
          className="relative shrink-0 mx-auto"
        >
          {/* Lớp SVG vẽ đường kết nối */}
          <svg
            width={canvasWidth}
            height={canvasHeight}
            className="absolute inset-0 pointer-events-none"
            style={{ overflow: 'visible' }}
          >
            {connectingLines.map((line) => (
              <line
                key={line.key}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={line.isHighlighted ? '#E5484D' : '#D0CCE0'}
                strokeWidth={line.isHighlighted ? 3.5 : 2}
                strokeLinecap="round"
                strokeDasharray={line.isHighlighted ? 'none' : 'none'}
                className="transition-all duration-300"
              />
            ))}
          </svg>

          {/* Lớp DOM HTML render các ô nút */}
          {nodePositions.map((levelRow, lvl) =>
            levelRow.map((pos, idx) => {
              const val = treeValues[lvl]?.[idx] ?? null;
              const status = cellStatuses?.[lvl]?.[idx] || 'trong';
              const label = getNodeLabel(lvl, idx);
              const isRoot = lvl === numLevels - 1;
              const isHighlight =
                highlightCell?.level === lvl && highlightCell?.index === idx;
              const isPath = highlightPath.some(
                (h) => h.level === lvl && h.index === idx
              );

              // Tùy biến slot nếu có renderSlot
              if (renderSlot) {
                const customSlot = renderSlot(lvl, idx, val, status);
                if (customSlot !== null && customSlot !== undefined) {
                  return (
                    <div
                      key={`slot-${lvl}-${idx}`}
                      style={{
                        position: 'absolute',
                        left: pos.x,
                        top: pos.y,
                        width: pos.width,
                        height: pos.height,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className="z-10 flex items-center justify-center"
                    >
                      {customSlot}
                    </div>
                  );
                }
              }

              // Giao diện mặc định của ô
              return (
                <div
                  key={`node-${lvl}-${idx}`}
                  style={{
                    position: 'absolute',
                    left: pos.x,
                    top: pos.y,
                    width: pos.width,
                    height: pos.height,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onClick={() => onCellClick?.(lvl, idx)}
                  className={`
                    rounded-[14px] border-2 flex flex-col items-center justify-center p-1
                    transition-all duration-300 z-10
                    ${onCellClick ? 'cursor-pointer hover:scale-105' : ''}
                    ${
                      isRoot
                        ? ' border-muc-tim bg-white/60'
                        : ' bg-white/70'
                    }
                    ${
                      status === 'dung'
                        ? '!border-xanh-la-dam !bg-xanh-la/10 text-xanh-la-dam'
                        : status === 'sai'
                        ? '!border-do-son !bg-do-son/10 text-do-son-dam'
                        : status === 'doi-mau' || isPath
                        ? '!border-do-son !bg-do-son/10 ring-4 ring-do-son/30 animate-pulse text-do-son-dam'
                        : status === 'mo-nhap'
                        ? 'border-muc-tim bg-white/70 ring-2 ring-muc-tim/30 animate-bounce-subtle'
                        : val === null
                        ? 'border-dashed border-nau-go/40 bg-giay text-nau-go-dam'
                        : 'border-nau-go/30 text-chu'
                    }
                    ${isHighlight ? 'ring-4 ring-vang' : ''}
                  `}
                >
                  <span
                    className={`text-sm font-bold uppercase tracking-wider ${
                      isRoot ? 'text-muc-tim-dam' : 'text-nau-go-dam'
                    }`}
                  >
                    {label}
                  </span>
                  <span
                    className={`font-display font-extrabold text-sm sm:text-base leading-none mt-0.5 ${
                      val === null
                        ? 'text-nau-go-dam'
                        : status === 'doi-mau' || isPath
                        ? 'text-do-son-dam'
                        : isRoot
                        ? 'text-muc-tim-dam'
                        : 'text-chu'
                    }`}
                  >
                    {val !== null ? formatNumber(val) : '—'}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {caption && (
        <p className="text-sm text-nau-go-dam text-center mt-2 italic">
          {caption}
        </p>
      )}
    </div>
  );
};
