type MCQ = { content: string; options: string[]; correct: number; explanation?: string };
type Essay = { content: string; explanation?: string; points?: number };

export const matQ1 = {
  mcqs: [
    {
      content: "Tính giới hạn: lim(x→0) sin(x)/x",
      options: ["0", "1", "∞", "Không tồn tại"],
      correct: 1,
      explanation: "Đây là giới hạn cơ bản nổi tiếng, lim(x→0) sin(x)/x = 1"
    },
    {
      content: "Tính đạo hàm của f(x) = x^3 - 2x^2 + 5x - 1",
      options: ["3x^2 - 4x + 5", "3x^2 - 2x + 5", "x^2 - 4x + 5", "3x^3 - 4x^2 + 5x"],
      correct: 0,
      explanation: "f'(x) = 3x^2 - 4x + 5 theo công thức đạo hàm lũy thừa"
    },
    {
      content: "Tính tích phân: ∫ 2x dx",
      options: ["x^2 + C", "2x^2 + C", "x + C", "2 + C"],
      correct: 0,
      explanation: "∫ 2x dx = 2 · x^2/2 + C = x^2 + C"
    },
    {
      content: "Giới hạn lim(x→∞) (1 + 1/x)^x bằng bao nhiêu?",
      options: ["1", "0", "e", "∞"],
      correct: 2,
      explanation: "Đây là định nghĩa của số e: lim(x→∞) (1 + 1/x)^x = e"
    },
    {
      content: "Đạo hàm của f(x) = e^(2x) là:",
      options: ["e^(2x)", "2e^(2x)", "2xe^(2x)", "e^(2x)/2"],
      correct: 1,
      explanation: "Áp dụng quy tắc đạo hàm hàm hợp: f'(x) = 2e^(2x)"
    },
    {
      content: "Tính ∫₀¹ x^2 dx",
      options: ["1/2", "1/3", "1/4", "1"],
      correct: 1,
      explanation: "∫₀¹ x^2 dx = [x^3/3]₀¹ = 1/3 - 0 = 1/3"
    },
    {
      content: "Chuỗi hình học ∑(n=0,∞) (1/2)^n hội tụ về giá trị nào?",
      options: ["1", "2", "1/2", "∞"],
      correct: 1,
      explanation: "Tổng chuỗi hình học = a/(1-r) = 1/(1 - 1/2) = 2"
    },
    {
      content: "Nghiệm tổng quát của phương trình vi phân y' = 2y là:",
      options: ["y = Ce^(2x)", "y = 2x + C", "y = Ce^x", "y = C·2^x"],
      correct: 0,
      explanation: "dy/y = 2dx → ln|y| = 2x + C₁ → y = Ce^(2x)"
    },
    {
      content: "Đạo hàm riêng ∂f/∂x của f(x,y) = x^2·y + 3xy^2 là:",
      options: ["2xy + 3y^2", "x^2 + 6xy", "2x·y + 3x", "2xy + 6xy"],
      correct: 0,
      explanation: "Đạo hàm riêng theo x, coi y là hằng số: ∂f/∂x = 2xy + 3y^2"
    },
    {
      content: "Khai triển Taylor của e^x tại x = 0 bắt đầu bằng:",
      options: ["1 + x + x^2/2! + x^3/3! + ...", "x + x^2/2 + x^3/3 + ...", "1 + x + x^2 + x^3 + ...", "1 - x + x^2/2! - x^3/3! + ..."],
      correct: 0,
      explanation: "e^x = ∑(n=0,∞) x^n/n! = 1 + x + x^2/2! + x^3/3! + ..."
    },
    {
      content: "Áp dụng quy tắc L'Hôpital, tính lim(x→0) (e^x - 1)/x",
      options: ["0", "1", "e", "∞"],
      correct: 1,
      explanation: "Dạng 0/0, áp dụng L'Hôpital: lim(x→0) e^x/1 = e^0 = 1"
    },
    {
      content: "Tính ∫ sin(x) dx",
      options: ["-cos(x) + C", "cos(x) + C", "-sin(x) + C", "sin(x) + C"],
      correct: 0,
      explanation: "Nguyên hàm của sin(x) là -cos(x) + C"
    },
    {
      content: "Hàm số f(x) = x^3 - 3x có cực đại tại điểm nào?",
      options: ["x = 0", "x = -1", "x = 1", "x = 3"],
      correct: 1,
      explanation: "f'(x) = 3x^2 - 3 = 0 → x = ±1. f''(-1) = 6(-1) = -6 < 0 nên x = -1 là cực đại"
    },
    {
      content: "Tích phân từng phần ∫ x·e^x dx bằng:",
      options: ["x·e^x - e^x + C", "x·e^x + e^x + C", "(x-1)·e^x + C", "(x+1)·e^x + C"],
      correct: 0,
      explanation: "Đặt u = x, dv = e^x dx → ∫ x·e^x dx = x·e^x - ∫ e^x dx = x·e^x - e^x + C"
    },
    {
      content: "Tích phân suy rộng ∫₁^∞ 1/x^2 dx bằng:",
      options: ["∞", "1", "1/2", "2"],
      correct: 1,
      explanation: "∫₁^∞ x^(-2) dx = [-1/x]₁^∞ = 0 - (-1) = 1"
    },
    {
      content: "Dãy số a_n = (2n+1)/(n+3) hội tụ về:",
      options: ["0", "1", "2", "3"],
      correct: 2,
      explanation: "lim(n→∞) (2n+1)/(n+3) = lim 2 + 1/n)/(1 + 3/n) = 2"
    },
    {
      content: "Đạo hàm của f(x) = ln(x^2 + 1) là:",
      options: ["1/(x^2+1)", "2x/(x^2+1)", "2x·ln(x^2+1)", "x/(x^2+1)"],
      correct: 1,
      explanation: "f'(x) = (2x)/(x^2+1) theo quy tắc đạo hàm hàm hợp"
    },
    {
      content: "Tính lim(x→0) (1 - cos(x))/x^2",
      options: ["0", "1/2", "1", "2"],
      correct: 1,
      explanation: "Áp dụng L'Hôpital hai lần hoặc dùng khai triển Taylor: kết quả = 1/2"
    },
    {
      content: "∫ 1/(x^2+1) dx bằng:",
      options: ["ln(x^2+1) + C", "arctan(x) + C", "1/x + C", "arcsin(x) + C"],
      correct: 1,
      explanation: "Đây là công thức nguyên hàm cơ bản: ∫ 1/(1+x^2) dx = arctan(x) + C"
    },
    {
      content: "Chuỗi ∑(n=1,∞) 1/n (chuỗi điều hòa) là:",
      options: ["Hội tụ về 1", "Hội tụ về ln(2)", "Phân kỳ", "Hội tụ về e"],
      correct: 2,
      explanation: "Chuỗi điều hòa ∑ 1/n phân kỳ (tiêu chuẩn tích phân hoặc so sánh)"
    },
    {
      content: "Phương trình vi phân y'' + y = 0 có nghiệm tổng quát là:",
      options: ["y = C₁·e^x + C₂·e^(-x)", "y = C₁·cos(x) + C₂·sin(x)", "y = C₁·x + C₂", "y = (C₁ + C₂·x)·e^x"],
      correct: 1,
      explanation: "Phương trình đặc trưng r^2 + 1 = 0, r = ±i → y = C₁·cos(x) + C₂·sin(x)"
    },
    {
      content: "Gradient của f(x,y) = x^2 + y^2 tại điểm (1,2) là:",
      options: ["(2, 4)", "(1, 2)", "(4, 2)", "(2, 2)"],
      correct: 0,
      explanation: "∇f = (∂f/∂x, ∂f/∂y) = (2x, 2y). Tại (1,2): ∇f = (2, 4)"
    },
    {
      content: "Khai triển Maclaurin của sin(x) là:",
      options: ["x - x^3/3! + x^5/5! - ...", "1 - x^2/2! + x^4/4! - ...", "x + x^3/3! + x^5/5! + ...", "1 + x + x^2/2! + ..."],
      correct: 0,
      explanation: "sin(x) = ∑(n=0,∞) (-1)^n · x^(2n+1)/(2n+1)! = x - x^3/3! + x^5/5! - ..."
    },
    {
      content: "Tính lim(x→0) x·ln(x) (dạng 0·(-∞))",
      options: ["0", "-∞", "1", "Không tồn tại"],
      correct: 0,
      explanation: "Viết lại ln(x)/(1/x), dạng -∞/∞, L'Hôpital: (1/x)/(-1/x^2) = -x → 0"
    },
    {
      content: "Đạo hàm của f(x) = arctan(x) là:",
      options: ["1/(1-x^2)", "1/(1+x^2)", "-1/(1+x^2)", "1/√(1-x^2)"],
      correct: 1,
      explanation: "Công thức cơ bản: d/dx[arctan(x)] = 1/(1+x^2)"
    },
    {
      content: "Tính ∫ x·cos(x) dx bằng phương pháp tích phân từng phần:",
      options: ["x·sin(x) + cos(x) + C", "x·sin(x) - cos(x) + C", "-x·sin(x) + cos(x) + C", "x·cos(x) + sin(x) + C"],
      correct: 0,
      explanation: "u = x, dv = cos(x)dx → ∫ x·cos(x) dx = x·sin(x) - ∫ sin(x)dx = x·sin(x) + cos(x) + C"
    },
    {
      content: "Chuỗi ∑(n=1,∞) 1/n^2 là:",
      options: ["Phân kỳ", "Hội tụ về π^2/6", "Hội tụ về 1", "Hội tụ về 2"],
      correct: 1,
      explanation: "Đây là bài toán Basel nổi tiếng: ∑(n=1,∞) 1/n^2 = π^2/6"
    },
    {
      content: "Tính đạo hàm cấp 2 của f(x) = sin(2x)",
      options: ["2cos(2x)", "-4sin(2x)", "4cos(2x)", "-2sin(2x)"],
      correct: 1,
      explanation: "f'(x) = 2cos(2x), f''(x) = -4sin(2x)"
    },
    {
      content: "Phương trình vi phân y' + y = e^x có nghiệm riêng dạng:",
      options: ["y_p = Ae^x", "y_p = Axe^x", "y_p = Ae^(2x)", "y_p = A·e^x/2"],
      correct: 0,
      explanation: "Thử y_p = Ae^x: A·e^x + A·e^x = e^x → 2A = 1 → A = 1/2, y_p = e^x/2"
    },
    {
      content: "Tính ∫₀^π sin(x) dx",
      options: ["0", "1", "2", "-2"],
      correct: 2,
      explanation: "∫₀^π sin(x) dx = [-cos(x)]₀^π = -cos(π) + cos(0) = 1 + 1 = 2"
    },
    {
      content: "Hàm f(x) = x·e^(-x) đạt cực đại tại:",
      options: ["x = 0", "x = 1", "x = -1", "x = 2"],
      correct: 1,
      explanation: "f'(x) = e^(-x) - x·e^(-x) = (1-x)·e^(-x) = 0 → x = 1. f''(1) < 0 nên là cực đại"
    },
    {
      content: "Tính ∫ 1/(x·ln(x)) dx",
      options: ["ln(ln(x)) + C", "1/ln(x) + C", "ln(x^2) + C", "x·ln(x) + C"],
      correct: 0,
      explanation: "Đặt t = ln(x), dt = dx/x → ∫ dt/t = ln|t| + C = ln|ln(x)| + C"
    },
    {
      content: "Bán kính hội tụ của chuỗi lũy thừa ∑(n=0,∞) x^n/n! là:",
      options: ["1", "e", "∞", "0"],
      correct: 2,
      explanation: "Tỉ số |a_(n+1)/a_n| = |x|/(n+1) → 0 khi n→∞, nên R = ∞"
    },
    {
      content: "Tính lim(x→+∞) x^2·e^(-x)",
      options: ["0", "∞", "1", "e"],
      correct: 0,
      explanation: "Áp dụng L'Hôpital: lim x^2/e^x = lim 2x/e^x = lim 2/e^x = 0"
    },
    {
      content: "Đạo hàm của f(x) = x^x (x > 0) là:",
      options: ["x^x", "x·x^(x-1)", "x^x·(ln(x) + 1)", "x^x·ln(x)"],
      correct: 2,
      explanation: "Lấy ln: ln(f) = x·ln(x) → f'/f = ln(x) + 1 → f' = x^x·(ln(x) + 1)"
    },
    {
      content: "Tính ∫ dx/√(1-x^2)",
      options: ["arctan(x) + C", "arcsin(x) + C", "ln|x + √(1-x^2)| + C", "-arccos(x) + C"],
      correct: 1,
      explanation: "Công thức cơ bản: ∫ 1/√(1-x^2) dx = arcsin(x) + C"
    },
    {
      content: "Jacobian của phép biến đổi x = r·cos(θ), y = r·sin(θ) là:",
      options: ["1", "r", "r^2", "1/r"],
      correct: 1,
      explanation: "J = |∂(x,y)/∂(r,θ)| = |cos(θ)·r·cos(θ) - (-sin(θ))·r·sin(θ)| ... = r"
    },
    {
      content: "Đạo hàm của f(x) = √(x^2 + 1) là:",
      options: ["1/(2√(x^2+1))", "x/√(x^2+1)", "2x/√(x^2+1)", "√(x^2+1)/x"],
      correct: 1,
      explanation: "f'(x) = (1/2)·(x^2+1)^(-1/2)·2x = x/√(x^2+1)"
    },
    {
      content: "Tích phân ∫₀^∞ e^(-x) dx bằng:",
      options: ["∞", "1", "0", "e"],
      correct: 1,
      explanation: "∫₀^∞ e^(-x) dx = [-e^(-x)]₀^∞ = 0 - (-1) = 1"
    },
    {
      content: "Điều kiện cần để hàm f(x,y) đạt cực trị tại (a,b) là:",
      options: [
        "f_x(a,b) = 0 và f_y(a,b) = 0",
        "f_xx(a,b) > 0 và f_yy(a,b) > 0",
        "f(a,b) = 0",
        "f_x(a,b) · f_y(a,b) > 0"
      ],
      correct: 0,
      explanation: "Điều kiện cần: ∂f/∂x = 0 và ∂f/∂y = 0 tại điểm cực trị"
    },
    {
      content: "Công thức đổi biến trong tích phân kép với x = r·cos(θ), y = r·sin(θ):",
      options: [
        "∬ f(x,y) dxdy = ∬ f(r·cos(θ), r·sin(θ)) · r drdθ",
        "∬ f(x,y) dxdy = ∬ f(r·cos(θ), r·sin(θ)) drdθ",
        "∬ f(x,y) dxdy = ∬ f(r·cos(θ), r·sin(θ)) · r^2 drdθ",
        "∬ f(x,y) dxdy = ∬ f(r·cos(θ), r·sin(θ)) · 2r drdθ"
      ],
      correct: 0,
      explanation: "Khi đổi sang tọa độ cực, dxdy = r·drdθ (Jacobian = r)"
    }
  ] as MCQ[],
  essays: [
    {
      content: "Tính giới hạn: lim(x→0) (sin(3x) - 3sin(x)) / x^3. Trình bày chi tiết các bước sử dụng khai triển Taylor hoặc quy tắc L'Hôpital.",
      explanation: "Khai triển Taylor: sin(3x) = 3x - (3x)^3/6 + ... = 3x - 27x^3/6 + ...; 3sin(x) = 3x - 3x^3/6 + ... Hiệu = -27x^3/6 + 3x^3/6 = -24x^3/6 = -4x^3. Chia cho x^3 được -4.",
      points: 3
    },
    {
      content: "Tìm giá trị lớn nhất và nhỏ nhất của hàm f(x) = x^3 - 6x^2 + 9x + 2 trên đoạn [0, 4]. Giải thích phương pháp và trình bày đầy đủ.",
      explanation: "f'(x) = 3x^2 - 12x + 9 = 3(x-1)(x-3) = 0 → x = 1, x = 3. f(0) = 2, f(1) = 6, f(3) = 2, f(4) = 6. Max = 6 tại x = 1 và x = 4, Min = 2 tại x = 0 và x = 3.",
      points: 3
    },
    {
      content: "Tính tích phân ∫ x^2·e^x dx bằng phương pháp tích phân từng phần. Trình bày chi tiết từng bước.",
      explanation: "Áp dụng tích phân từng phần 2 lần: I = x^2·e^x - ∫ 2x·e^x dx = x^2·e^x - 2(x·e^x - e^x) + C = e^x(x^2 - 2x + 2) + C",
      points: 3
    },
    {
      content: "Giải phương trình vi phân: y'' - 5y' + 6y = 0 với điều kiện ban đầu y(0) = 1, y'(0) = 0. Trình bày phương pháp giải và nghiệm.",
      explanation: "PT đặc trưng: r^2 - 5r + 6 = 0 → r = 2, 3. Nghiệm tổng quát: y = C₁·e^(2x) + C₂·e^(3x). Từ y(0) = 1: C₁ + C₂ = 1. Từ y'(0) = 0: 2C₁ + 3C₂ = 0. Giải hệ: C₁ = 3, C₂ = -2. Nghiệm: y = 3e^(2x) - 2e^(3x).",
      points: 4
    },
    {
      content: "Khảo sát sự hội tụ của chuỗi ∑(n=1,∞) n^2/(3^n). Sử dụng tiêu chuẩn D'Alembert hoặc tiêu chuẩn Cauchy. Trình bày đầy đủ.",
      explanation: "Tiêu chuẩn D'Alembert: lim |a_(n+1)/a_n| = lim (n+1)^2/(3·n^2) = 1/3 < 1 → chuỗi hội tụ.",
      points: 3
    },
    {
      content: "Tính tích phân kép ∬_D (x^2 + y^2) dxdy, trong đó D là hình tròn x^2 + y^2 ≤ 4. Sử dụng phép đổi biến sang tọa độ cực.",
      explanation: "Đổi sang tọa độ cực: x = r·cos(θ), y = r·sin(θ), dxdy = r·drdθ. D: 0 ≤ r ≤ 2, 0 ≤ θ ≤ 2π. I = ∫₀^(2π) ∫₀^2 r^2 · r drdθ = ∫₀^(2π) dθ · ∫₀^2 r^3 dr = 2π · [r^4/4]₀^2 = 2π · 4 = 8π.",
      points: 4
    },
    {
      content: "Tìm cực trị của hàm hai biến f(x,y) = x^2 + y^2 - 2x - 4y + 8. Xác định loại cực trị (cực đại, cực tiểu, hay điểm yên ngựa).",
      explanation: "f_x = 2x - 2 = 0 → x = 1; f_y = 2y - 4 = 0 → y = 2. Điểm dừng (1,2). f_xx = 2, f_yy = 2, f_xy = 0. D = f_xx·f_yy - (f_xy)^2 = 4 > 0 và f_xx > 0 → cực tiểu. f(1,2) = 1 + 4 - 2 - 8 + 8 = 3.",
      points: 3
    },
    {
      content: "Tính tích phân ∫ dx/(x^2 - 4) bằng phương pháp phân tích thành phân số tối giản. Trình bày đầy đủ các bước.",
      explanation: "x^2 - 4 = (x-2)(x+2). Phân tích: 1/(x^2-4) = A/(x-2) + B/(x+2). Tìm A = 1/4, B = -1/4. I = (1/4)·ln|x-2| - (1/4)·ln|x+2| + C = (1/4)·ln|(x-2)/(x+2)| + C.",
      points: 3
    },
    {
      content: "Khai triển hàm f(x) = 1/(1+x) thành chuỗi Taylor tại x₀ = 0. Xác định bán kính hội tụ và miền hội tụ của chuỗi.",
      explanation: "f^(n)(x) = (-1)^n · n!/(1+x)^(n+1) → f^(n)(0) = (-1)^n · n!. Chuỗi Taylor: ∑(n=0,∞) (-1)^n · x^n = 1 - x + x^2 - x^3 + ... Bán kính hội tụ R = lim |a_n/a_(n+1)| = 1. Miền hội tụ: -1 < x ≤ 1.",
      points: 4
    },
    {
      content: "Tính diện tích miền phẳng giới hạn bởi các đường y = x^2 và y = 2x. Vẽ phác họa miền và trình bày phương pháp tính.",
      explanation: "Giao điểm: x^2 = 2x → x(x-2) = 0 → x = 0, x = 2. Trên [0,2]: 2x ≥ x^2. S = ∫₀^2 (2x - x^2) dx = [x^2 - x^3/3]₀^2 = 4 - 8/3 = 4/3.",
      points: 3
    }
  ] as Essay[]
};

export const matQ2 = {
  mcqs: [
    {
      content: "Tính lim(x→0) tan(x)/x",
      options: ["0", "1", "∞", "-1"],
      correct: 1,
      explanation: "lim(x→0) tan(x)/x = lim sin(x)/(x·cos(x)) = 1·1 = 1"
    },
    {
      content: "Đạo hàm của f(x) = sin(x^2) là:",
      options: ["cos(x^2)", "2x·cos(x^2)", "2x·sin(x^2)", "x^2·cos(x^2)"],
      correct: 1,
      explanation: "Quy tắc chuỗi: f'(x) = cos(x^2)·2x = 2x·cos(x^2)"
    },
    {
      content: "Tính ∫ cos^2(x) dx",
      options: ["x/2 + sin(2x)/4 + C", "sin^2(x)/2 + C", "cos(x)·sin(x) + C", "x/2 - sin(2x)/4 + C"],
      correct: 0,
      explanation: "cos^2(x) = (1 + cos(2x))/2 → ∫ = x/2 + sin(2x)/4 + C"
    },
    {
      content: "Giới hạn lim(n→∞) (n!)^(1/n) bằng:",
      options: ["1", "e", "∞", "0"],
      correct: 2,
      explanation: "Theo công thức Stirling: n! ≈ (n/e)^n·√(2πn), nên (n!)^(1/n) ≈ n/e → ∞"
    },
    {
      content: "Đạo hàm của f(x) = ln|sin(x)| là:",
      options: ["1/sin(x)", "cos(x)/sin(x)", "-sin(x)/cos(x)", "1/cos(x)"],
      correct: 1,
      explanation: "f'(x) = cos(x)/sin(x) = cot(x)"
    },
    {
      content: "Tính ∫₀^(π/2) cos(x) dx",
      options: ["0", "1", "π/2", "-1"],
      correct: 1,
      explanation: "∫₀^(π/2) cos(x) dx = [sin(x)]₀^(π/2) = sin(π/2) - sin(0) = 1"
    },
    {
      content: "Chuỗi ∑(n=1,∞) (-1)^n/n (chuỗi Leibniz) hội tụ về:",
      options: ["-ln(2)", "ln(2)", "1", "Phân kỳ"],
      correct: 0,
      explanation: "∑(n=1,∞) (-1)^n/n = -ln(2) (khai triển Taylor của ln(1+x) tại x=1 với dấu xen kẽ)"
    },
    {
      content: "Nghiệm tổng quát của phương trình vi phân y' = y/x là:",
      options: ["y = C·x", "y = C/x", "y = C·e^x", "y = C·ln(x)"],
      correct: 0,
      explanation: "dy/y = dx/x → ln|y| = ln|x| + C₁ → y = C·x"
    },
    {
      content: "Đạo hàm riêng ∂f/∂y của f(x,y) = e^(xy) là:",
      options: ["y·e^(xy)", "x·e^(xy)", "e^(xy)", "xy·e^(xy)"],
      correct: 1,
      explanation: "∂f/∂y = x·e^(xy), coi x là hằng số khi đạo hàm theo y"
    },
    {
      content: "Khai triển Maclaurin của cos(x) là:",
      options: ["1 - x^2/2! + x^4/4! - ...", "x - x^3/3! + x^5/5! - ...", "1 + x^2/2! + x^4/4! + ...", "1 - x + x^2/2 - ..."],
      correct: 0,
      explanation: "cos(x) = ∑(n=0,∞) (-1)^n · x^(2n)/(2n)! = 1 - x^2/2! + x^4/4! - ..."
    },
    {
      content: "Áp dụng L'Hôpital, tính lim(x→∞) ln(x)/x",
      options: ["0", "1", "∞", "e"],
      correct: 0,
      explanation: "Dạng ∞/∞, L'Hôpital: lim (1/x)/1 = lim 1/x = 0"
    },
    {
      content: "Tính ∫ e^x·sin(x) dx",
      options: [
        "e^x(sin(x) - cos(x))/2 + C",
        "e^x(sin(x) + cos(x))/2 + C",
        "e^x·sin(x) + C",
        "-e^x·cos(x) + C"
      ],
      correct: 0,
      explanation: "Tích phân từng phần hai lần rồi giải phương trình: I = e^x(sin(x) - cos(x))/2 + C"
    },
    {
      content: "Hàm f(x) = x^4 - 4x^3 có điểm uốn tại:",
      options: ["x = 0 và x = 2", "x = 0 và x = 3", "x = 3", "x = 0"],
      correct: 0,
      explanation: "f''(x) = 12x^2 - 24x = 12x(x-2) = 0 → x = 0, x = 2. Kiểm tra đổi dấu → cả hai là điểm uốn"
    },
    {
      content: "Tích phân ∫ dx/(x^2 + 4) bằng:",
      options: ["(1/2)·arctan(x/2) + C", "arctan(x/2) + C", "ln(x^2+4) + C", "(1/4)·arctan(x) + C"],
      correct: 0,
      explanation: "∫ dx/(x^2+a^2) = (1/a)·arctan(x/a) + C, với a = 2: (1/2)·arctan(x/2) + C"
    },
    {
      content: "Tích phân suy rộng ∫₁^∞ 1/x dx là:",
      options: ["1", "ln(2)", "Phân kỳ", "e"],
      correct: 2,
      explanation: "∫₁^∞ 1/x dx = [ln|x|]₁^∞ = ∞ - 0 = ∞, tích phân phân kỳ"
    },
    {
      content: "Dãy số a_n = (-1)^n/n là dãy:",
      options: ["Hội tụ về 0", "Phân kỳ", "Hội tụ về 1", "Hội tụ về -1"],
      correct: 0,
      explanation: "|a_n| = 1/n → 0, nên a_n → 0 (dãy bị kẹp giữa -1/n và 1/n)"
    },
    {
      content: "Đạo hàm của f(x) = (sin(x))^3 là:",
      options: ["3(sin(x))^2", "3(sin(x))^2·cos(x)", "3cos(x)", "(sin(x))^2·cos(x)"],
      correct: 1,
      explanation: "f'(x) = 3·sin^2(x)·cos(x) theo quy tắc chuỗi"
    },
    {
      content: "Tính lim(x→0+) x^x",
      options: ["0", "1", "e", "∞"],
      correct: 1,
      explanation: "ln(x^x) = x·ln(x) → 0 khi x→0+, nên x^x → e^0 = 1"
    },
    {
      content: "∫ x/(x^2+1) dx bằng:",
      options: ["ln(x^2+1)/2 + C", "arctan(x) + C", "x^2/(2(x^2+1)) + C", "ln(x^2+1) + C"],
      correct: 0,
      explanation: "Đặt u = x^2+1, du = 2x dx → ∫ = (1/2)ln|u| + C = ln(x^2+1)/2 + C"
    },
    {
      content: "Tiêu chuẩn Leibniz áp dụng cho chuỗi xen dấu ∑(-1)^n·a_n yêu cầu:",
      options: [
        "a_n > 0, a_n giảm, lim a_n = 0",
        "a_n > 0 và lim a_n = 0",
        "a_n giảm dần",
        "|a_n| < 1 với mọi n"
      ],
      correct: 0,
      explanation: "Tiêu chuẩn Leibniz: (1) a_n > 0, (2) a_n giảm dần (a_(n+1) ≤ a_n), (3) lim a_n = 0"
    },
    {
      content: "Nghiệm tổng quát của y'' - 4y = 0 là:",
      options: ["y = C₁·e^(2x) + C₂·e^(-2x)", "y = C₁·cos(2x) + C₂·sin(2x)", "y = (C₁ + C₂x)·e^(2x)", "y = C₁·e^(4x) + C₂"],
      correct: 0,
      explanation: "PT đặc trưng: r^2 - 4 = 0 → r = ±2 → y = C₁·e^(2x) + C₂·e^(-2x)"
    },
    {
      content: "Divergence (phân kỳ) của trường vectơ F = (x^2, y^2, z^2) là:",
      options: ["2x + 2y + 2z", "x^2 + y^2 + z^2", "6", "2(x + y + z)"],
      correct: 0,
      explanation: "div F = ∂F₁/∂x + ∂F₂/∂y + ∂F₃/∂z = 2x + 2y + 2z"
    },
    {
      content: "Khai triển Taylor của ln(1+x) tại x = 0 là:",
      options: ["x - x^2/2 + x^3/3 - x^4/4 + ...", "1 + x + x^2/2 + ...", "x + x^2/2 + x^3/3 + ...", "1 - x + x^2 - x^3 + ..."],
      correct: 0,
      explanation: "ln(1+x) = ∑(n=1,∞) (-1)^(n+1)·x^n/n = x - x^2/2 + x^3/3 - ..."
    },
    {
      content: "Tính lim(x→0) (arctan(x))/x",
      options: ["0", "1", "π/2", "∞"],
      correct: 1,
      explanation: "L'Hôpital hoặc Taylor: arctan(x) ≈ x khi x→0, nên giới hạn = 1"
    },
    {
      content: "Đạo hàm của f(x) = tan(x) là:",
      options: ["1/cos(x)", "1/cos^2(x)", "sec(x)·tan(x)", "-1/sin^2(x)"],
      correct: 1,
      explanation: "d/dx[tan(x)] = sec^2(x) = 1/cos^2(x)"
    },
    {
      content: "Tính ∫ ln(x) dx",
      options: ["x·ln(x) - x + C", "1/x + C", "x·ln(x) + C", "x·ln(x) + x + C"],
      correct: 0,
      explanation: "Tích phân từng phần: u = ln(x), dv = dx → ∫ ln(x)dx = x·ln(x) - x + C"
    },
    {
      content: "Chuỗi ∑(n=0,∞) (-1)^n·x^(2n)/(2n)! là khai triển của:",
      options: ["sin(x)", "cos(x)", "e^(-x)", "sinh(x)"],
      correct: 1,
      explanation: "cos(x) = ∑(n=0,∞) (-1)^n·x^(2n)/(2n)!"
    },
    {
      content: "Tính đạo hàm của f(x) = e^(sin(x))",
      options: ["e^(sin(x))·sin(x)", "e^(sin(x))·cos(x)", "cos(x)·e^x", "sin(x)·e^(cos(x))"],
      correct: 1,
      explanation: "f'(x) = e^(sin(x))·cos(x) theo quy tắc chuỗi"
    },
    {
      content: "Phương trình vi phân y' = x^2 có nghiệm tổng quát:",
      options: ["y = x^3/3 + C", "y = 2x + C", "y = x^3 + C", "y = x^2/2 + C"],
      correct: 0,
      explanation: "y = ∫ x^2 dx = x^3/3 + C"
    },
    {
      content: "Tính ∫₋₁^1 x^3 dx",
      options: ["0", "1/4", "2/4", "1"],
      correct: 0,
      explanation: "x^3 là hàm lẻ, tích phân trên đoạn đối xứng [-1,1] bằng 0"
    },
    {
      content: "Hàm f(x) = e^(-x^2) có đạo hàm là:",
      options: ["-2x·e^(-x^2)", "2x·e^(-x^2)", "-e^(-x^2)", "e^(-x^2)/(-2x)"],
      correct: 0,
      explanation: "f'(x) = e^(-x^2)·(-2x) = -2x·e^(-x^2)"
    },
    {
      content: "Tích phân ∫ sec^2(x) dx bằng:",
      options: ["tan(x) + C", "sec(x) + C", "sin(x)/cos^2(x) + C", "2sec(x)·tan(x) + C"],
      correct: 0,
      explanation: "∫ sec^2(x) dx = tan(x) + C (vì d/dx[tan(x)] = sec^2(x))"
    },
    {
      content: "Laplacian ∇²f của f(x,y) = x^2 + y^2 là:",
      options: ["2", "4", "2x + 2y", "0"],
      correct: 1,
      explanation: "∇²f = ∂²f/∂x² + ∂²f/∂y² = 2 + 2 = 4"
    },
    {
      content: "Bán kính hội tụ của chuỗi ∑(n=1,∞) x^n/n là:",
      options: ["0", "1", "e", "∞"],
      correct: 1,
      explanation: "Tiêu chuẩn D'Alembert: lim |a_(n+1)/a_n| = |x|·n/(n+1) → |x|. Hội tụ khi |x| < 1, R = 1"
    },
    {
      content: "Tính lim(x→0) (e^x - 1 - x)/x^2",
      options: ["0", "1/2", "1", "2"],
      correct: 1,
      explanation: "L'Hôpital: lim (e^x - 1)/(2x) = lim e^x/2 = 1/2. Hoặc Taylor: e^x = 1 + x + x^2/2 + ..."
    },
    {
      content: "Đạo hàm của hàm ngược: nếu y = arcsin(x) thì dy/dx =",
      options: ["1/√(1-x^2)", "-1/√(1-x^2)", "1/√(x^2-1)", "√(1-x^2)"],
      correct: 0,
      explanation: "d/dx[arcsin(x)] = 1/√(1-x^2), |x| < 1"
    },
    {
      content: "Tính ∫₀^1 1/(1+x^2) dx",
      options: ["π/4", "π/2", "1", "ln(2)"],
      correct: 0,
      explanation: "∫₀^1 1/(1+x^2) dx = [arctan(x)]₀^1 = arctan(1) - arctan(0) = π/4"
    },
    {
      content: "Ma trận Hessian của f(x,y) = x^3 + y^3 - 3xy tại (1,1) là:",
      options: [
        "[[6, -3], [-3, 6]]",
        "[[3, -3], [-3, 3]]",
        "[[6, 0], [0, 6]]",
        "[[0, -3], [-3, 0]]"
      ],
      correct: 0,
      explanation: "f_xx = 6x = 6, f_yy = 6y = 6, f_xy = -3 tại (1,1). H = [[6,-3],[-3,6]]"
    },
    {
      content: "Tính ∫ x·sin(x) dx",
      options: ["-x·cos(x) + sin(x) + C", "x·cos(x) - sin(x) + C", "-x·cos(x) - sin(x) + C", "x·cos(x) + sin(x) + C"],
      correct: 0,
      explanation: "Tích phân từng phần: u = x, dv = sin(x)dx → I = -x·cos(x) + ∫cos(x)dx = -x·cos(x) + sin(x) + C"
    },
    {
      content: "Điều kiện đủ để điểm dừng (a,b) là cực tiểu của f(x,y): D = f_xx·f_yy - (f_xy)^2 > 0 và:",
      options: ["f_xx(a,b) > 0", "f_xx(a,b) < 0", "f_xy(a,b) = 0", "f_xx(a,b) = f_yy(a,b)"],
      correct: 0,
      explanation: "D > 0 và f_xx > 0 → cực tiểu. D > 0 và f_xx < 0 → cực đại."
    }
  ] as MCQ[],
  essays: [
    {
      content: "Tính tích phân ∫₀^∞ x·e^(-x) dx. Chứng minh tích phân hội tụ và tính giá trị chính xác bằng tích phân từng phần.",
      explanation: "Tích phân từng phần: u = x, dv = e^(-x)dx. I = [-x·e^(-x)]₀^∞ + ∫₀^∞ e^(-x) dx = 0 + [-e^(-x)]₀^∞ = 0 - (-1) = 1. Tích phân hội tụ và bằng 1.",
      points: 3
    },
    {
      content: "Tìm khai triển Taylor của hàm f(x) = e^x·sin(x) đến bậc 4 tại x = 0. Sử dụng phép nhân hai chuỗi Taylor.",
      explanation: "e^x = 1 + x + x^2/2 + x^3/6 + x^4/24 + ... ; sin(x) = x - x^3/6 + ... Nhân lại: f(x) = x + x^2 + x^3/3 - x^5/30 + ... Đến bậc 4: x + x^2 + x^3/3 - x^4/6 (cần nhân cẩn thận từng bậc).",
      points: 4
    },
    {
      content: "Giải phương trình vi phân y'' + 2y' + 5y = 0 với y(0) = 1, y'(0) = -1. Trình bày nghiệm dưới dạng hàm mũ-lượng giác.",
      explanation: "PT đặc trưng: r^2 + 2r + 5 = 0 → r = -1 ± 2i. Nghiệm: y = e^(-x)(C₁·cos(2x) + C₂·sin(2x)). Từ y(0) = 1: C₁ = 1. y' = e^(-x)[(-C₁+2C₂)cos(2x) + (-C₂-2C₁)sin(2x)]. y'(0) = -1: -C₁ + 2C₂ = -1 → C₂ = 0. Nghiệm: y = e^(-x)·cos(2x).",
      points: 4
    },
    {
      content: "Tính diện tích mặt tròn xoay sinh ra khi quay đường cong y = √x, 0 ≤ x ≤ 1 quanh trục Ox. Trình bày công thức và tính toán.",
      explanation: "S = 2π ∫₀^1 y·√(1 + (y')^2) dx. y' = 1/(2√x). S = 2π ∫₀^1 √x·√(1 + 1/(4x)) dx = 2π ∫₀^1 √(x + 1/4) dx = 2π·[(x+1/4)^(3/2)·(2/3)]₀^1 = 2π·(2/3)·[(5/4)^(3/2) - (1/4)^(3/2)] = π/6·(5√5 - 1).",
      points: 5
    },
    {
      content: "Khảo sát sự hội tụ tuyệt đối và hội tụ có điều kiện của chuỗi ∑(n=1,∞) (-1)^(n+1)/(n + sin(n)). Trình bày đầy đủ lập luận.",
      explanation: "Vì n + sin(n) ≥ n - 1 > n/2 với n ≥ 2 nên 1/(n+sin(n)) ≤ 2/n. Chuỗi |a_n| ~ 1/n phân kỳ (so sánh với chuỗi điều hòa). Tuy nhiên chuỗi xen dấu hội tụ theo tiêu chuẩn Leibniz vì 1/(n+sin(n)) giảm về 0. Vậy chuỗi hội tụ có điều kiện nhưng không hội tụ tuyệt đối.",
      points: 4
    },
    {
      content: "Tìm cực trị có điều kiện của f(x,y) = xy với ràng buộc x^2 + y^2 = 1 bằng phương pháp nhân tử Lagrange.",
      explanation: "L = xy - λ(x^2 + y^2 - 1). ∂L/∂x = y - 2λx = 0, ∂L/∂y = x - 2λy = 0, x^2 + y^2 = 1. Từ 2 PT đầu: y = 2λx, x = 2λy → x = 4λ²x → λ = ±1/2. Khi λ = 1/2: y = x, x^2 + x^2 = 1 → x = ±1/√2. f = 1/2 (max). Khi λ = -1/2: y = -x → f = -1/2 (min).",
      points: 4
    },
    {
      content: "Tính tích phân đường ∫_C (x^2 + y^2) ds, trong đó C là đường tròn x^2 + y^2 = R^2 (đi ngược chiều kim đồng hồ). Trình bày tham số hóa và tính toán.",
      explanation: "Tham số hóa: x = R·cos(t), y = R·sin(t), t ∈ [0, 2π]. ds = R·dt. x^2 + y^2 = R^2. I = ∫₀^(2π) R^2·R dt = R^3·2π = 2πR^3.",
      points: 3
    },
    {
      content: "Chứng minh rằng chuỗi ∑(n=1,∞) 1/n^p hội tụ khi p > 1 và phân kỳ khi p ≤ 1 bằng tiêu chuẩn tích phân.",
      explanation: "Xét ∫₁^∞ 1/x^p dx. Khi p ≠ 1: = [x^(1-p)/(1-p)]₁^∞. Nếu p > 1: 1-p < 0 nên x^(1-p) → 0 khi x→∞, tích phân = 1/(p-1) hội tụ. Nếu p < 1: 1-p > 0 nên x^(1-p) → ∞, phân kỳ. Khi p = 1: ∫ 1/x dx = ln(x) → ∞, phân kỳ. Theo tiêu chuẩn tích phân, chuỗi có cùng tính chất.",
      points: 5
    },
    {
      content: "Tính tích phân kép ∬_D xy dxdy, trong đó D là tam giác với đỉnh (0,0), (1,0), (0,1). Viết giới hạn tích phân và tính toán.",
      explanation: "D: 0 ≤ x ≤ 1, 0 ≤ y ≤ 1-x. I = ∫₀^1 ∫₀^(1-x) xy dy dx = ∫₀^1 x·[y^2/2]₀^(1-x) dx = ∫₀^1 x(1-x)^2/2 dx = (1/2)∫₀^1 (x - 2x^2 + x^3) dx = (1/2)[x^2/2 - 2x^3/3 + x^4/4]₀^1 = (1/2)(1/2 - 2/3 + 1/4) = (1/2)(1/12) = 1/24.",
      points: 3
    },
    {
      content: "Giải phương trình vi phân y' + 2xy = x bằng phương pháp thừa số tích phân. Tìm nghiệm tổng quát và nghiệm riêng thỏa y(0) = 0.",
      explanation: "Thừa số tích phân: μ = e^(∫2x dx) = e^(x^2). Nhân hai vế: (y·e^(x^2))' = x·e^(x^2). Tích phân: y·e^(x^2) = ∫ x·e^(x^2) dx = e^(x^2)/2 + C. Nghiệm tổng quát: y = 1/2 + C·e^(-x^2). Với y(0) = 0: 0 = 1/2 + C → C = -1/2. Nghiệm riêng: y = (1 - e^(-x^2))/2.",
      points: 4
    }
  ] as Essay[]
};
