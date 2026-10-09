import { useMemo, useState } from 'react';
import { Button, LEVELS, ui } from '@so-chung/core';
import { teacherTexts } from '@so-chung/core/content/teacher';
import { buildCsv, safeFileName } from '@so-chung/core/teacher/csv';
import {
  VILLAGES_FOR_FILTER,
  cellText,
  filterStudents,
  formatDateTime,
  levelCell,
  progressHeaders,
  progressRowText,
  type StudentRow,
} from '@so-chung/core/teacher/progress';
import { fill } from '@so-chung/core/teacher/text';
import type { VillageId } from '@so-chung/core';

const T = teacherTexts.tienDo;

/** Tải file CSV (UTF-8 có BOM) về máy. */
function downloadCsv(fileName: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const cellBase = 'whitespace-nowrap border border-nau-go/30 px-2 py-2 text-sm';

/** Tab Tiến độ: bảng mỗi hàng một học sinh, tìm theo tên, lọc làng chưa xong, xuất CSV. */
export function ProgressTab({ students, className, onSelect }: { students: StudentRow[]; className: string; onSelect: (s: StudentRow) => void }) {
  const [query, setQuery] = useState('');
  const [village, setVillage] = useState<VillageId | ''>('');
  const shown = useMemo(() => filterStudents(students, { query, notDoneVillage: village || null }), [students, query, village]);

  const exportCsv = () => {
    const csv = buildCsv(progressHeaders(), shown.map((s) => progressRowText(s)));
    downloadCsv(fill(T.tenCsv, { lop: safeFileName(className) }), csv);
  };

  if (students.length === 0) return <p className="py-4 text-base">{T.trong}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-48 flex-1 space-y-1">
          <span className="text-base font-semibold">{T.timTen}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={T.timTenGoiY}
            className="min-h-11 w-full rounded-nut border-2 border-nau-go bg-white px-3 text-base focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-base font-semibold">{T.loc}</span>
          <select
            value={village}
            onChange={(e) => setVillage(e.target.value as VillageId | '')}
            className="min-h-11 w-full rounded-nut border-2 border-nau-go bg-white px-3 text-base focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
          >
            <option value="">{T.locTatCa}</option>
            {VILLAGES_FOR_FILTER.map((v) => (
              <option key={v} value={v}>
                {fill(T.locChuaXong, { lang: ui.lang[v] })}
              </option>
            ))}
          </select>
        </label>
        <Button size="sm" variant="secondary" onClick={exportCsv} disabled={shown.length === 0}>
          {T.xuatCsv}
        </Button>
      </div>

      <p className="text-sm">{T.chuThich}</p>
      <p className="text-sm">{T.bamXemChiTiet}</p>

      {shown.length === 0 ? (
        <p className="py-4 text-base">{T.khongThay}</p>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border-2 border-nau-go/40 bg-white/70">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-giay">
                <th scope="col" className={`${cellBase} sticky left-0 z-10 bg-giay font-bold`}>
                  {T.cotTen}
                </th>
                {LEVELS.map((l) => (
                  <th key={l.id} scope="col" className={`${cellBase} text-center font-bold`}>
                    {fill(T.cotMan, { so: l.id })}
                  </th>
                ))}
                <th scope="col" className={`${cellBase} text-center font-bold`}>
                  {T.cotSoVang}
                </th>
                <th scope="col" className={`${cellBase} text-center font-bold`}>
                  {T.cotTongSao}
                </th>
                <th scope="col" className={`${cellBase} font-bold`}>
                  {T.cotLanCuoi}
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id} className="odd:bg-white/60">
                  <th scope="row" className={`${cellBase} sticky left-0 z-10 bg-giay text-left font-semibold`}>
                    <button
                      type="button"
                      onClick={() => onSelect(s)}
                      className="min-h-11 cursor-pointer rounded-nut px-1 text-left font-semibold text-muc-tim-dam underline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
                    >
                      {s.name}
                    </button>
                  </th>
                  {LEVELS.map((l) => {
                    const text = cellText(levelCell(l, s.levels[l.id]));
                    return (
                      <td key={l.id} className={`${cellBase} text-center`} aria-label={text || T.chuaChoi}>
                        {text}
                      </td>
                    );
                  })}
                  <td className={`${cellBase} text-center`}>{s.goldenPages}</td>
                  <td className={`${cellBase} text-center`}>{s.totalStars}</td>
                  <td className={cellBase}>{formatDateTime(s.lastPlayed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
