import React from 'react';
import { Owner } from './logic';

export interface BanCoVongProps {
  owner: readonly Owner[];
  selectableNodes: readonly number[];
  playerRole: 'H' | 'D';
  selectedUnits: {
    attacks: number[];
    shields: number[];
    recoveredNode: number | null;
  };
  onNodeClick: (nodeIndex: number) => void;
  revealData?: {
    attacks: number[];
    shields: number[];
    recoveredNode: number | null;
    changedNodes: number[];
  } | null;
  disabled?: boolean;
}

export const BanCoVong: React.FC<BanCoVongProps> = ({
  owner,
  selectableNodes,
  selectedUnits,
  onNodeClick,
  revealData,
  disabled = false,
}) => {
  const cx = 210;
  const cy = 210;
  const radius = 145;
  const nodeCount = 10;

  // Tọa độ 10 node trên đường tròn
  const coords = Array.from({ length: nodeCount }, (_, i) => {
    // Đặt node 0 ở góc 12 giờ (-90 độ), quay theo chiều kim đồng hồ
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / nodeCount;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[420px] mx-auto">
      <div className="relative w-full aspect-square max-w-[420px]">
        <svg
          viewBox="0 0 420 420"
          className="w-full h-full drop-shadow-sm overflow-visible"
        >
          {/* Vòng tròn nền mờ nối các node */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#E3E0EE"
            strokeWidth="3"
            strokeDasharray="6 6"
            pointerEvents="none"
          />

          {/* Các đoạn thẳng nối node liền kề */}
          {coords.map((c, i) => {
            const nextCoord = coords[(i + 1) % nodeCount];
            return (
              <line
                key={`edge-${i}`}
                x1={c.x}
                y1={c.y}
                x2={nextCoord.x}
                y2={nextCoord.y}
                stroke="#D0CCE0"
                strokeWidth="2.5"
                pointerEvents="none"
              />
            );
          })}

          {/* 10 Node */}
          {coords.map((c, i) => {
            const isHacker = owner[i] === 'H';
            const isSelectable = !disabled && selectableNodes.includes(i);
            const isChanged = revealData?.changedNodes.includes(i);

            // Số quân người chơi đang chọn đặt vào node này
            const myAttacks = selectedUnits.attacks.filter((n) => n === i).length;
            const myShields = selectedUnits.shields.filter((n) => n === i).length;
            const isRecoverSelected = selectedUnits.recoveredNode === i;

            // Dữ liệu đối chiếu trong lúc reveal
            const revAttacks = revealData?.attacks.filter((n) => n === i).length ?? 0;
            const revShields = revealData?.shields.filter((n) => n === i).length ?? 0;
            const isRevRecover = revealData?.recoveredNode === i;

            const baseFill = isHacker ? '#E5484D' : '#2E90E8';
            const baseStroke = isHacker ? '#B8363A' : '#1F6FB8';

            return (
              <g
                key={`node-${i}`}
                transform={`translate(${c.x}, ${c.y})`}
                style={{ cursor: isSelectable ? 'pointer' : 'default' }}
                className={`transition-transform duration-200 ${
                  isSelectable ? 'hover:scale-105 active:scale-95' : ''
                }`}
                onClick={() => {
                  if (isSelectable && !disabled) {
                    onNodeClick(i);
                  }
                }}
              >
                {/* Vùng chạm trong suốt >= 44px đường kính khi hiển thị 360px (r=28 -> d=56 -> 48px trên màn) */}
                <circle
                  cx={0}
                  cy={0}
                  r={28}
                  fill="transparent"
                  pointerEvents={isSelectable ? 'all' : 'none'}
                  style={{ cursor: isSelectable ? 'pointer' : 'default' }}
                />

                {/* Vòng viền phát sáng nhấp nháy khi là node hợp lệ để đặt quân */}
                {isSelectable && (
                  <circle
                    cx={0}
                    cy={0}
                    r={31}
                    fill="none"
                    stroke="#FFC21A"
                    strokeWidth="4"
                    className="animate-pulse"
                    pointerEvents="none"
                  />
                )}

                {/* Xung sáng khi vừa bị chiếm hoặc phục hồi */}
                {isChanged && (
                  <circle
                    cx={0}
                    cy={0}
                    r={36}
                    fill="none"
                    stroke="#FFC21A"
                    strokeWidth="4"
                    className="animate-ping opacity-75"
                    pointerEvents="none"
                  />
                )}

                {/* Vòng tròn thân node chính: bán kính r=26 */}
                <circle
                  cx={0}
                  cy={0}
                  r={26}
                  fill={baseFill}
                  stroke={baseStroke}
                  strokeWidth="3.5"
                  className="transition-colors duration-300"
                  pointerEvents="none"
                />

                {/* Biểu tượng emoji: kích thước 18px (>= 14px khi màn 360px) */}
                <text
                  x={0}
                  y={-4}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="18"
                  className="select-none pointer-events-none"
                  pointerEvents="none"
                >
                  {isHacker ? '😈' : '🛡️'}
                </text>

                {/* Tên node N1..N10: chữ đậm, 14px (>= 12px thực tế khi màn 360px) */}
                <text
                  x={0}
                  y={14}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#FFFFFF"
                  fontWeight="800"
                  fontSize="14"
                  fontFamily="'Baloo 2', sans-serif"
                  className="select-none pointer-events-none"
                  pointerEvents="none"
                >
                  N{i + 1}
                </text>

                {/* Huy hiệu quân đang đặt: đặt phía trên node tại y=-32, KHÔNG che nhãn và emoji */}
                {!revealData && (myAttacks > 0 || myShields > 0 || isRecoverSelected) && (
                  <g transform="translate(0, -32)" pointerEvents="none">
                    <rect
                      x={-18}
                      y={-11}
                      width={36}
                      height={22}
                      rx={11}
                      fill="#FFFFFF"
                      stroke="#5B3FD6"
                      strokeWidth="2.5"
                      className="shadow-sm"
                      pointerEvents="none"
                    />
                    <text
                      x={0}
                      y={4}
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="bold"
                      fill="#5B3FD6"
                      fontFamily="'Baloo 2', sans-serif"
                      pointerEvents="none"
                    >
                      {myAttacks > 0 && `⚔️${myAttacks}`}
                      {myShields > 0 && `🛡️${myShields}`}
                      {isRecoverSelected && `🔄`}
                    </text>
                  </g>
                )}

                {/* Huy hiệu kết quả giao tranh trong lúc REVEAL */}
                {revealData && (revAttacks > 0 || revShields > 0 || isRevRecover) && (
                  <g transform="translate(0, -34)" className="animate-bounce" pointerEvents="none">
                    <rect
                      x={-34}
                      y={-12}
                      width={68}
                      height={24}
                      rx={12}
                      fill="#FFFFFF"
                      stroke="#2A2340"
                      strokeWidth="2"
                      className="shadow-md"
                      pointerEvents="none"
                    />
                    <text
                      x={0}
                      y={4}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="bold"
                      fill="#2A2340"
                      fontFamily="'Baloo 2', sans-serif"
                      pointerEvents="none"
                    >
                      {isRevRecover
                        ? '🔄 Phục hồi'
                        : `⚔️${revAttacks} vs 🛡️${revShields}`}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Chú thích bàn cờ theo yêu cầu */}
      <p className="text-xs sm:text-sm text-[#6B6485] font-medium text-center mt-2">
        Bàn cờ: chạm node đang sáng để đặt quân.
      </p>
    </div>
  );
};
