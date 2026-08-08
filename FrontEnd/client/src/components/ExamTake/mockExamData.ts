import type { MockExamMeta } from './types';

/**
 * Dữ liệu mẫu cho UI làm bài — sau này thay bằng payload API.
 */
export const mockExamUi: MockExamMeta = {
  title: 'Kiểm tra giữa kỳ: Toán học',
  section: 'Phần 2: Đạo hàm',
  totalQuestions: 30,
  questions: [
    {
      number: 1,
      points: 1,
      type: 'mcq',
      prompt: 'Đạo hàm của hàm số f(x) = x² tại x = 3 bằng bao nhiêu?',
      options: [
        { key: 'A', label: '3' },
        { key: 'B', label: '6' },
        { key: 'C', label: '9' },
        { key: 'D', label: '12' },
      ],
    },
    {
      number: 2,
      points: 2,
      type: 'audio_mcq',
      prompt:
        'Nghe đoạn âm thanh và tính vận tức tức thời tại thời điểm được nêu trong bài (giả định).',
      audioClipLabel: 'Âm thanh — Câu 2-B',
      options: [
        { key: 'A', label: '12 m/s' },
        { key: 'B', label: '18 m/s' },
        { key: 'C', label: '24 m/s' },
        { key: 'D', label: '30 m/s' },
      ],
    },
    {
      number: 3,
      points: 2,
      type: 'image_mcq',
      prompt: 'Theo hình minh họa, đâu là mô tả đúng nhất về cấu trúc tế bào?',
      imageSrc:
        'https://images.unsplash.com/photo-1576086213369-97a306d36757?w=800&q=80',
      imageAlt: 'Minh họa khoa học',
      options: [
        { key: 'A', label: 'Tổng hợp và gấp protein' },
        { key: 'B', label: 'Sản xuất năng lượng (ATP)' },
        { key: 'C', label: 'Lưu trữ thông tin di truyền (DNA)' },
        { key: 'D', label: 'Phân hủy chất thải tế bào' },
      ],
    },
    {
      number: 4,
      points: 3,
      type: 'composite',
      prompt: '',
      composite: {
        videoCaption: 'Đoạn 1: Hội thoại tại sân bay',
        viewsRemainingBadge: 'Còn 1 lượt xem',
        parts: [
          {
            id: 'p1',
            kind: 'mcq',
            badge: 'TRẮC NGHIỆM',
            prompt: 'Hành khách phàn nàn chính về điều gì trong chuyến bay?',
            options: [
              { key: 'A', label: 'Chuyến bay bị hoãn' },
              { key: 'B', label: 'Hành lý bị thất lạc' },
              { key: 'C', label: 'Ghế ngồi không đúng với vé' },
              { key: 'D', label: 'Thức ăn trên máy bay' },
            ],
          },
          {
            id: 'p2',
            kind: 'essay',
            badge: 'TỰ LUẬN NGẮN',
            prompt:
              'Mô tả thái độ của nhân viên phục vụ bằng hai tính từ và giải thích vì sao.',
            placeholder: 'Nhập câu trả lời của bạn...',
            maxWords: 150,
          },
        ],
      },
      sidebarNote: 'Trả lời dựa trên video. Chú ý các chi tiết cụ thể.',
    },
    {
      number: 5,
      points: 2,
      type: 'fill_blank',
      prompt: '',
      fillSegments: [
        { type: 'text', value: 'Hàm số liên tục trên ' },
        { type: 'blank', id: 'b1', placeholder: '...' },
        { type: 'text', value: ' nếu lim f(x) khi x tiến tới a bằng ' },
        { type: 'blank', id: 'b2', placeholder: '...' },
        { type: 'text', value: '.' },
      ],
    },
    {
      number: 6,
      points: 4,
      type: 'essay',
      prompt:
        'Trình bày ngắn gọn quy tắc chuỗi (chain rule) và cho một ví dụ minh họa.',
      essay: { placeholder: 'Soạn câu trả lời...', maxWords: 200 },
    },
    {
      number: 7,
      points: 1,
      type: 'mcq',
      prompt: 'Đạo hàm của ln(x) là:',
      options: [
        { key: 'A', label: '1/x' },
        { key: 'B', label: 'x' },
        { key: 'C', label: 'e^x' },
        { key: 'D', label: 'ln(x)' },
      ],
    },
    {
      number: 8,
      points: 2,
      type: 'mcq',
      prompt: 'Tiếp tuyến của đồ thị tại điểm có hoành độ x₀ có hệ số góc bằng:',
      options: [
        { key: 'A', label: 'f(x₀)' },
        { key: 'B', label: "f'(x₀)" },
        { key: 'C', label: "f''(x₀)" },
        { key: 'D', label: '0' },
      ],
    },
  ],
};
