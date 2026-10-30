import { describe, expect, it } from 'vitest';
import { KNOW_QUIZ } from '../content/knowQuiz';
import { VILLAGE_ORDER } from '../content/levels';
import { effectiveKnowMask, knowCardMaskOf, withKnowCard } from '../progress/knowCards';
import { canCollect, chooseOption, initialQuizState, knowCollectibleTotal, knowQuizOf, parseNumberAnswer, submitQuiz, typeAnswer } from './knowQuiz';

const ABCD = KNOW_QUIZ['lang-giay'][0];
const NUM = KNOW_QUIZ['lang-giay'][2];

describe('chuẩn hóa câu trả lời điền số (quy tắc đã duyệt)', () => {
  it('nhận số viết liền, bỏ khoảng trắng hai đầu và MỘT dấu chấm cuối', () => {
    for (const raw of ['44', ' 44 ', '44.', '  44.  ', '\t44\n']) expect(parseNumberAnswer(raw)).toEqual({ kind: 'ok', value: 44 });
    expect(parseNumberAnswer('0')).toEqual({ kind: 'ok', value: 0 });
    expect(parseNumberAnswer('288')).toEqual({ kind: 'ok', value: 288 });
  });
  it('trống là "empty"', () => {
    for (const raw of ['', '   ', '\n']) expect(parseNumberAnswer(raw)).toEqual({ kind: 'empty' });
  });
  it('sai định dạng là "invalid": chữ, số thập phân, dấu phân cách ngàn, dấu, số 0 đứng đầu, khoảng trắng giữa chữ số, hai dấu chấm, chữ số không phải ASCII', () => {
    for (const raw of ['abc', '44a', 'a44', '4 4', '44,5', '44.5', '1.234', '1,234', '+44', '-44', '044', '00', '44..', '.', ',', '٤٤', '４４', '4e1', '1234567890', 'bốn mươi bốn']) {
      expect(parseNumberAnswer(raw), raw).toEqual({ kind: 'invalid' });
    }
  });
});

describe('máy trạng thái một lượt trả lời', () => {
  it('ABCD: chưa chọn thì chỉ nhắc, không tính là lần trả lời', () => {
    const s = submitQuiz(initialQuizState(), ABCD);
    expect(s.phase).toBe('ask');
    expect(s.reminder).toBe('chuaChon');
    expect(s.result).toBeNull();
    expect(canCollect(s)).toBe(false);
  });
  it('ABCD: chọn đúng rồi nộp → feedback, đúng; chọn sai → feedback, sai; cả hai đều cất được thẻ', () => {
    const right = submitQuiz(chooseOption(initialQuizState(), 0), ABCD);
    expect(right.phase).toBe('feedback');
    expect(right.result).toEqual({ correct: true, given: '0' });
    expect(canCollect(right)).toBe(true);
    const wrong = submitQuiz(chooseOption(initialQuizState(), 3), ABCD);
    expect(wrong.result).toEqual({ correct: false, given: '3' });
    expect(canCollect(wrong)).toBe(true);
  });
  it('khóa sau khi nộp: không đổi lựa chọn, không gõ thêm, nộp lần hai (Enter lặp) giữ nguyên đúng đối tượng cũ', () => {
    const done = submitQuiz(chooseOption(initialQuizState(), 3), ABCD);
    expect(chooseOption(done, 0)).toBe(done);
    expect(typeAnswer(done, '5')).toBe(done);
    expect(submitQuiz(done, ABCD)).toBe(done);
    expect(done.result?.correct).toBe(false); // vẫn là kết quả của lần trả lời đầu
  });
  it('chỉ số lựa chọn ngoài 0 đến 3 bị bỏ qua', () => {
    const s = initialQuizState();
    for (const i of [-1, 4, 1.5, NaN]) expect(chooseOption(s, i)).toBe(s);
  });
  it('điền số: trống hoặc sai định dạng chỉ nhắc (không tính là trả lời); số hợp lệ mới được chấm', () => {
    const empty = submitQuiz(initialQuizState(), NUM);
    expect([empty.phase, empty.reminder]).toEqual(['ask', 'trong']);
    const bad = submitQuiz(typeAnswer(initialQuizState(), '44a'), NUM);
    expect([bad.phase, bad.reminder, bad.result]).toEqual(['ask', 'dinhDang', null]);
    const zero = submitQuiz(typeAnswer(initialQuizState(), '044'), NUM);
    expect([zero.phase, zero.reminder]).toEqual(['ask', 'dinhDang']);
    const wrong = submitQuiz(typeAnswer(initialQuizState(), ' 144. '), NUM);
    expect(wrong.phase).toBe('feedback');
    expect(wrong.result).toEqual({ correct: false, given: '144' });
    const right = submitQuiz(typeAnswer(initialQuizState(), '44.'), NUM);
    expect(right.result).toEqual({ correct: true, given: '44' });
  });
  it('gõ tiếp hay chọn lại xóa lời nhắc', () => {
    const r = submitQuiz(initialQuizState(), NUM);
    expect(typeAnswer(r, '4').reminder).toBe('none');
    const r2 = submitQuiz(initialQuizState(), ABCD);
    expect(chooseOption(r2, 1).reminder).toBe('none');
  });
});

describe('khóa thẻ và số thẻ nhặt được', () => {
  it('đủ 16 khóa: 4 làng × 4 thẻ, chỉ số 0 đến 3, không lệch bit của knowCards', () => {
    let n = 0;
    for (const v of VILLAGE_ORDER) {
      expect(knowCollectibleTotal(v)).toBe(4);
      for (let i = 0; i < 4; i++) {
        expect(knowQuizOf(v, i)).toBeDefined();
        n++;
      }
      expect(knowQuizOf(v, 4)).toBeUndefined(); // thẻ thứ 5 của Làng Khắc Dấu (không có cuộn) và mọi chỉ số ngoài khoảng: không có câu hỏi
      expect(knowQuizOf(v, -1)).toBeUndefined();
    }
    expect(n).toBe(16);
  });
});

describe('ghi cờ nhặt thẻ chỉ qua withKnowCard (cất lặp không ghi trùng) và không phụ thuộc đáp án', () => {
  it('cất thẻ lặp lại cho cùng một dữ liệu', () => {
    const d1 = withKnowCard({}, 'lang-khac-dau', 2);
    const d2 = withKnowCard(d1, 'lang-khac-dau', 2);
    expect(knowCardMaskOf(d1, 'lang-khac-dau')).toBe(4);
    expect(knowCardMaskOf(d2, 'lang-khac-dau')).toBe(4);
    expect(d2).toEqual(d1);
  });
  it('trả lời sai hay đúng không có trường nào trong dữ liệu: cờ chỉ là mặt nạ bit (không thêm trường lưu đáp án)', () => {
    const d = withKnowCard({}, 'lang-giay', 0);
    expect(Object.keys(d)).toEqual(['knowCards']);
    expect(d).toEqual({ knowCards: { 'lang-giay': 1 } });
  });
  it('cất đủ 4 thẻ thì mặt nạ đủ (mở bài như trước); thiếu thì không', () => {
    let d: Record<string, unknown> = {};
    for (let i = 0; i < 4; i++) d = withKnowCard(d, 'lang-bac', i);
    expect(effectiveKnowMask({ data: d, village: 'lang-bac', total: 4, lessonDone: false, seenOld: false })).toBe(15);
    expect(effectiveKnowMask({ data: withKnowCard({}, 'lang-bac', 1), village: 'lang-bac', total: 4, lessonDone: false, seenOld: false })).toBe(2);
  });
  it('tiến độ cũ giữ nguyên: đã xong bài học hay đã xem hộp cũ vẫn coi như đủ; chưa có gì thì không có thẻ nào', () => {
    expect(effectiveKnowMask({ data: {}, village: 'lang-giay', total: 4, lessonDone: true, seenOld: false })).toBe(15);
    expect(effectiveKnowMask({ data: {}, village: 'lang-giay', total: 4, lessonDone: false, seenOld: true })).toBe(15);
    expect(effectiveKnowMask({ data: {}, village: 'lang-giay', total: 4, lessonDone: false, seenOld: false })).toBe(0);
  });
  it('tự hoàn thành (bài học đầu chỉ có cờ auto, lessonDone = false) không biến thẻ chưa nhặt thành đã nhặt', () => {
    expect(effectiveKnowMask({ data: {}, village: 'lang-det', total: 4, lessonDone: false, seenOld: false })).toBe(0);
    expect(effectiveKnowMask({ data: withKnowCard({}, 'lang-det', 3), village: 'lang-det', total: 4, lessonDone: false, seenOld: false })).toBe(8);
  });
});
