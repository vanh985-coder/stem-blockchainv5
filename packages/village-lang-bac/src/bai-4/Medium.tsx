import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Avatar, Button, Card, FeedbackSheet, NumberInput, fmt, sound, starsFromMistakes, type StationResult, rich } from '@so-chung/core';
import { bai4Texts } from '@so-chung/core/content/lessons/bai-4';
import { GAME_CONFIG } from '@so-chung/core/config/gameConfig';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { buildTree, pathToRoot, generateMedium, DEFAULT_EASY_TXS, type EasyTx } from '@so-chung/core/lessons/bai-4/logic';
import {
  cellKey,
  inspectCell,
  inspectCount,
  isTamperedLeafHit,
  shouldShowBiHint,
  type InspectCell,
  type InspectState,
} from '@so-chung/core/lessons/bai-4/inspect';
import { CayMerkle, type CellStatus } from './CayMerkle';
import { portraitOf } from './nguoi';

const T = bai4Texts.tramTb;

type MediumPhase = 'phase_a' | 'phase_b' | 'phase_c';

export function Medium({
  onComplete,
  onTwist,
}: {
  onComplete: (r: StationResult) => void;
  onFail?: (tip: string) => void;
  /** Báo cho khung bài học khi {phanDien} đã tráo giao dịch và gốc đã đổi (thầy Linh nói lời) */
  onTwist?: () => void;
}) {
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dọn dẹp timer khi unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
  const [phase, setPhase] = useState<MediumPhase>('phase_a');

  // ==========================================
  // PHẦN A: XEM CÂY ĐƯỢC TẠO THẾ NÀO (5 BƯỚC)
  // ==========================================
  const partATxs: EasyTx[] = DEFAULT_EASY_TXS;
  const partALeaves = partATxs.map((t) => t.value); // [3, 7, 5, 2]
  const partATree = useMemo(() => buildTree(partALeaves), [partALeaves]); // [[3,7,5,2], [37,52], [422]]
  const [stepA, setStepA] = useState(0); // 0..4

  // Ma trận giá trị cây ở Phần A theo từng bước
  const currentTreeA = useMemo(() => {
    // Tầng 0 luôn hiện
    const lvl0 = [...partALeaves];
    // Tầng 1: T12 hiện từ step 1, T34 hiện từ step 2
    const lvl1: (number | null)[] = [
      stepA >= 1 ? partATree[1][0] : null,
      stepA >= 2 ? partATree[1][1] : null,
    ];
    // Tầng 2: Gốc hiện từ step 3
    const lvl2: (number | null)[] = [stepA >= 3 ? partATree[2][0] : null];
    return [lvl0, lvl1, lvl2];
  }, [stepA, partALeaves, partATree]);

  // Thông tin giải thích từng bước phần A
  const stepAInfo = useMemo(() => {
    switch (stepA) {
      case 0:
        return {
          title: T.buoc1BatDauTu,
          desc: T.hangDuoiCungLa4,
          calc: T.bonLaODayCay,
        };
      case 1:
        return {
          title: T.buoc2GhepCapT1,
          desc: T.haiGiaoDichDauTien,
          calc: `T12 = T1 × 10 + T2 = ${partALeaves[0]} × 10 + ${partALeaves[1]} = ${partATree[1][0]}`,
        };
      case 2:
        return {
          title: T.buoc3GhepCapT3,
          desc: T.haiGiaoDichTiepTheo,
          calc: `T34 = T3 × 10 + T4 = ${partALeaves[2]} × 10 + ${partALeaves[3]} = ${partATree[1][1]}`,
        };
      case 3:
        return {
          title: T.buoc4GhepLenGoc,
          desc: T.haiNhanhT12VaT34,
          calc: fmt(T.congThucGocKhiXem, { so: partATree[1][0], so2: partATree[1][1], so3: partATree[2][0] }),
        };
      default:
        return {
          title: T.buoc5ConSoDai,
          desc: T.gocMerkle422GoiGon,
          calc: T.daHoanThanhDungCay,
        };
    }
  }, [stepA, partALeaves, partATree]);

  // ==========================================
  // PHẦN B: TỰ XÂY CÂY
  // ==========================================
  const mediumData = useMemo(() => {
    const seed = (Date.now() ^ (Math.random() * 0x100000000)) >>> 0;
    const rng = createMulberry32(seed);
    return generateMedium(rng);
  }, []);

  const [partBTxs] = useState<EasyTx[]>(mediumData.txs);
  const partBLeaves = useMemo(() => partBTxs.map((t) => t.value), [partBTxs]);
  const partBTree = useMemo(() => buildTree(partBLeaves), [partBLeaves]);

  // Các giá trị đã giải đúng
  const [valT12, setValT12] = useState<number | null>(null);
  const [valT34, setValT34] = useState<number | null>(null);
  const [valRoot, setValRoot] = useState<number | null>(null);

  // Ô đang chọn để nhập: 't12' | 't34' | 'root' | null
  const [selectedSlot, setSelectedSlot] = useState<'t12' | 't34' | 'root' | null>('t12');
  const [inputVal, setInputVal] = useState<number | null>(null);
  const [inputError, setInputError] = useState<string | undefined>();
  const [mistakesB, setMistakesB] = useState<number>(0);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  const isT12Solved = valT12 !== null;
  const isT34Solved = valT34 !== null;
  const isRootSolved = valRoot !== null;
  const isChildrenReady = isT12Solved && isT34Solved;

  // Cập nhật slot chọn tự động khi hoàn thành
  useEffect(() => {
    if (!isT12Solved) {
      setSelectedSlot('t12');
    } else if (!isT34Solved) {
      setSelectedSlot('t34');
    } else if (!isRootSolved) {
      setSelectedSlot('root');
    } else {
      setSelectedSlot(null);
    }
    setInputVal(null);
    setInputError(undefined);
  }, [isT12Solved, isT34Solved, isRootSolved]);

  // Ma trận giá trị cây ở Phần B
  const currentTreeB = useMemo(() => {
    const lvl0 = [...partBLeaves];
    const lvl1 = [valT12, valT34];
    const lvl2 = [valRoot];
    return [lvl0, lvl1, lvl2];
  }, [partBLeaves, valT12, valT34, valRoot]);

  // Ma trận trạng thái cây ở Phần B
  const cellStatusesB = useMemo(() => {
    const s0: CellStatus[] = ['dung', 'dung', 'dung', 'dung'];
    const s1: CellStatus[] = [
      valT12 !== null ? 'dung' : selectedSlot === 't12' ? 'mo-nhap' : 'trong',
      valT34 !== null ? 'dung' : selectedSlot === 't34' ? 'mo-nhap' : 'trong',
    ];
    const s2: CellStatus[] = [
      valRoot !== null
        ? 'dung'
        : selectedSlot === 'root'
        ? 'mo-nhap'
        : isChildrenReady
        ? 'trong'
        : 'trong',
    ];
    return [s0, s1, s2];
  }, [valT12, valT34, valRoot, selectedSlot, isChildrenReady]);

  // Kiểm tra đáp án ô đang chọn ở Phần B
  const handleCheckPartB = useCallback(() => {
    if (!selectedSlot) return;

    if (inputVal === null || inputVal <= 0) {
      sound.playWrong();
      setMistakesB((prev) => prev + 1);
      setInputError(T.vuiLongNhapMotSo);
      return;
    }

    setInputError(undefined);

    let expected = 0;
    let hintFormula = '';

    if (selectedSlot === 't12') {
      expected = partBTree[1][0];
      hintFormula = `T12 = T1 × 10 + T2 = ${partBLeaves[0]} × 10 + ${partBLeaves[1]}`;
    } else if (selectedSlot === 't34') {
      expected = partBTree[1][1];
      hintFormula = `T34 = T3 × 10 + T4 = ${partBLeaves[2]} × 10 + ${partBLeaves[3]}`;
    } else if (selectedSlot === 'root') {
      expected = partBTree[2][0];
      hintFormula = fmt(T.congThucGocKhiNhap, { so: partBTree[1][0], so2: partBTree[1][1] });
    }

    if (inputVal === expected) {
      sound.playCorrect();
      if (selectedSlot === 't12') setValT12(expected);
      if (selectedSlot === 't34') setValT34(expected);
      if (selectedSlot === 'root') setValRoot(expected);
      setInputVal(null);
    } else {
      sound.playWrong();
      setMistakesB((prev) => prev + 1);
      setFeedback({
        isOpen: true,
        isCorrect: false,
        title: T.chuaChinhXac,
        whatHappened: fmt(T.giaTriChuaDungCho, { inputVal, so2: selectedSlot.toUpperCase() }),
        whyHappened: T.hayKiemTraLaiPhep,
        howToFix: fmt(T.congThucDaTheSo, { hintFormula, expected }),
      });
    }
  }, [selectedSlot, inputVal, partBTree, partBLeaves]);

  // ==========================================
  // PHẦN C: KHOẢNH KHẮC "À RA THẾ"
  // ==========================================
  const tamperedLeafIndex = mediumData.tamperedLeafIndex; // T3 (index 2)
  const tamperedNewValue = mediumData.tamperedNewValue;
  const tamperedLeaves = useMemo(() => {
    const arr = [...partBLeaves];
    arr[tamperedLeafIndex] = tamperedNewValue;
    return arr;
  }, [partBLeaves, tamperedLeafIndex, tamperedNewValue]);

  const tamperedTree = useMemo(() => buildTree(tamperedLeaves), [tamperedLeaves]);
  const tamperPath = useMemo(() => pathToRoot(tamperedLeafIndex, 2), [tamperedLeafIndex]);

  // Hoạt cảnh lan truyền đổi màu đỏ từ lá lên gốc
  const [tamperStep, setTamperStep] = useState<number>(-1); // -1: chưa đổi, 0: lá, 1: T34, 2: gốc

  const startTamperAnimation = useCallback(() => {
    setTamperStep(0);
    sound.playWrong();

    const delay = GAME_CONFIG.lesson4.tamperStepDelayMs || 600;

    // Bước 1: nút con cấp 1 (T34) đổi màu
    timerRef.current = setTimeout(() => {
      setTamperStep(1);
      sound.playWrong();

      // Bước 2: nút gốc đổi màu
      timerRef.current = setTimeout(() => {
        setTamperStep(2);
        sound.playWrong();
        onTwist?.();
      }, delay);
    }, delay);
  }, [onTwist]);

  // Phần 3: em soi từng ô (tính lại số rồi so với số đã ghi trong sổ). Soi trúng lá bị sửa thì chạy hiệu ứng đỏ lan lên gốc.
  const [inspected, setInspected] = useState<InspectState>({});
  const [found, setFound] = useState(false);

  const handleInspect = (cell: InspectCell) => {
    if (found || tamperStep >= 0 || inspected[cellKey(cell)]) return;
    const result = inspectCell(partBTree, tamperedTree, cell);
    if (result.match) sound.playCorrect();
    else sound.playWrong();
    setInspected((prev) => ({ ...prev, [cellKey(cell)]: result }));
    if (isTamperedLeafHit(cell, tamperedLeafIndex, result)) {
      setFound(true);
      timerRef.current = setTimeout(startTamperAnimation, 700);
    }
  };

  const cellName = (level: number, index: number) =>
    level === 2 ? T.goc : level === 1 ? `T${index * 2 + 1}${index * 2 + 2}` : `T${index + 1}`;

  /** Ô soi được: số đã ghi trong sổ, sau khi soi thêm số tính lại và ✓ khớp / ✗ lệch (có chữ, không chỉ màu) */
  const renderInspectSlot = (level: number, index: number) => {
    if (tamperStep >= 0) return null;
    const r = inspected[cellKey({ level, index })];
    const name = cellName(level, index);
    const recorded = partBTree[level][index];
    const tone = r
      ? r.match
        ? 'border-xanh-la-dam bg-xanh-la/10 text-xanh-la-dam'
        : 'border-do-son-dam bg-do-son/10 text-do-son-dam'
      : 'border-nau-go/50 bg-white/80 text-chu hover:border-muc-tim cursor-pointer';
    return (
      <button
        type="button"
        onClick={() => handleInspect({ level, index })}
        aria-disabled={Boolean(r) || found}
        aria-label={
          r
            ? fmt(T.soiNhanKetQua, { nhan: name, so: r.recorded, so2: r.recomputed, ketQua: r.match ? T.soiNhanKhop : T.soiNhanLech })
            : fmt(T.soiNhanCuaO, { nhan: name, so: recorded })
        }
        className={`flex min-h-[76px] w-full min-w-[92px] flex-col items-center justify-center rounded-[14px] border-2 px-1 py-1 text-center font-display text-sm leading-tight focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim ${tone}`}
      >
        <span className="font-extrabold uppercase tracking-wide">{name}</span>
        <span className="font-bold">{fmt(T.soiSo, { so: recorded })}</span>
        {r && (
          <>
            <span className="font-bold">{fmt(T.soiTinhLai, { so: r.recomputed })}</span>
            <span className="font-extrabold">{r.match ? T.soiKhop : T.soiLech}</span>
          </>
        )}
      </button>
    );
  };

  // Cây hiển thị ở Phần C
  const currentTreeC = useMemo(() => {
    if (tamperStep < 0) {
      return partBTree;
    }
    // Sao chép cây gốc của phần B
    const tree = [
      [...partBTree[0]],
      [...partBTree[1]],
      [...partBTree[2]],
    ];
    if (tamperStep >= 0) {
      tree[0][tamperedLeafIndex] = tamperedNewValue;
    }
    if (tamperStep >= 1) {
      const pIdx = tamperPath[1].index;
      tree[1][pIdx] = tamperedTree[1][pIdx];
    }
    if (tamperStep >= 2) {
      tree[2][0] = tamperedTree[2][0];
    }
    return tree;
  }, [partBTree, tamperedTree, tamperStep, tamperedLeafIndex, tamperedNewValue, tamperPath]);

  // Trạng thái các ô ở Phần C
  const cellStatusesC = useMemo(() => {
    // Trước khi tìm ra lá bị sửa, ô giữ kiểu mặc định (màu do kết quả soi quyết định); khi chạy hiệu ứng, ô ngoài đường đỏ hiện xanh
    const base: CellStatus | undefined = tamperStep >= 0 ? 'dung' : undefined;
    const s0: (CellStatus | undefined)[] = [base, base, base, base];
    const s1: (CellStatus | undefined)[] = [base, base];
    const s2: (CellStatus | undefined)[] = [base];

    if (tamperStep >= 0) s0[tamperedLeafIndex] = 'doi-mau';
    if (tamperStep >= 1) s1[tamperPath[1].index] = 'doi-mau';
    if (tamperStep >= 2) s2[0] = 'doi-mau';

    return [s0, s1, s2];
  }, [tamperStep, tamperedLeafIndex, tamperPath]);

  // Quản lý phản hồi FeedbackSheet
  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    isCorrect: boolean;
    title?: string;
    whatHappened: string;
    whyHappened?: string;
    howToFix?: string;
  }>({
    isOpen: false,
    isCorrect: false,
    whatHappened: '',
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Tab chuyển đổi trạng thái 3 phần */}
      <div className="flex items-center justify-between bg-white/70 p-2 rounded-[16px] border border-nau-go/30 text-sm font-bold">
        <button
          type="button"
          onClick={() => setPhase('phase_a')}
          className={`flex-1 py-2 px-3 rounded-[10px] transition-all cursor-pointer text-center ${
            phase === 'phase_a'
              ? 'bg-muc-tim text-white shadow-xs'
              : 'text-nau-go-dam hover:bg-giay'
          }`}
        >{T.tabXemDungCay}</button>
        <button
          type="button"
          onClick={() => setPhase('phase_b')}
          className={`flex-1 py-2 px-3 rounded-[10px] transition-all cursor-pointer text-center ${
            phase === 'phase_b'
              ? 'bg-muc-tim text-white shadow-xs'
              : 'text-nau-go-dam hover:bg-giay'
          }`}
        >{T.tabTuXayCay}</button>
        <button
          type="button"
          onClick={() => {
            if (isRootSolved) setPhase('phase_c');
          }}
          disabled={!isRootSolved}
          className={`flex-1 py-2 px-3 rounded-[10px] transition-all text-center ${
            phase === 'phase_c'
              ? 'bg-muc-tim text-white shadow-xs cursor-pointer'
              : isRootSolved
              ? 'text-nau-go-dam hover:bg-giay cursor-pointer'
              : 'text-nau-go-dam cursor-not-allowed'
          }`}
        >{T.tabKhamPha}</button>
      </div>

      {/* ========================================================= */}
      {/* PHẦN A: XEM DỰNG CÂY TỪNG BƯỚC */}
      {/* ========================================================= */}
      {phase === 'phase_a' && (
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <span className="text-sm font-bold text-muc-tim-dam uppercase tracking-wider">{fmt(T.hoatCanhDungCayBuoc, { so: stepA + 1 })}</span>
            <h3 className="first-letter:uppercase font-display font-extrabold text-xl sm:text-2xl text-chu">
              {stepAInfo.title}
            </h3>
            <p className="text-sm text-nau-go-dam max-w-md mx-auto">
              {stepAInfo.desc}
            </p>
          </div>

          {/* Cây Merkle SVG */}
          <CayMerkle
            treeValues={currentTreeA}
            caption={T.cayMerkle4GiaoDich}
          />

          {/* Hộp hiển thị phép tính đã thế số */}
          <div className="p-4 rounded-[14px] bg-white/60 border border-muc-tim/10 text-center">
            <div className="text-sm text-nau-go-dam font-semibold mb-1">{T.phepTinhTuongUng}</div>
            <div className="font-display font-bold text-base sm:text-lg text-muc-tim-dam">
              {stepAInfo.calc}
            </div>
          </div>

          {/* Nút điều khiển bước */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={stepA === 0}
              onClick={() => setStepA((prev) => Math.max(0, prev - 1))}
            >{T.quayLai}</Button>

            {stepA < 4 ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  sound.playClick();
                  setStepA((prev) => prev + 1);
                }}
              >{T.tiepTheo}</Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  sound.playClick();
                  setPhase('phase_b');
                }}
              >{T.tuEmXayCay}</Button>
            )}
          </div>
        </Card>
      )}

      {/* ========================================================= */}
      {/* PHẦN B: TỰ XÂY CÂY */}
      {/* ========================================================= */}
      {phase === 'phase_b' && (
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <span className="text-sm font-bold text-muc-tim-dam uppercase tracking-wider">{T.thuThachTuXayCay}</span>
            <h3 className="first-letter:uppercase font-display font-extrabold text-xl sm:text-2xl text-chu">{T.nhapKetQuaTuCac}</h3>
            <p className="text-sm text-nau-go-dam max-w-md mx-auto">{T.chonOCanTinhRoi}</p>
          </div>

          {/* Cây Merkle SVG */}
          <CayMerkle
            treeValues={currentTreeB}
            cellStatuses={cellStatusesB}
            onCellClick={(lvl, idx) => {
              if (lvl === 1 && idx === 0) {
                if (!isT12Solved) setSelectedSlot('t12');
              } else if (lvl === 1 && idx === 1) {
                if (!isT34Solved) setSelectedSlot('t34');
              } else if (lvl === 2 && idx === 0) {
                if (!isChildrenReady) {
                  sound.playWrong();
                  setLockedNotice(T.canT12VaT34Truoc);
                  setTimeout(() => setLockedNotice(null), 2500);
                } else if (!isRootSolved) {
                  setSelectedSlot('root');
                }
              }
            }}
            caption={T.chamVaoODeChon}
          />

          {/* Thông báo nếu bấm vào ô gốc bị khóa */}
          {lockedNotice && (
            <div className="p-2.5 rounded-[10px] bg-do-son/10 border border-do-son text-sm font-bold text-do-son-dam text-center animate-in fade-in duration-200">
              ⚠️ {lockedNotice}
            </div>
          )}

          {/* Khu vực nhập số cho ô đang chọn */}
          {!isRootSolved ? (
            <div className="p-4 rounded-[16px] bg-white/60 border border-muc-tim/10 flex flex-col items-center gap-3">
              <div className="text-sm font-bold text-muc-tim-dam uppercase">{fmt(T.dangNhapChoO, { so: selectedSlot === 'root' ? T.goc : selectedSlot?.toUpperCase() })}</div>

              <div className="flex items-center gap-2">
                <NumberInput
                  value={inputVal}
                  onChange={(val) => {
                    setInputVal(val);
                    if (inputError) setInputError(undefined);
                  }}
                  min={1}
                  max={999999}
                  showButtons={false}
                  placeholder={T.nhapKetQua}
                  error={inputError}
                  onEnter={handleCheckPartB}
                  autoFocus
                  className="w-36 text-center"
                />
                <Button variant="primary" size="md" onClick={handleCheckPartB}>{T.xacNhan}</Button>
              </div>

              {selectedSlot === 'root' && !isChildrenReady && (
                <span className="text-sm text-do-son-dam font-medium">{T.canT12VaT34Truoc}</span>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-[16px] bg-xanh-la/10 border-2 border-xanh-la-dam text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="font-display font-extrabold text-lg text-xanh-la-dam">{T.xuatSacEmDaHoan}</div>
              <p className="text-sm text-chu">{T.hayTiepTucDeXem}</p>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  sound.playClick();
                  setPhase('phase_c');
                }}
              >{T.khamPhaKhoanhKhacA}</Button>
            </div>
          )}
        </Card>
      )}

      {/* ========================================================= */}
      {/* PHẦN C: KHOẢNH KHẮC "À RA THẾ" */}
      {/* ========================================================= */}
      {phase === 'phase_c' && (
        <Card className="p-3 sm:p-8 space-y-5">
          <div className="text-center space-y-1">
            <span className="text-sm font-bold text-do-son-dam uppercase tracking-wider">{T.khoanhKhacARaThe}</span>
            <h3 className="first-letter:uppercase font-display font-extrabold text-xl sm:text-2xl text-chu">{T.giaoDichNaoBiSua}</h3>
          </div>

          {/* Lời {phanDien}: không nói lá nào bị sửa */}
          <div className="p-4 rounded-[16px] bg-do-son/10 border border-do-son/30 flex items-center gap-3">
            <Avatar portrait={portraitOf('ti')} size="md" />
            <div className="text-sm text-chu leading-snug">{rich(T.tinhNghichToVuaLen)}</div>
          </div>

          {/* Dòng đầu mối: số gốc tính lại không khớp số trong sổ */}
          <div className="space-y-2">
            <p className="rounded-[14px] border-2 border-xanh-la-dam bg-xanh-la/10 px-3 py-2 text-center font-display text-base text-xanh-la-dam">
              {rich(T.soGocDaGhi, { so: partBTree[2][0] })}
            </p>
            <p
              role="status"
              className="rounded-[14px] border-2 border-do-son-dam bg-do-son/10 px-3 py-2 text-center font-display text-base text-do-son-dam"
            >
              {rich(T.soGocTinhLai, { so: tamperedTree[2][0] })}
            </p>
          </div>

          {!found && <p className="text-center text-sm text-nau-go-dam">{T.huongDanSoiO}</p>}

          {/* Cây sổ: số đã ghi ở mọi ô; bấm một ô để soi */}
          <CayMerkle
            treeValues={currentTreeC}
            cellStatuses={cellStatusesC}
            highlightPath={tamperStep >= 0 ? tamperPath.slice(0, tamperStep + 1) : []}
            renderSlot={(level, index) => renderInspectSlot(level, index)}
            scrollHint
            caption={T.soiTieuDeCay}
          />

          {/* Bi gợi ý khi em đã soi trúng ô khớp lần thứ 2 */}
          {shouldShowBiHint(inspected) && !found && (
            <div role="status" className="flex items-center gap-3 rounded-[16px] border-2 border-muc-tim/40 bg-muc-tim/10 p-3">
              <Avatar portrait="bi" size="md" />
              <p className="text-sm font-semibold text-chu">{T.soiBiGoiY}</p>
            </div>
          )}

          {found && (
            <p
              role="status"
              className="rounded-[14px] border-2 border-xanh-la-dam bg-xanh-la/10 px-3 py-2 text-center font-display text-base font-extrabold text-xanh-la-dam"
            >
              <span aria-hidden="true">✓ </span>
              {fmt(T.soiTimRaRoi, { la: `T${tamperedLeafIndex + 1}`, cu: partBLeaves[tamperedLeafIndex], moi: tamperedNewValue })}
            </p>
          )}

          {/* Nút hành động */}
          {found && (
            <div className="flex flex-col items-center gap-3 pt-1">
              {tamperStep < 2 ? (
                <Button variant="secondary" size="md" disabled>
                  {T.dangLanTruyenDoiGia}
                </Button>
              ) : (
                <>
                  <p className="text-center text-base font-semibold text-chu">{fmt(T.soiTongKet, { so: inspectCount(inspected) })}</p>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => {
                      const totalMistakes = mistakesB;
                      const stars = starsFromMistakes(totalMistakes);
                      const timeMs = Date.now() - startTimeRef.current;
                      sound.playLevelComplete();
                      onComplete({
                        stars,
                        timeMs,
                        learned: T.doiMotGiaoDichThi,
                      });
                    }}
                  >
                    {T.hoanThanhManHoc}
                  </Button>
                </>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Phản hồi FeedbackSheet */}
      <FeedbackSheet
        isOpen={feedback.isOpen}
        isCorrect={feedback.isCorrect}
        title={feedback.title}
        whatHappened={feedback.whatHappened}
        whyHappened={feedback.whyHappened}
        howToFix={feedback.howToFix}
        onContinue={() => {
          setFeedback((prev) => ({ ...prev, isOpen: false }));
        }}
        continueLabel={T.thuLai}
      />
    </div>
  );
}
