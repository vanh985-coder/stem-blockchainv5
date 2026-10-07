import { LessonShell, LevelProps } from '../../components/game/LessonShell';
import { Easy } from './Easy';
import { Medium } from './Medium';
import { Hard } from './Hard';
import { lesson5StoryCards } from './content';
import { LevelId } from '../../lib/progressLogic';

export default function Lesson5Page() {
  return (
    <LessonShell
      lessonId={5}
      storyCards={lesson5StoryCards}
      levelsMeta={{
        easy: {
          title: 'Màn 5.1: Sức mạnh, không phải số lượng',
          objective:
            'Phân bổ các node để hiểu vì sao tỷ lệ phần trăm sức mạnh quyết định quyền kiểm soát mạng.',
        },
        medium: {
          title: 'Màn 5.2: Tấn công, hậu quả, phòng thủ',
          objective:
            'Nối các chiêu thức tấn công 51% với hậu quả thực tế và biện pháp phòng thủ.',
        },
        hard: {
          title: 'Màn 5.3: Cuộc chiến 51%',
          objective:
            'Đấu trí chiến thuật trên bàn cờ 10 node với bot để hiểu bản chất của tấn công 51%.',
        },
      }}
      renderLevel={(diff: LevelId, props: LevelProps) => {
        if (diff === 'easy') return <Easy {...props} />;
        if (diff === 'medium') return <Medium {...props} />;
        return <Hard {...props} />;
      }}
    />
  );
}
