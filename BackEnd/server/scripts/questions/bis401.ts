type MCQ = { content: string; options: string[]; correct: number; explanation?: string };
type Essay = { content: string; explanation?: string; points?: number };

export const bisQ1 = {
  mcqs: [
    {
      content: 'ERP là viết tắt của cụm từ nào sau đây?',
      options: [
        'Enterprise Resource Planning',
        'Electronic Resource Processing',
        'Enterprise Requirement Protocol',
        'Electronic Reporting Platform'
      ],
      correct: 0,
      explanation: 'ERP (Enterprise Resource Planning) là hệ thống hoạch định nguồn lực doanh nghiệp.'
    },
    {
      content: 'Module nào sau đây KHÔNG thuộc hệ thống SAP ERP tiêu chuẩn?',
      options: [
        'SAP FI (Financial Accounting)',
        'SAP MM (Materials Management)',
        'SAP GX (Game Experience)',
        'SAP HR (Human Resources)'
      ],
      correct: 2,
      explanation: 'SAP GX không tồn tại. Các module chính của SAP gồm FI, CO, MM, SD, HR, PP, PM, QM.'
    },
    {
      content: 'Hệ thống CRM chủ yếu hỗ trợ doanh nghiệp trong lĩnh vực nào?',
      options: [
        'Quản lý chuỗi cung ứng',
        'Quản lý quan hệ khách hàng',
        'Quản lý nhân sự',
        'Quản lý tài chính'
      ],
      correct: 1,
      explanation: 'CRM (Customer Relationship Management) tập trung vào quản lý quan hệ khách hàng.'
    },
    {
      content: 'Trong mô hình điện toán đám mây, SaaS là viết tắt của?',
      options: [
        'Software as a Service',
        'System as a Solution',
        'Storage as a Service',
        'Security as a Standard'
      ],
      correct: 0,
      explanation: 'SaaS (Software as a Service) là mô hình cung cấp phần mềm dưới dạng dịch vụ qua Internet.'
    },
    {
      content: 'Data Warehouse khác với cơ sở dữ liệu truyền thống ở điểm nào?',
      options: [
        'Chỉ lưu trữ dữ liệu văn bản',
        'Được tối ưu cho phân tích và truy vấn phức tạp trên dữ liệu lịch sử',
        'Không hỗ trợ SQL',
        'Chỉ hoạt động trên hệ điều hành Windows'
      ],
      correct: 1,
      explanation: 'Data Warehouse được thiết kế cho phân tích OLAP, lưu trữ dữ liệu lịch sử từ nhiều nguồn khác nhau.'
    },
    {
      content: 'COBIT là framework quản trị CNTT được phát triển bởi tổ chức nào?',
      options: [
        'IEEE',
        'ISACA',
        'ISO',
        'NIST'
      ],
      correct: 1,
      explanation: 'COBIT được phát triển bởi ISACA (Information Systems Audit and Control Association).'
    },
    {
      content: 'Trong SCM (Supply Chain Management), khái niệm "Bullwhip Effect" đề cập đến?',
      options: [
        'Hiệu ứng tăng biến động đơn hàng khi đi ngược chuỗi cung ứng',
        'Việc giảm giá thành sản phẩm',
        'Tăng tốc độ giao hàng',
        'Giảm số lượng nhà cung cấp'
      ],
      correct: 0,
      explanation: 'Bullwhip Effect là hiện tượng biến động đơn hàng tăng dần khi thông tin di chuyển ngược từ khách hàng lên nhà cung cấp.'
    },
    {
      content: 'Business Intelligence (BI) bao gồm thành phần nào sau đây?',
      options: [
        'Chỉ báo cáo tĩnh (static reports)',
        'ETL, Data Warehouse, OLAP, Reporting và Dashboard',
        'Chỉ cơ sở dữ liệu quan hệ',
        'Chỉ phần mềm kế toán'
      ],
      correct: 1,
      explanation: 'BI là tập hợp các công cụ và quy trình gồm ETL, kho dữ liệu, phân tích OLAP, và trực quan hóa dữ liệu.'
    },
    {
      content: 'Trong ITIL, "Service Desk" thuộc giai đoạn nào của vòng đời dịch vụ?',
      options: [
        'Service Strategy',
        'Service Design',
        'Service Operation',
        'Service Transition'
      ],
      correct: 2,
      explanation: 'Service Desk là chức năng thuộc giai đoạn Service Operation trong ITIL.'
    },
    {
      content: 'Mô hình B2B trong thương mại điện tử đề cập đến giao dịch giữa?',
      options: [
        'Doanh nghiệp với người tiêu dùng',
        'Doanh nghiệp với doanh nghiệp',
        'Người tiêu dùng với người tiêu dùng',
        'Chính phủ với doanh nghiệp'
      ],
      correct: 1,
      explanation: 'B2B (Business-to-Business) là mô hình giao dịch thương mại điện tử giữa các doanh nghiệp.'
    },
    {
      content: 'Chuyển đổi số (Digital Transformation) khác với tin học hóa (Digitization) ở điểm nào?',
      options: [
        'Chuyển đổi số chỉ là việc scan tài liệu giấy',
        'Chuyển đổi số thay đổi toàn diện mô hình kinh doanh và văn hóa tổ chức nhờ công nghệ số',
        'Tin học hóa phức tạp hơn chuyển đổi số',
        'Chuyển đổi số không cần Internet'
      ],
      correct: 1,
      explanation: 'Chuyển đổi số là quá trình thay đổi toàn diện cách thức vận hành, mô hình kinh doanh nhờ công nghệ số, không chỉ đơn thuần là số hóa dữ liệu.'
    },
    {
      content: 'Hệ thống DSS (Decision Support System) hỗ trợ chủ yếu cho đối tượng nào trong doanh nghiệp?',
      options: [
        'Nhân viên vận hành',
        'Nhà quản lý cấp trung và cấp cao',
        'Khách hàng',
        'Nhà cung cấp'
      ],
      correct: 1,
      explanation: 'DSS được thiết kế để hỗ trợ ra quyết định cho các nhà quản lý ở cấp trung và cấp cao.'
    },
    {
      content: 'Trong quản lý dự án CNTT, phương pháp Agile khác với Waterfall ở điểm nào?',
      options: [
        'Agile không cần tài liệu',
        'Agile phát triển lặp, chia nhỏ dự án thành các sprint ngắn và thích ứng thay đổi',
        'Waterfall nhanh hơn Agile',
        'Agile không cần kiểm thử'
      ],
      correct: 1,
      explanation: 'Agile dựa trên phát triển lặp (iterative), chia dự án thành các sprint ngắn, cho phép thích ứng nhanh với thay đổi.'
    },
    {
      content: 'IaaS cung cấp cho người dùng tài nguyên nào?',
      options: [
        'Chỉ phần mềm ứng dụng',
        'Hạ tầng máy chủ, lưu trữ, mạng ảo hóa',
        'Chỉ nền tảng phát triển',
        'Chỉ dịch vụ email'
      ],
      correct: 1,
      explanation: 'IaaS (Infrastructure as a Service) cung cấp hạ tầng CNTT ảo hóa bao gồm máy chủ, lưu trữ, mạng.'
    },
    {
      content: 'Oracle EBS (E-Business Suite) là loại hệ thống nào?',
      options: [
        'Hệ điều hành',
        'Hệ thống ERP tích hợp',
        'Ngôn ngữ lập trình',
        'Công cụ thiết kế đồ họa'
      ],
      correct: 1,
      explanation: 'Oracle EBS là bộ ứng dụng ERP tích hợp của Oracle cho doanh nghiệp.'
    },
    {
      content: 'Trong Business Process Reengineering (BPR), nguyên tắc cốt lõi là gì?',
      options: [
        'Cải tiến nhỏ dần dần các quy trình hiện tại',
        'Thiết kế lại triệt để quy trình kinh doanh để đạt cải thiện đột phá',
        'Giữ nguyên quy trình và thêm nhân sự',
        'Chỉ tự động hóa quy trình hiện có mà không thay đổi'
      ],
      correct: 1,
      explanation: 'BPR nhấn mạnh việc thiết kế lại triệt để (radical redesign) quy trình kinh doanh để đạt cải thiện vượt bậc về chi phí, chất lượng, tốc độ.'
    },
    {
      content: 'MIS (Management Information System) cung cấp loại thông tin nào?',
      options: [
        'Thông tin tác nghiệp hàng ngày chi tiết',
        'Báo cáo tổng hợp, định kỳ phục vụ quản lý',
        'Dự báo chiến lược dài hạn',
        'Thông tin kỹ thuật về phần cứng'
      ],
      correct: 1,
      explanation: 'MIS cung cấp báo cáo tổng hợp, định kỳ từ dữ liệu giao dịch để hỗ trợ quản lý cấp trung.'
    },
    {
      content: 'Trong an ninh mạng doanh nghiệp, nguyên tắc "Defense in Depth" nghĩa là?',
      options: [
        'Chỉ sử dụng một tường lửa mạnh nhất',
        'Triển khai nhiều lớp bảo mật chồng chéo nhau',
        'Không kết nối Internet',
        'Mã hóa toàn bộ dữ liệu bằng một thuật toán duy nhất'
      ],
      correct: 1,
      explanation: 'Defense in Depth là chiến lược bảo mật sử dụng nhiều lớp phòng thủ chồng chéo để bảo vệ hệ thống.'
    },
    {
      content: 'PaaS cung cấp cho lập trình viên những gì?',
      options: [
        'Chỉ máy chủ vật lý',
        'Nền tảng phát triển bao gồm runtime, middleware, và công cụ phát triển',
        'Chỉ phần mềm hoàn chỉnh để sử dụng',
        'Chỉ dịch vụ lưu trữ file'
      ],
      correct: 1,
      explanation: 'PaaS (Platform as a Service) cung cấp nền tảng phát triển với runtime, middleware, database, và công cụ phát triển.'
    },
    {
      content: 'ETL trong Business Intelligence là viết tắt của?',
      options: [
        'Extract, Transform, Load',
        'Encrypt, Transfer, Lock',
        'Evaluate, Test, Launch',
        'Export, Translate, Link'
      ],
      correct: 0,
      explanation: 'ETL (Extract, Transform, Load) là quy trình trích xuất, biến đổi và nạp dữ liệu vào Data Warehouse.'
    },
    {
      content: 'Trong thương mại điện tử, "Payment Gateway" có chức năng gì?',
      options: [
        'Thiết kế giao diện website',
        'Xử lý và xác thực giao dịch thanh toán trực tuyến',
        'Quản lý kho hàng',
        'Tối ưu SEO'
      ],
      correct: 1,
      explanation: 'Payment Gateway là cổng thanh toán xử lý, mã hóa và xác thực giao dịch thanh toán trực tuyến giữa khách hàng và ngân hàng.'
    },
    {
      content: 'KPI trong quản lý doanh nghiệp là viết tắt của?',
      options: [
        'Key Performance Indicator',
        'Knowledge Process Integration',
        'Key Project Initiative',
        'Knowledge Performance Index'
      ],
      correct: 0,
      explanation: 'KPI (Key Performance Indicator) là chỉ số đo lường hiệu suất chính của tổ chức.'
    },
    {
      content: 'OLAP cube cho phép phân tích dữ liệu theo bao nhiêu chiều?',
      options: [
        'Chỉ 2 chiều',
        'Nhiều chiều (multidimensional)',
        'Chỉ 1 chiều',
        'Chỉ 3 chiều cố định'
      ],
      correct: 1,
      explanation: 'OLAP cube hỗ trợ phân tích đa chiều (multidimensional), cho phép người dùng xem dữ liệu từ nhiều góc độ khác nhau.'
    },
    {
      content: 'Trong quản trị CNTT, ITIL v4 tập trung vào khái niệm nào?',
      options: [
        'Chỉ quản lý sự cố',
        'Hệ thống giá trị dịch vụ (Service Value System)',
        'Chỉ quản lý phần cứng',
        'Chỉ phát triển phần mềm'
      ],
      correct: 1,
      explanation: 'ITIL v4 tập trung vào Service Value System (SVS) bao gồm chuỗi giá trị dịch vụ, các nguyên tắc hướng dẫn, quản trị, và cải tiến liên tục.'
    },
    {
      content: 'Cloud computing có đặc điểm nào sau đây theo NIST?',
      options: [
        'Yêu cầu cài đặt phần cứng tại chỗ',
        'Tự phục vụ theo nhu cầu, truy cập mạng rộng, gom nhóm tài nguyên, co giãn nhanh, đo lường dịch vụ',
        'Không cần kết nối Internet',
        'Chỉ dành cho doanh nghiệp lớn'
      ],
      correct: 1,
      explanation: 'NIST định nghĩa 5 đặc điểm của Cloud: on-demand self-service, broad network access, resource pooling, rapid elasticity, measured service.'
    },
    {
      content: 'Trong CRM, "Customer Lifetime Value" (CLV) đo lường điều gì?',
      options: [
        'Số lần khách hàng phàn nàn',
        'Tổng giá trị lợi nhuận ròng mà một khách hàng mang lại trong suốt vòng đời',
        'Tuổi của khách hàng',
        'Số lượng sản phẩm khách hàng mua trong một lần'
      ],
      correct: 1,
      explanation: 'CLV là tổng giá trị lợi nhuận ròng dự kiến mà doanh nghiệp thu được từ một khách hàng trong toàn bộ thời gian quan hệ.'
    },
    {
      content: 'Hệ thống TPS (Transaction Processing System) xử lý loại dữ liệu nào?',
      options: [
        'Dữ liệu chiến lược dài hạn',
        'Giao dịch hàng ngày của doanh nghiệp ở mức tác nghiệp',
        'Chỉ dữ liệu tài chính',
        'Chỉ dữ liệu khách hàng VIP'
      ],
      correct: 1,
      explanation: 'TPS xử lý các giao dịch tác nghiệp hàng ngày như bán hàng, nhập kho, thanh toán, đặt hàng.'
    },
    {
      content: 'Trong IT Governance, mục tiêu chính của COBIT 2019 là gì?',
      options: [
        'Chỉ kiểm toán hệ thống',
        'Cung cấp framework quản trị và quản lý CNTT doanh nghiệp toàn diện',
        'Chỉ phát triển phần mềm',
        'Chỉ bảo mật mạng'
      ],
      correct: 1,
      explanation: 'COBIT 2019 cung cấp framework toàn diện cho quản trị và quản lý CNTT doanh nghiệp, liên kết mục tiêu CNTT với mục tiêu kinh doanh.'
    },
    {
      content: 'Trong E-commerce, "Conversion Rate" đo lường điều gì?',
      options: [
        'Tốc độ tải trang web',
        'Tỷ lệ khách truy cập thực hiện hành động mong muốn (mua hàng, đăng ký)',
        'Số lượng sản phẩm trên website',
        'Dung lượng lưu trữ của server'
      ],
      correct: 1,
      explanation: 'Conversion Rate là tỷ lệ phần trăm khách truy cập website thực hiện hành động mục tiêu (mua hàng, đăng ký, tải xuống).'
    },
    {
      content: 'Phương pháp Balanced Scorecard đánh giá doanh nghiệp theo mấy khía cạnh?',
      options: [
        '2 khía cạnh',
        '4 khía cạnh: Tài chính, Khách hàng, Quy trình nội bộ, Học hỏi & Phát triển',
        '6 khía cạnh',
        '1 khía cạnh (chỉ tài chính)'
      ],
      correct: 1,
      explanation: 'Balanced Scorecard của Kaplan & Norton đánh giá theo 4 góc nhìn: Financial, Customer, Internal Process, Learning & Growth.'
    },
    {
      content: 'Trong SCM, hệ thống JIT (Just-In-Time) nhằm mục đích gì?',
      options: [
        'Tích trữ nhiều hàng tồn kho nhất có thể',
        'Giảm thiểu hàng tồn kho bằng cách sản xuất/cung ứng đúng lúc cần',
        'Tăng thời gian giao hàng',
        'Loại bỏ hoàn toàn nhà cung cấp'
      ],
      correct: 1,
      explanation: 'JIT là triết lý sản xuất nhằm giảm tồn kho, lãng phí bằng cách cung ứng nguyên vật liệu đúng số lượng, đúng thời điểm cần.'
    },
    {
      content: 'Ransomware là loại mã độc hoạt động theo cơ chế nào?',
      options: [
        'Xóa toàn bộ dữ liệu vĩnh viễn',
        'Mã hóa dữ liệu nạn nhân và đòi tiền chuộc để giải mã',
        'Chỉ theo dõi hoạt động bàn phím',
        'Tự nhân bản qua email mà không gây hại'
      ],
      correct: 1,
      explanation: 'Ransomware mã hóa dữ liệu của nạn nhân và yêu cầu trả tiền chuộc (thường bằng cryptocurrency) để nhận khóa giải mã.'
    },
    {
      content: 'Data Mining trong BI được sử dụng để?',
      options: [
        'Xóa dữ liệu cũ',
        'Khám phá mẫu (pattern) và tri thức ẩn từ tập dữ liệu lớn',
        'Nhập dữ liệu thủ công',
        'Sao lưu cơ sở dữ liệu'
      ],
      correct: 1,
      explanation: 'Data Mining sử dụng các thuật toán thống kê, machine learning để khám phá mẫu, xu hướng, mối quan hệ ẩn trong dữ liệu lớn.'
    },
    {
      content: 'Trong quản lý dự án CNTT, "Scope Creep" đề cập đến?',
      options: [
        'Việc giảm phạm vi dự án',
        'Việc phạm vi dự án mở rộng không kiểm soát so với kế hoạch ban đầu',
        'Việc hoàn thành dự án trước thời hạn',
        'Việc giảm ngân sách dự án'
      ],
      correct: 1,
      explanation: 'Scope Creep là hiện tượng phạm vi dự án mở rộng dần mà không có sự kiểm soát chính thức, thường dẫn đến trễ hạn và vượt ngân sách.'
    },
    {
      content: 'Hệ thống EIS (Executive Information System) phục vụ đối tượng nào?',
      options: [
        'Nhân viên kỹ thuật IT',
        'Lãnh đạo cấp cao (CEO, CFO, CTO)',
        'Khách hàng cuối',
        'Nhân viên bảo vệ'
      ],
      correct: 1,
      explanation: 'EIS cung cấp thông tin tổng hợp, trực quan dưới dạng dashboard để hỗ trợ lãnh đạo cấp cao ra quyết định chiến lược.'
    },
    {
      content: 'Trong Cloud Computing, mô hình "Hybrid Cloud" kết hợp?',
      options: [
        'Chỉ Public Cloud',
        'Public Cloud và Private Cloud',
        'Chỉ Private Cloud',
        'Không dùng Cloud nào'
      ],
      correct: 1,
      explanation: 'Hybrid Cloud kết hợp Public Cloud và Private Cloud, cho phép doanh nghiệp linh hoạt di chuyển workload giữa hai môi trường.'
    },
    {
      content: 'Trong SAP, module CO (Controlling) có chức năng gì?',
      options: [
        'Quản lý nhân sự',
        'Kế toán quản trị và kiểm soát chi phí nội bộ',
        'Quản lý bán hàng',
        'Quản lý sản xuất'
      ],
      correct: 1,
      explanation: 'SAP CO (Controlling) phục vụ kế toán quản trị, kiểm soát chi phí nội bộ, phân bổ chi phí, và lập kế hoạch ngân sách.'
    },
    {
      content: 'Nguyên tắc CIA trong an ninh thông tin bao gồm?',
      options: [
        'Cost, Integration, Automation',
        'Confidentiality, Integrity, Availability',
        'Cloud, Internet, Application',
        'Control, Implement, Analyze'
      ],
      correct: 1,
      explanation: 'CIA Triad gồm Confidentiality (Bảo mật), Integrity (Toàn vẹn), Availability (Sẵn sàng) - ba trụ cột của an ninh thông tin.'
    },
    {
      content: 'Trong Digital Transformation, khái niệm "Data-Driven Decision Making" nghĩa là?',
      options: [
        'Ra quyết định dựa trên cảm tính',
        'Ra quyết định dựa trên phân tích dữ liệu thực tế',
        'Chỉ thu thập dữ liệu mà không phân tích',
        'Xóa toàn bộ dữ liệu cũ trước khi quyết định'
      ],
      correct: 1,
      explanation: 'Data-Driven Decision Making là phương pháp ra quyết định dựa trên phân tích dữ liệu thực tế thay vì trực giác hay kinh nghiệm chủ quan.'
    },
    {
      content: 'Trong E-commerce, mô hình C2C (Consumer-to-Consumer) có ví dụ nào?',
      options: [
        'Amazon bán hàng cho doanh nghiệp',
        'Người dùng bán hàng cho người dùng khác trên eBay, Chợ Tốt',
        'Chính phủ cung cấp dịch vụ cho doanh nghiệp',
        'Doanh nghiệp mua nguyên liệu từ nhà cung cấp'
      ],
      correct: 1,
      explanation: 'C2C là mô hình giao dịch giữa người tiêu dùng với nhau thông qua nền tảng trung gian như eBay, Chợ Tốt, Facebook Marketplace.'
    }
  ] as MCQ[],
  essays: [
    {
      content: 'Phân tích vai trò của hệ thống ERP trong việc tích hợp các quy trình kinh doanh của doanh nghiệp. Lấy ví dụ cụ thể với SAP ERP để minh họa cách các module liên kết với nhau.',
      explanation: 'Cần trình bày: khái niệm ERP, lợi ích tích hợp (loại bỏ silos dữ liệu, tăng hiệu quả), các module SAP chính và cách chúng liên kết (FI-CO, MM-PP, SD-FI), thách thức triển khai.',
      points: 4
    },
    {
      content: 'So sánh ba mô hình dịch vụ Cloud Computing: IaaS, PaaS và SaaS. Phân tích ưu nhược điểm của từng mô hình và đề xuất kịch bản ứng dụng phù hợp cho doanh nghiệp vừa và nhỏ tại Việt Nam.',
      explanation: 'Cần trình bày: định nghĩa từng mô hình, so sánh trách nhiệm quản lý, ưu nhược điểm, chi phí, ví dụ nhà cung cấp, và đề xuất phù hợp SME Việt Nam.',
      points: 5
    },
    {
      content: 'Trình bày quy trình triển khai chuyển đổi số cho một doanh nghiệp sản xuất truyền thống tại Việt Nam. Phân tích các thách thức và đề xuất giải pháp khắc phục.',
      explanation: 'Cần trình bày: đánh giá hiện trạng, xây dựng chiến lược, lộ trình triển khai, công nghệ áp dụng (IoT, AI, Cloud), thách thức (nhân lực, chi phí, văn hóa), giải pháp.',
      points: 5
    },
    {
      content: 'Phân tích tầm quan trọng của Business Intelligence trong việc hỗ trợ ra quyết định kinh doanh. Mô tả kiến trúc hệ thống BI và quy trình ETL.',
      explanation: 'Cần trình bày: khái niệm BI, kiến trúc (data sources, ETL, data warehouse, OLAP, reporting), quy trình ETL chi tiết, lợi ích cho ra quyết định, ví dụ thực tế.',
      points: 4
    },
    {
      content: 'Đánh giá vai trò của CRM trong việc nâng cao năng lực cạnh tranh của doanh nghiệp. Phân tích các loại CRM (Operational, Analytical, Collaborative) và lợi ích của từng loại.',
      explanation: 'Cần trình bày: khái niệm CRM, 3 loại CRM và chức năng, lợi ích cụ thể, metrics đánh giá (CLV, retention rate, satisfaction), ví dụ triển khai thành công.',
      points: 4
    },
    {
      content: 'Trình bày framework COBIT 2019 trong quản trị CNTT doanh nghiệp. So sánh COBIT với ITIL và phân tích cách hai framework bổ trợ cho nhau.',
      explanation: 'Cần trình bày: mục tiêu COBIT 2019, các nguyên tắc và thành phần, so sánh phạm vi COBIT (governance) vs ITIL (service management), cách kết hợp sử dụng.',
      points: 3
    },
    {
      content: 'Phân tích các mối đe dọa an ninh mạng phổ biến đối với doanh nghiệp hiện nay. Đề xuất chiến lược bảo mật toàn diện theo nguyên tắc Defense in Depth.',
      explanation: 'Cần trình bày: các loại mối đe dọa (ransomware, phishing, APT, insider threat), nguyên tắc Defense in Depth, các lớp bảo mật (physical, network, application, data), chính sách và đào tạo nhân viên.',
      points: 4
    },
    {
      content: 'Phân tích vai trò của SCM (Supply Chain Management) trong tối ưu hóa chuỗi cung ứng. Ứng dụng công nghệ thông tin (IoT, Blockchain, AI) giải quyết các thách thức của SCM hiện đại.',
      explanation: 'Cần trình bày: khái niệm SCM, các thành phần, thách thức (bullwhip effect, visibility), ứng dụng IoT (tracking), Blockchain (traceability), AI (demand forecasting).',
      points: 5
    },
    {
      content: 'Trình bày khái niệm Business Process Reengineering (BPR) và phân biệt với cải tiến liên tục (Continuous Improvement). Phân tích các bước thực hiện BPR và rủi ro khi triển khai.',
      explanation: 'Cần trình bày: định nghĩa BPR (Hammer & Champy), so sánh BPR vs CI, các bước (identify, analyze, redesign, implement), yếu tố thành công, rủi ro và biện pháp giảm thiểu.',
      points: 3
    },
    {
      content: 'Đánh giá tác động của thương mại điện tử đến mô hình kinh doanh truyền thống tại Việt Nam. Phân tích các mô hình TMĐT phổ biến và xu hướng phát triển trong tương lai.',
      explanation: 'Cần trình bày: tác động đến kênh phân phối, giá cả, marketing, quan hệ khách hàng; các mô hình B2B, B2C, C2C, O2O; xu hướng (social commerce, live commerce, mobile-first); thách thức logistic và thanh toán.',
      points: 4
    }
  ] as Essay[]
};

export const bisQ2 = {
  mcqs: [
    {
      content: 'Hệ thống SAP S/4HANA khác với SAP ECC truyền thống ở điểm nào?',
      options: [
        'S/4HANA chạy trên cơ sở dữ liệu in-memory HANA, đơn giản hóa mô hình dữ liệu',
        'S/4HANA chỉ hỗ trợ module tài chính',
        'SAP ECC nhanh hơn S/4HANA',
        'S/4HANA không hỗ trợ cloud'
      ],
      correct: 0,
      explanation: 'SAP S/4HANA chạy trên nền tảng in-memory database HANA, đơn giản hóa mô hình dữ liệu và cung cấp phân tích thời gian thực.'
    },
    {
      content: 'Trong CRM, "Sales Funnel" (Phễu bán hàng) mô tả điều gì?',
      options: [
        'Quy trình từ tiếp cận khách hàng tiềm năng đến chốt đơn hàng',
        'Cách bố trí cửa hàng vật lý',
        'Quy trình sản xuất sản phẩm',
        'Cách tính lương nhân viên bán hàng'
      ],
      correct: 0,
      explanation: 'Sales Funnel mô tả các giai đoạn khách hàng đi qua: Awareness → Interest → Consideration → Intent → Purchase.'
    },
    {
      content: 'Trong Data Warehousing, lược đồ Star Schema có cấu trúc như thế nào?',
      options: [
        'Một bảng Fact trung tâm kết nối với các bảng Dimension xung quanh',
        'Tất cả bảng nối với nhau thành chuỗi',
        'Chỉ có một bảng duy nhất',
        'Các bảng sắp xếp theo hình tròn'
      ],
      correct: 0,
      explanation: 'Star Schema gồm bảng Fact (chứa metrics) ở trung tâm, kết nối trực tiếp với các bảng Dimension (chứa mô tả).'
    },
    {
      content: 'Trong quản lý dự án CNTT, "Critical Path" là gì?',
      options: [
        'Chuỗi công việc dài nhất quyết định thời gian hoàn thành tối thiểu của dự án',
        'Con đường ngắn nhất hoàn thành dự án',
        'Danh sách các rủi ro quan trọng',
        'Đường đi của dữ liệu trong hệ thống'
      ],
      correct: 0,
      explanation: 'Critical Path là chuỗi các hoạt động phụ thuộc có tổng thời gian dài nhất, quyết định thời gian tối thiểu để hoàn thành dự án.'
    },
    {
      content: 'Multi-tenancy trong SaaS có nghĩa là?',
      options: [
        'Nhiều khách hàng chia sẻ cùng một instance phần mềm nhưng dữ liệu được cách ly',
        'Mỗi khách hàng có server riêng biệt',
        'Phần mềm chỉ phục vụ một khách hàng',
        'Khách hàng phải cài đặt phần mềm trên máy local'
      ],
      correct: 0,
      explanation: 'Multi-tenancy cho phép nhiều khách hàng (tenant) sử dụng chung hạ tầng và code base nhưng dữ liệu được phân tách logic.'
    },
    {
      content: 'Trong BI, Dashboard khác với Report truyền thống ở điểm nào?',
      options: [
        'Dashboard cung cấp thông tin trực quan, thời gian thực, tương tác được',
        'Dashboard chỉ hiển thị văn bản',
        'Report luôn cập nhật real-time còn Dashboard thì không',
        'Dashboard không thể chứa biểu đồ'
      ],
      correct: 0,
      explanation: 'Dashboard hiển thị KPIs dưới dạng đồ họa trực quan, cập nhật real-time hoặc gần real-time, cho phép drill-down tương tác.'
    },
    {
      content: 'Trong ITIL, "Change Management" nhằm mục đích gì?',
      options: [
        'Kiểm soát mọi thay đổi trong hệ thống IT để giảm thiểu rủi ro gián đoạn dịch vụ',
        'Thay đổi nhân sự trong phòng IT',
        'Đổi tên công ty',
        'Thay đổi nhà cung cấp phần cứng hàng năm'
      ],
      correct: 0,
      explanation: 'Change Management trong ITIL kiểm soát và quản lý mọi thay đổi đối với hạ tầng và dịch vụ IT để đảm bảo ổn định.'
    },
    {
      content: 'Phishing attack nhắm vào yếu tố nào trong doanh nghiệp?',
      options: [
        'Con người - lừa nhân viên cung cấp thông tin nhạy cảm qua email/website giả mạo',
        'Chỉ tấn công firewall',
        'Chỉ tấn công database',
        'Chỉ tấn công router mạng'
      ],
      correct: 0,
      explanation: 'Phishing khai thác yếu tố con người (social engineering), lừa nạn nhân click link giả mạo hoặc cung cấp credentials.'
    },
    {
      content: 'Trong Oracle Cloud ERP, module "Procurement Cloud" quản lý?',
      options: [
        'Quy trình mua sắm và quản lý nhà cung cấp',
        'Quản lý nhân sự',
        'Quản lý sản xuất',
        'Quản lý marketing'
      ],
      correct: 0,
      explanation: 'Oracle Procurement Cloud quản lý toàn bộ quy trình mua sắm: từ yêu cầu mua, đấu thầu, đặt hàng đến thanh toán nhà cung cấp.'
    },
    {
      content: 'Trong chuyển đổi số, khái niệm "Digital Twin" là gì?',
      options: [
        'Bản sao số của đối tượng/quy trình vật lý, cập nhật real-time từ dữ liệu cảm biến',
        'Bản sao lưu dữ liệu',
        'Hai server giống nhau',
        'Hai phiên bản phần mềm chạy song song'
      ],
      correct: 0,
      explanation: 'Digital Twin là bản sao ảo của đối tượng vật lý, được cập nhật liên tục từ dữ liệu cảm biến IoT để mô phỏng và dự đoán.'
    },
    {
      content: 'RPA (Robotic Process Automation) trong doanh nghiệp được sử dụng để?',
      options: [
        'Sản xuất robot công nghiệp',
        'Tự động hóa các tác vụ lặp đi lặp lại trên giao diện phần mềm bằng bot',
        'Thay thế toàn bộ nhân viên',
        'Chỉ quản lý email tự động'
      ],
      correct: 1,
      explanation: 'RPA sử dụng software bot để tự động hóa các tác vụ có quy tắc, lặp đi lặp lại trên giao diện ứng dụng mà không cần thay đổi hệ thống.'
    },
    {
      content: 'Trong SCM, khái niệm "Vendor Managed Inventory" (VMI) có nghĩa là?',
      options: [
        'Khách hàng tự quản lý kho',
        'Nhà cung cấp chịu trách nhiệm quản lý mức tồn kho tại kho khách hàng',
        'Không cần kho hàng',
        'Chỉ bán hàng trực tuyến'
      ],
      correct: 1,
      explanation: 'VMI là mô hình nhà cung cấp theo dõi và quyết định mức bổ sung hàng tồn kho cho khách hàng dựa trên dữ liệu bán hàng thực tế.'
    },
    {
      content: 'Trong kiến trúc hệ thống thông tin, SOA (Service-Oriented Architecture) là gì?',
      options: [
        'Kiến trúc phần cứng',
        'Kiến trúc phần mềm dựa trên các dịch vụ độc lập, có thể tái sử dụng và giao tiếp qua giao thức chuẩn',
        'Một loại cơ sở dữ liệu',
        'Phương pháp quản lý dự án'
      ],
      correct: 1,
      explanation: 'SOA là kiến trúc phần mềm tổ chức chức năng thành các dịch vụ độc lập, loose-coupled, giao tiếp qua giao thức chuẩn (SOAP, REST).'
    },
    {
      content: 'Trong E-commerce, "Omnichannel" khác "Multichannel" ở điểm nào?',
      options: [
        'Omnichannel chỉ bán trực tuyến',
        'Omnichannel tích hợp liền mạch mọi kênh bán hàng, tạo trải nghiệm thống nhất cho khách hàng',
        'Multichannel tích hợp tốt hơn Omnichannel',
        'Không có sự khác biệt'
      ],
      correct: 1,
      explanation: 'Omnichannel tích hợp tất cả kênh (online, offline, mobile) thành trải nghiệm liền mạch, trong khi Multichannel các kênh hoạt động riêng lẻ.'
    },
    {
      content: 'Trong BI, OLTP khác OLAP ở điểm nào?',
      options: [
        'OLTP nhanh hơn OLAP trong mọi trường hợp',
        'OLTP xử lý giao dịch hàng ngày, OLAP phục vụ phân tích dữ liệu lịch sử đa chiều',
        'OLAP không dùng SQL',
        'OLTP chỉ dùng cho Data Warehouse'
      ],
      correct: 1,
      explanation: 'OLTP tối ưu cho giao dịch nhanh (INSERT, UPDATE), OLAP tối ưu cho truy vấn phân tích phức tạp trên dữ liệu lịch sử lớn.'
    },
    {
      content: 'Trong quản lý dự án, phương pháp PRINCE2 có đặc điểm gì?',
      options: [
        'Chỉ áp dụng cho dự án nhỏ',
        'Là phương pháp quản lý dự án có cấu trúc, dựa trên sản phẩm, chia thành các giai đoạn có kiểm soát',
        'Không có tài liệu hướng dẫn',
        'Chỉ dùng cho dự án phần mềm'
      ],
      correct: 1,
      explanation: 'PRINCE2 (Projects IN Controlled Environments) là phương pháp quản lý dự án có cấu trúc, product-based, phân chia thành stages với quyết định go/no-go.'
    },
    {
      content: 'Trong IT Governance, "IT Portfolio Management" nhằm mục đích?',
      options: [
        'Chỉ quản lý phần cứng',
        'Quản lý tập hợp các đầu tư, dự án, tài sản CNTT để tối đa hóa giá trị kinh doanh',
        'Chỉ quản lý nhân sự IT',
        'Chỉ quản lý license phần mềm'
      ],
      correct: 1,
      explanation: 'IT Portfolio Management quản lý toàn bộ danh mục đầu tư CNTT (dự án, ứng dụng, hạ tầng) để đảm bảo ROI và phù hợp chiến lược.'
    },
    {
      content: 'Trong cybersecurity, "Zero Trust Architecture" dựa trên nguyên tắc?',
      options: [
        'Tin tưởng toàn bộ mạng nội bộ',
        'Không tin tưởng bất kỳ ai/thiết bị nào mặc định, luôn xác thực và ủy quyền',
        'Chỉ bảo vệ biên mạng',
        'Không cần xác thực nếu đang trong văn phòng'
      ],
      correct: 1,
      explanation: 'Zero Trust hoạt động theo nguyên tắc "never trust, always verify" - mọi truy cập đều phải được xác thực, bất kể vị trí mạng.'
    },
    {
      content: 'Snowflake Schema trong Data Warehouse khác Star Schema ở điểm nào?',
      options: [
        'Snowflake không có bảng Fact',
        'Snowflake chuẩn hóa các bảng Dimension thành nhiều bảng con liên kết',
        'Star Schema phức tạp hơn Snowflake',
        'Snowflake không hỗ trợ SQL'
      ],
      correct: 1,
      explanation: 'Snowflake Schema chuẩn hóa (normalize) các bảng Dimension thành nhiều bảng con, giảm dư thừa nhưng tăng độ phức tạp truy vấn.'
    },
    {
      content: 'Trong E-commerce, SSL/TLS Certificate có vai trò gì?',
      options: [
        'Tăng tốc độ website',
        'Mã hóa dữ liệu truyền giữa trình duyệt và server, đảm bảo an toàn giao dịch',
        'Thiết kế giao diện đẹp hơn',
        'Tăng dung lượng lưu trữ'
      ],
      correct: 1,
      explanation: 'SSL/TLS mã hóa kênh truyền dữ liệu giữa client và server, bảo vệ thông tin nhạy cảm (số thẻ, mật khẩu) khỏi bị đánh cắp.'
    },
    {
      content: 'Trong MIS, khái niệm "Information Asymmetry" ảnh hưởng đến doanh nghiệp như thế nào?',
      options: [
        'Không ảnh hưởng gì',
        'Gây ra bất lợi khi một bên có nhiều thông tin hơn bên kia trong giao dịch kinh doanh',
        'Giúp tất cả các bên đều có lợi',
        'Chỉ ảnh hưởng đến phần cứng'
      ],
      correct: 1,
      explanation: 'Information Asymmetry xảy ra khi thông tin phân bố không đều giữa các bên, dẫn đến quyết định không tối ưu và rủi ro moral hazard.'
    },
    {
      content: 'Microservices Architecture khác Monolithic Architecture ở điểm nào?',
      options: [
        'Microservices chậm hơn',
        'Microservices chia ứng dụng thành nhiều dịch vụ nhỏ, độc lập, có thể deploy riêng',
        'Monolithic dễ mở rộng hơn',
        'Microservices không dùng được API'
      ],
      correct: 1,
      explanation: 'Microservices chia ứng dụng thành các dịch vụ nhỏ, độc lập, mỗi dịch vụ có database riêng và có thể phát triển, deploy, scale riêng.'
    },
    {
      content: 'Trong chuyển đổi số, "API Economy" đề cập đến?',
      options: [
        'Việc tiết kiệm chi phí API',
        'Mô hình kinh doanh dựa trên việc chia sẻ dữ liệu và chức năng qua API, tạo hệ sinh thái số',
        'Loại tiền tệ mới',
        'Cách tính lương cho lập trình viên'
      ],
      correct: 1,
      explanation: 'API Economy là mô hình kinh tế nơi doanh nghiệp tạo giá trị bằng cách mở API cho đối tác, tạo hệ sinh thái dịch vụ số liên kết.'
    },
    {
      content: 'Trong quản lý rủi ro CNTT, "Business Continuity Plan" (BCP) nhằm?',
      options: [
        'Chỉ sao lưu dữ liệu',
        'Đảm bảo doanh nghiệp tiếp tục hoạt động trong và sau sự cố nghiêm trọng',
        'Chỉ phục hồi email',
        'Lên kế hoạch kinh doanh mới'
      ],
      correct: 1,
      explanation: 'BCP là kế hoạch toàn diện đảm bảo các chức năng kinh doanh quan trọng tiếp tục hoạt động trong thảm họa và phục hồi nhanh chóng.'
    },
    {
      content: 'Trong ERP, khái niệm "Best Practice" khi triển khai có nghĩa là?',
      options: [
        'Luôn tùy chỉnh 100% hệ thống theo yêu cầu',
        'Áp dụng quy trình chuẩn mà hệ thống ERP khuyến nghị dựa trên kinh nghiệm ngành',
        'Không cần đào tạo người dùng',
        'Bỏ qua giai đoạn kiểm thử'
      ],
      correct: 1,
      explanation: 'Best Practice trong ERP là các quy trình chuẩn đã được chứng minh hiệu quả trong ngành, giúp giảm chi phí tùy chỉnh và rủi ro triển khai.'
    },
    {
      content: 'Công nghệ Blockchain có thể ứng dụng trong SCM để?',
      options: [
        'Thay thế hoàn toàn hệ thống ERP',
        'Tăng tính minh bạch và truy xuất nguồn gốc sản phẩm trong chuỗi cung ứng',
        'Loại bỏ hoàn toàn trung gian vận chuyển',
        'Chỉ dùng cho thanh toán cryptocurrency'
      ],
      correct: 1,
      explanation: 'Blockchain trong SCM cung cấp sổ cái phân tán, bất biến giúp truy xuất nguồn gốc, xác thực sản phẩm, và tăng minh bạch toàn chuỗi.'
    },
    {
      content: 'Trong DSS, mô hình "What-If Analysis" được sử dụng để?',
      options: [
        'Xóa dữ liệu cũ',
        'Mô phỏng các kịch bản khác nhau bằng cách thay đổi biến đầu vào để đánh giá tác động',
        'Chỉ tạo báo cáo tĩnh',
        'Quản lý nhân sự'
      ],
      correct: 1,
      explanation: 'What-If Analysis cho phép nhà quản lý thay đổi các giả định đầu vào để xem kết quả thay đổi, hỗ trợ đánh giá các phương án quyết định.'
    },
    {
      content: 'Trong Cloud Computing, "Serverless Computing" có nghĩa là?',
      options: [
        'Không cần server nào cả',
        'Nhà cung cấp quản lý hoàn toàn hạ tầng, người dùng chỉ viết code chức năng và trả phí theo lượng sử dụng',
        'Chỉ dùng server vật lý',
        'Không có Internet'
      ],
      correct: 1,
      explanation: 'Serverless (FaaS) cho phép chạy code mà không cần quản lý server, tự động scale, và chỉ tính phí khi code thực thi (AWS Lambda, Azure Functions).'
    },
    {
      content: 'Trong ITIL, "SLA" (Service Level Agreement) là?',
      options: [
        'Hợp đồng lao động',
        'Thỏa thuận về mức độ dịch vụ giữa nhà cung cấp IT và khách hàng, quy định các chỉ tiêu chất lượng',
        'Chứng chỉ bảo mật',
        'Giấy phép phần mềm'
      ],
      correct: 1,
      explanation: 'SLA là thỏa thuận chính thức quy định mức dịch vụ cam kết (uptime, response time, resolution time) giữa provider và customer.'
    },
    {
      content: 'Trong an ninh mạng, "Social Engineering" tấn công bằng cách nào?',
      options: [
        'Tấn công phần cứng mạng',
        'Khai thác tâm lý và sự tin tưởng của con người để lừa lấy thông tin hoặc quyền truy cập',
        'Brute force mật khẩu',
        'Khai thác lỗ hổng phần mềm'
      ],
      correct: 1,
      explanation: 'Social Engineering khai thác yếu tố con người (tâm lý, sự tin tưởng, sợ hãi) để thao túng nạn nhân tiết lộ thông tin nhạy cảm.'
    },
    {
      content: 'Trong CRM Analytics, "Churn Rate" đo lường?',
      options: [
        'Tỷ lệ khách hàng mới',
        'Tỷ lệ khách hàng rời bỏ doanh nghiệp trong một khoảng thời gian',
        'Doanh thu trung bình',
        'Số lượng sản phẩm bán được'
      ],
      correct: 1,
      explanation: 'Churn Rate là tỷ lệ khách hàng ngừng sử dụng sản phẩm/dịch vụ trong một kỳ, là KPI quan trọng để đánh giá retention.'
    },
    {
      content: 'Trong ERP, "Go-Live" là giai đoạn nào trong dự án triển khai?',
      options: [
        'Giai đoạn lập kế hoạch',
        'Thời điểm hệ thống ERP chính thức đi vào hoạt động thực tế',
        'Giai đoạn phân tích yêu cầu',
        'Giai đoạn thiết kế'
      ],
      correct: 1,
      explanation: 'Go-Live là thời điểm hệ thống ERP được chuyển từ môi trường test sang production, người dùng bắt đầu sử dụng thực tế.'
    },
    {
      content: 'Trong Digital Transformation, "Low-Code/No-Code Platform" cho phép?',
      options: [
        'Chỉ lập trình viên chuyên nghiệp sử dụng',
        'Người dùng nghiệp vụ tạo ứng dụng với ít hoặc không cần viết code',
        'Loại bỏ hoàn toàn bộ phận IT',
        'Chỉ tạo website tĩnh'
      ],
      correct: 1,
      explanation: 'Low-Code/No-Code cho phép citizen developers (người không chuyên IT) xây dựng ứng dụng qua giao diện kéo thả, giảm phụ thuộc vào lập trình viên.'
    },
    {
      content: 'Trong BI, "Predictive Analytics" sử dụng kỹ thuật gì?',
      options: [
        'Chỉ thống kê mô tả đơn giản',
        'Machine Learning, thống kê nâng cao để dự đoán xu hướng và hành vi tương lai',
        'Chỉ báo cáo dữ liệu quá khứ',
        'Chỉ visualization cơ bản'
      ],
      correct: 1,
      explanation: 'Predictive Analytics dùng ML, data mining, thống kê để xây dựng mô hình dự đoán xu hướng, rủi ro, cơ hội trong tương lai.'
    },
    {
      content: 'Trong quản trị CNTT, "TCO" (Total Cost of Ownership) bao gồm?',
      options: [
        'Chỉ chi phí mua phần cứng ban đầu',
        'Toàn bộ chi phí sở hữu: mua sắm, triển khai, vận hành, bảo trì, nâng cấp, và thanh lý',
        'Chỉ chi phí license phần mềm',
        'Chỉ chi phí nhân công'
      ],
      correct: 1,
      explanation: 'TCO tính toàn bộ chi phí trong vòng đời: acquisition, implementation, operation, maintenance, upgrade, disposal, training, support.'
    },
    {
      content: 'Trong Cloud, "Auto-Scaling" giải quyết vấn đề gì?',
      options: [
        'Bảo mật dữ liệu',
        'Tự động tăng/giảm tài nguyên theo nhu cầu thực tế, tối ưu chi phí và hiệu suất',
        'Thiết kế giao diện',
        'Quản lý nhân sự'
      ],
      correct: 1,
      explanation: 'Auto-Scaling tự động điều chỉnh số lượng instance/tài nguyên dựa trên workload thực tế, đảm bảo hiệu suất và tối ưu chi phí.'
    },
    {
      content: 'Trong quản lý dự án CNTT, "Stakeholder" là?',
      options: [
        'Chỉ nhà đầu tư tài chính',
        'Tất cả cá nhân/tổ chức bị ảnh hưởng hoặc có ảnh hưởng đến dự án',
        'Chỉ khách hàng cuối',
        'Chỉ đội ngũ lập trình'
      ],
      correct: 1,
      explanation: 'Stakeholder bao gồm mọi bên liên quan: sponsor, khách hàng, người dùng, đội dự án, nhà cung cấp, quản lý cấp cao, v.v.'
    },
    {
      content: 'Trong E-commerce, "SEO" (Search Engine Optimization) giúp?',
      options: [
        'Bảo mật website',
        'Tối ưu hóa website để xếp hạng cao hơn trên kết quả tìm kiếm tự nhiên',
        'Tăng dung lượng server',
        'Mã hóa dữ liệu khách hàng'
      ],
      correct: 1,
      explanation: 'SEO tối ưu hóa nội dung, cấu trúc, kỹ thuật website để cải thiện thứ hạng trên kết quả tìm kiếm organic của Google, Bing.'
    },
    {
      content: 'Trong SAP, Transaction Code (T-Code) "ME21N" dùng để?',
      options: [
        'Tạo đơn bán hàng',
        'Tạo đơn đặt mua hàng (Purchase Order)',
        'Xem báo cáo tài chính',
        'Quản lý nhân sự'
      ],
      correct: 1,
      explanation: 'ME21N là T-Code trong module MM (Materials Management) dùng để tạo Purchase Order mới trong SAP.'
    },
    {
      content: 'Trong Digital Transformation, IoT (Internet of Things) đóng vai trò gì cho doanh nghiệp sản xuất?',
      options: [
        'Chỉ kết nối máy tính cá nhân',
        'Thu thập dữ liệu real-time từ thiết bị/máy móc để tối ưu sản xuất và bảo trì dự đoán',
        'Thay thế toàn bộ công nhân',
        'Chỉ phục vụ giải trí'
      ],
      correct: 1,
      explanation: 'IoT trong sản xuất (IIoT) kết nối máy móc, cảm biến để thu thập dữ liệu real-time phục vụ predictive maintenance, tối ưu OEE.'
    }
  ] as MCQ[],
  essays: [
    {
      content: 'Phân tích chiến lược triển khai hệ thống ERP cho doanh nghiệp: so sánh phương pháp Big Bang, Phased Rollout và Parallel. Đánh giá ưu nhược điểm và đề xuất phương pháp phù hợp cho doanh nghiệp sản xuất 500 nhân viên.',
      explanation: 'Cần trình bày: mô tả 3 phương pháp, so sánh ưu nhược điểm (rủi ro, chi phí, thời gian, phức tạp), yếu tố quyết định lựa chọn, đề xuất có lập luận cho doanh nghiệp 500 nhân viên.',
      points: 5
    },
    {
      content: 'Thiết kế kiến trúc hệ thống Business Intelligence cho một ngân hàng thương mại. Mô tả chi tiết các tầng (data sources, ETL, data warehouse, OLAP, presentation) và các KPIs cần theo dõi.',
      explanation: 'Cần trình bày: yêu cầu nghiệp vụ ngân hàng, kiến trúc chi tiết từng tầng, thiết kế data warehouse (star/snowflake), KPIs (NIM, NPL ratio, ROA, ROE), công nghệ đề xuất.',
      points: 5
    },
    {
      content: 'Phân tích mô hình quản trị CNTT tích hợp COBIT-ITIL cho doanh nghiệp quy mô lớn. Làm thế nào để hai framework bổ trợ nhau trong thực tế?',
      explanation: 'Cần trình bày: vai trò COBIT (governance), vai trò ITIL (management), điểm chung và khác biệt, mapping giữa processes, case study triển khai tích hợp, lợi ích đạt được.',
      points: 4
    },
    {
      content: 'Đề xuất giải pháp thương mại điện tử toàn diện cho một doanh nghiệp bán lẻ muốn mở rộng kênh online. Phân tích lựa chọn nền tảng, tích hợp thanh toán, logistics, và chiến lược marketing số.',
      explanation: 'Cần trình bày: phân tích nhu cầu, so sánh nền tảng (Shopify, WooCommerce, custom), tích hợp payment gateway, giải pháp logistics/fulfillment, chiến lược digital marketing (SEO, SEM, social), UX/UI.',
      points: 5
    },
    {
      content: 'Phân tích vai trò của AI và Machine Learning trong việc nâng cao hiệu quả hệ thống CRM hiện đại. Lấy ví dụ cụ thể về ứng dụng AI trong sales, marketing, và customer service.',
      explanation: 'Cần trình bày: AI trong lead scoring, churn prediction, personalization, chatbot, sentiment analysis, recommendation engine, next-best-action, ví dụ Salesforce Einstein, HubSpot AI.',
      points: 4
    },
    {
      content: 'Xây dựng kế hoạch ứng phó sự cố an ninh mạng (Incident Response Plan) cho doanh nghiệp fintech. Phân tích 6 giai đoạn theo NIST và các biện pháp phòng ngừa chủ động.',
      explanation: 'Cần trình bày: 6 phases (Preparation, Identification, Containment, Eradication, Recovery, Lessons Learned), đặc thù fintech (PCI DSS, data sensitivity), biện pháp phòng ngừa, SIEM, SOC.',
      points: 4
    },
    {
      content: 'So sánh chiến lược Cloud Migration: "Lift and Shift", "Re-platform", và "Re-architect". Phân tích khi nào doanh nghiệp nên chọn từng chiến lược và rủi ro cần lưu ý.',
      explanation: 'Cần trình bày: định nghĩa 6R migration (focus 3 chính), ưu nhược điểm, chi phí ngắn/dài hạn, yêu cầu kỹ thuật, rủi ro (vendor lock-in, downtime, security), decision framework.',
      points: 4
    },
    {
      content: 'Phân tích vai trò của Decision Support System (DSS) trong quản lý chuỗi cung ứng. Thiết kế mô hình DSS hỗ trợ dự báo nhu cầu và tối ưu hóa tồn kho cho doanh nghiệp FMCG.',
      explanation: 'Cần trình bày: kiến trúc DSS (database, model base, UI), mô hình dự báo (time series, ML), mô hình tồn kho (EOQ, safety stock), tích hợp dữ liệu POS/ERP, case study FMCG.',
      points: 5
    },
    {
      content: 'Đánh giá tác động của Robotic Process Automation (RPA) đối với quy trình kinh doanh trong lĩnh vực tài chính-ngân hàng. Phân tích cơ hội, thách thức, và lộ trình triển khai.',
      explanation: 'Cần trình bày: khái niệm RPA, use cases ngân hàng (KYC, reconciliation, report, loan processing), ROI, thách thức (exception handling, change management), lộ trình từ pilot đến scale.',
      points: 3
    },
    {
      content: 'Phân tích xu hướng ứng dụng Data Lakehouse trong doanh nghiệp hiện đại. So sánh với kiến trúc Data Warehouse truyền thống và Data Lake. Đánh giá khả năng áp dụng cho doanh nghiệp Việt Nam.',
      explanation: 'Cần trình bày: hạn chế DW truyền thống và Data Lake, khái niệm Lakehouse (Delta Lake, Iceberg), ưu điểm (ACID + schema + ML), so sánh chi phí/hiệu suất, thách thức áp dụng tại VN.',
      points: 3
    }
  ] as Essay[]
};
