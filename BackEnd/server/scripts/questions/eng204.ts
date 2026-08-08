type MCQ = { content: string; options: string[]; correct: number; explanation?: string };
type Essay = { content: string; explanation?: string; points?: number };

export const engQ1 = {
  mcqs: [
    {
      content: 'Chọn đáp án đúng để hoàn thành câu: "By the time the server crashed, the team _____ on the project for six hours."',
      options: ['had been working', 'has been working', 'were working', 'have worked'],
      correct: 0,
      explanation: 'Past perfect continuous dùng để diễn tả hành động đã xảy ra liên tục trước một thời điểm trong quá khứ.'
    },
    {
      content: 'Chọn từ đúng: "The software update _____ automatically if the user enables auto-update."',
      options: ['will be installed', 'would be installed', 'is installed', 'was installed'],
      correct: 0,
      explanation: 'Câu điều kiện loại 1 (If + present simple, will + V) diễn tả điều kiện có thể xảy ra.'
    },
    {
      content: 'Chọn dạng bị động đúng: "The developers _____ the new feature by next Monday."',
      options: ['will have completed', 'will be completed', 'will have been completed', 'are completing'],
      correct: 0,
      explanation: 'Future perfect active: will have + past participle, vì chủ ngữ "developers" thực hiện hành động.'
    },
    {
      content: 'Điền giới từ đúng: "The application is compatible _____ most operating systems."',
      options: ['with', 'to', 'for', 'by'],
      correct: 0,
      explanation: '"Compatible with" là cụm giới từ cố định trong tiếng Anh.'
    },
    {
      content: 'Chọn từ đúng để hoàn thành câu: "If I _____ the root password, I would reset the server configuration."',
      options: ['knew', 'know', 'had known', 'would know'],
      correct: 0,
      explanation: 'Câu điều kiện loại 2 (If + past simple, would + V) diễn tả điều kiện không có thực ở hiện tại.'
    },
    {
      content: 'Chọn câu tường thuật đúng: He said, "I am debugging the application."',
      options: ['He said that he was debugging the application.', 'He said that he is debugging the application.', 'He said that he has been debugging the application.', 'He said that he would debug the application.'],
      correct: 0,
      explanation: 'Reported speech: am → was (lùi thì từ hiện tại tiếp diễn sang quá khứ tiếp diễn).'
    },
    {
      content: 'Tìm lỗi sai trong câu: "The datas collected from the sensors are processed in real-time."',
      options: ['datas → data', 'collected → collecting', 'are → is', 'in → on'],
      correct: 0,
      explanation: '"Data" là danh từ không đếm được, không thêm "s".'
    },
    {
      content: 'Chọn phrasal verb phù hợp: "We need to _____ the issue before deploying to production."',
      options: ['figure out', 'put off', 'give up', 'turn down'],
      correct: 0,
      explanation: '"Figure out" = tìm ra, giải quyết (vấn đề).'
    },
    {
      content: 'Chọn dạng từ đúng (word formation): "The _____ of the new algorithm significantly improved processing speed."',
      options: ['implementation', 'implement', 'implementing', 'implemented'],
      correct: 0,
      explanation: 'Cần danh từ sau mạo từ "The" → "implementation".'
    },
    {
      content: 'Chọn đáp án đúng: "Neither the project manager nor the developers _____ aware of the security vulnerability."',
      options: ['were', 'was', 'is', 'has been'],
      correct: 0,
      explanation: 'Neither...nor: động từ chia theo chủ ngữ gần nhất "developers" (số nhiều) → were.'
    },
    {
      content: 'Điền từ thích hợp: "The company decided to _____ its IT infrastructure to the cloud."',
      options: ['migrate', 'commute', 'transfer', 'transport'],
      correct: 0,
      explanation: '"Migrate" là thuật ngữ IT chỉ việc di chuyển hệ thống/dữ liệu sang nền tảng mới.'
    },
    {
      content: 'Chọn đáp án đúng: "The database _____ backed up every night at midnight."',
      options: ['is', 'are', 'has', 'have'],
      correct: 0,
      explanation: '"Database" là danh từ số ít, dùng "is" trong câu bị động hiện tại đơn.'
    },
    {
      content: 'Chọn từ nối phù hợp: "The system crashed _____ a memory leak in the application."',
      options: ['due to', 'despite', 'although', 'whereas'],
      correct: 0,
      explanation: '"Due to" = vì, do (chỉ nguyên nhân).'
    },
    {
      content: 'Chọn câu đúng ngữ pháp:',
      options: [
        'The software, which was developed by our team, has been released.',
        'The software which was developed by our team, has been released.',
        'The software, which was developed by our team has been released.',
        'The software which, was developed by our team, has been released.'
      ],
      correct: 0,
      explanation: 'Mệnh đề quan hệ không xác định cần dấu phẩy cả trước và sau mệnh đề.'
    },
    {
      content: 'Đọc đoạn văn và trả lời: "Cloud computing allows businesses to access computing resources over the internet without owning physical hardware. This reduces capital expenditure and provides scalability." — Lợi ích chính của cloud computing theo đoạn văn là gì?',
      options: [
        'Reducing costs and providing scalability',
        'Increasing physical hardware',
        'Limiting internet access',
        'Requiring more capital investment'
      ],
      correct: 0,
      explanation: 'Đoạn văn nêu rõ: "reduces capital expenditure and provides scalability".'
    },
    {
      content: 'Chọn đáp án đúng: "The IT department suggested that every employee _____ their password monthly."',
      options: ['change', 'changes', 'changed', 'changing'],
      correct: 0,
      explanation: 'Subjunctive mood sau "suggest that": chủ ngữ + động từ nguyên mẫu.'
    },
    {
      content: 'Chọn từ vựng IT phù hợp: "A _____ is a security system that monitors and controls incoming and outgoing network traffic."',
      options: ['firewall', 'browser', 'compiler', 'debugger'],
      correct: 0,
      explanation: 'Firewall (tường lửa) là hệ thống bảo mật giám sát lưu lượng mạng.'
    },
    {
      content: 'Điền giới từ đúng: "The programmer specializes _____ developing mobile applications."',
      options: ['in', 'on', 'at', 'for'],
      correct: 0,
      explanation: '"Specialize in" = chuyên về (cụm giới từ cố định).'
    },
    {
      content: 'Chọn thì đúng: "The company _____ three major software products since its establishment in 2015."',
      options: ['has released', 'released', 'had released', 'is releasing'],
      correct: 0,
      explanation: 'Present perfect với "since" diễn tả hành động bắt đầu trong quá khứ và kéo dài đến hiện tại.'
    },
    {
      content: 'Chọn từ đúng: "The API documentation should be _____ enough for junior developers to understand."',
      options: ['comprehensive', 'comprehension', 'comprehend', 'comprehensively'],
      correct: 0,
      explanation: 'Cần tính từ sau "be" → "comprehensive" (toàn diện, dễ hiểu).'
    },
    {
      content: 'Tìm lỗi sai: "Each of the programmers have submitted their code for review."',
      options: ['have → has', 'submitted → submitting', 'their → his', 'for → to'],
      correct: 0,
      explanation: '"Each of" + danh từ số nhiều nhưng động từ chia số ít → "has".'
    },
    {
      content: 'Chọn phrasal verb đúng: "The team had to _____ the release due to critical bugs."',
      options: ['put off', 'put on', 'put up', 'put away'],
      correct: 0,
      explanation: '"Put off" = hoãn lại, trì hoãn.'
    },
    {
      content: 'Chọn đáp án đúng: "_____ the tight deadline, the team managed to deliver the project on time."',
      options: ['Despite', 'Because of', 'Due to', 'Since'],
      correct: 0,
      explanation: '"Despite" = mặc dù (+ noun phrase), thể hiện sự tương phản.'
    },
    {
      content: 'Chọn câu bị động đúng: "Someone hacked the company\'s database last night."',
      options: [
        "The company's database was hacked last night.",
        "The company's database is hacked last night.",
        "The company's database has been hacked last night.",
        "The company's database had been hacked last night."
      ],
      correct: 0,
      explanation: 'Bị động quá khứ đơn: was/were + past participle (vì có "last night").'
    },
    {
      content: 'Điền từ vào chỗ trống: "Machine learning algorithms can _____ patterns in large datasets that humans might miss."',
      options: ['identify', 'identity', 'identical', 'identification'],
      correct: 0,
      explanation: 'Cần động từ sau "can" → "identify" (nhận diện).'
    },
    {
      content: 'Chọn đáp án đúng: "If the system had been updated regularly, the breach _____ ."',
      options: ['would not have occurred', 'will not occur', 'would not occur', 'did not occur'],
      correct: 0,
      explanation: 'Câu điều kiện loại 3 (If + past perfect, would have + PP) diễn tả điều kiện không có thực trong quá khứ.'
    },
    {
      content: 'Đọc đoạn văn: "Agile methodology divides projects into short iterations called sprints. Each sprint typically lasts 2-4 weeks and results in a potentially shippable product increment." — Một sprint thường kéo dài bao lâu?',
      options: ['2-4 weeks', '1-2 months', '5-6 weeks', '1 week'],
      correct: 0,
      explanation: 'Đoạn văn nêu rõ: "Each sprint typically lasts 2-4 weeks".'
    },
    {
      content: 'Chọn từ đúng: "The network administrator is _____ for maintaining server uptime."',
      options: ['responsible', 'responsive', 'respective', 'respectable'],
      correct: 0,
      explanation: '"Responsible for" = chịu trách nhiệm về.'
    },
    {
      content: 'Chọn cấu trúc đúng: "Not only _____ the bug, but he also proposed a solution."',
      options: ['did he find', 'he found', 'he did find', 'found he'],
      correct: 0,
      explanation: '"Not only" đứng đầu câu → đảo ngữ: Not only + trợ động từ + S + V.'
    },
    {
      content: 'Chọn từ đúng: "The company invested heavily in _____ intelligence to automate customer service."',
      options: ['artificial', 'artistic', 'articulate', 'arbitrary'],
      correct: 0,
      explanation: '"Artificial intelligence" (trí tuệ nhân tạo) là thuật ngữ IT phổ biến.'
    },
    {
      content: 'Điền giới từ: "The users complained _____ the slow loading speed of the website."',
      options: ['about', 'on', 'for', 'with'],
      correct: 0,
      explanation: '"Complain about" = phàn nàn về (cụm giới từ cố định).'
    },
    {
      content: 'Chọn đáp án đúng: "The meeting _____ at 3 PM tomorrow to discuss the new architecture."',
      options: ['is scheduled', 'schedules', 'scheduling', 'has scheduled'],
      correct: 0,
      explanation: '"Is scheduled" (bị động) vì cuộc họp được lên lịch bởi ai đó.'
    },
    {
      content: 'Chọn từ nối: "Python is widely used in data science; _____, JavaScript dominates web development."',
      options: ['meanwhile', 'therefore', 'furthermore', 'consequently'],
      correct: 0,
      explanation: '"Meanwhile" = trong khi đó (chỉ sự tương phản/đồng thời).'
    },
    {
      content: 'Tìm lỗi sai: "The informations stored in the database must be encrypted for security purposes."',
      options: ['informations → information', 'stored → storing', 'must be → must', 'for → of'],
      correct: 0,
      explanation: '"Information" là danh từ không đếm được, không thêm "s".'
    },
    {
      content: 'Chọn đáp án đúng: "She asked me _____ the deployment process worked."',
      options: ['how', 'what', 'which', 'who'],
      correct: 0,
      explanation: 'Câu hỏi gián tiếp hỏi về cách thức → dùng "how".'
    },
    {
      content: 'Chọn word formation đúng: "The _____ of data is crucial for training machine learning models."',
      options: ['availability', 'available', 'avail', 'availably'],
      correct: 0,
      explanation: 'Cần danh từ sau mạo từ "The" → "availability" (tính khả dụng).'
    },
    {
      content: 'Chọn đáp án đúng: "The developers are looking forward _____ the new framework."',
      options: ['to using', 'to use', 'using', 'use'],
      correct: 0,
      explanation: '"Look forward to + V-ing" là cấu trúc cố định (to là giới từ).'
    },
    {
      content: 'Chọn từ vựng phù hợp: "A _____ attack involves overwhelming a server with excessive traffic to make it unavailable."',
      options: ['DDoS', 'phishing', 'malware', 'ransomware'],
      correct: 0,
      explanation: 'DDoS (Distributed Denial of Service) là tấn công làm quá tải server bằng lưu lượng truy cập.'
    },
    {
      content: 'Chọn thì phù hợp: "By 2030, quantum computing _____ many current encryption methods obsolete."',
      options: ['will have made', 'will make', 'makes', 'is making'],
      correct: 0,
      explanation: 'Future perfect (will have + PP) với "By 2030" diễn tả hành động sẽ hoàn thành trước một thời điểm tương lai.'
    },
    {
      content: 'Đọc đoạn văn: "DevOps combines software development and IT operations. It aims to shorten the development lifecycle while delivering features, fixes, and updates frequently and reliably." — Mục tiêu chính của DevOps là gì?',
      options: [
        'Shortening development lifecycle with reliable frequent delivery',
        'Replacing all IT operations staff',
        'Eliminating the need for testing',
        'Reducing the number of developers'
      ],
      correct: 0,
      explanation: 'Đoạn văn nêu: "shorten the development lifecycle while delivering features, fixes, and updates frequently and reliably".'
    }
  ] as MCQ[],
  essays: [
    {
      content: 'Viết một đoạn văn bằng tiếng Anh (150-250 từ) mô tả các lợi ích và thách thức của điện toán đám mây (cloud computing) đối với doanh nghiệp vừa và nhỏ.',
      explanation: 'Bài viết cần đề cập: cost reduction, scalability, accessibility, security concerns, internet dependency, vendor lock-in.',
      points: 4
    },
    {
      content: 'Viết một đoạn văn bằng tiếng Anh (150-250 từ) về tầm quan trọng của an ninh mạng (cybersecurity) trong thời đại số.',
      explanation: 'Nên bao gồm: types of threats, importance of data protection, prevention measures, real-world impact of breaches.',
      points: 4
    },
    {
      content: 'Viết một email bằng tiếng Anh (150-200 từ) gửi cho quản lý dự án để báo cáo tiến độ phát triển phần mềm, bao gồm những gì đã hoàn thành, khó khăn gặp phải, và kế hoạch tiếp theo.',
      explanation: 'Email cần có format chuẩn: greeting, body (progress, challenges, next steps), closing. Ngôn ngữ chuyên nghiệp.',
      points: 3
    },
    {
      content: 'Viết một đoạn văn bằng tiếng Anh (150-250 từ) so sánh phương pháp phát triển phần mềm Agile và Waterfall. Nêu ưu nhược điểm của mỗi phương pháp.',
      explanation: 'Cần so sánh: flexibility, documentation, client involvement, risk management, delivery speed, project suitability.',
      points: 5
    },
    {
      content: 'Viết một đoạn văn bằng tiếng Anh (150-250 từ) về vai trò của trí tuệ nhân tạo (AI) trong ngành công nghệ thông tin hiện nay và tương lai.',
      explanation: 'Đề cập: current applications (NLP, computer vision, automation), future potential, ethical concerns, job market impact.',
      points: 4
    },
    {
      content: 'Viết một đoạn văn bằng tiếng Anh (150-250 từ) mô tả quy trình kiểm thử phần mềm (software testing) và giải thích tại sao nó quan trọng trong phát triển phần mềm.',
      explanation: 'Bao gồm: types of testing (unit, integration, system, UAT), testing lifecycle, importance of quality assurance, cost of bugs.',
      points: 4
    },
    {
      content: 'Viết một bài luận ngắn bằng tiếng Anh (200-250 từ) về chủ đề "The Impact of Remote Work on Software Development Teams".',
      explanation: 'Nên đề cập: communication tools, productivity changes, work-life balance, collaboration challenges, global talent access.',
      points: 5
    },
    {
      content: 'Viết một đoạn văn bằng tiếng Anh (150-200 từ) giải thích khái niệm "Internet of Things (IoT)" và đưa ra ví dụ ứng dụng thực tế.',
      explanation: 'Giải thích IoT concept, examples (smart home, healthcare, manufacturing), benefits, security/privacy concerns.',
      points: 3
    },
    {
      content: 'Viết một đoạn văn bằng tiếng Anh (150-250 từ) về các kỹ năng mềm cần thiết cho một lập trình viên chuyên nghiệp ngoài kỹ năng kỹ thuật.',
      explanation: 'Soft skills: communication, teamwork, problem-solving, time management, adaptability, continuous learning.',
      points: 3
    },
    {
      content: 'Viết một bài luận ngắn bằng tiếng Anh (200-250 từ) thảo luận về ưu và nhược điểm của mã nguồn mở (open-source software) so với phần mềm thương mại.',
      explanation: 'So sánh: cost, customization, community support, security, reliability, enterprise support, licensing.',
      points: 5
    }
  ] as Essay[]
};

export const engQ2 = {
  mcqs: [
    {
      content: 'Chọn đáp án đúng: "The project manager insisted that the deadline _____ extended."',
      options: ['be', 'is', 'was', 'were'],
      correct: 0,
      explanation: 'Subjunctive mood sau "insist that": S + be/V-nguyên mẫu (không chia).'
    },
    {
      content: 'Chọn từ đúng: "The system _____ running smoothly since the last maintenance update."',
      options: ['has been', 'had been', 'is', 'was'],
      correct: 0,
      explanation: 'Present perfect continuous với "since" diễn tả hành động bắt đầu trong quá khứ và tiếp tục đến hiện tại.'
    },
    {
      content: 'Điền giới từ đúng: "The team is working _____ a tight schedule to meet the client\'s requirements."',
      options: ['under', 'in', 'with', 'at'],
      correct: 0,
      explanation: '"Work under a tight schedule" = làm việc dưới áp lực thời gian.'
    },
    {
      content: 'Chọn đáp án đúng: "Had we known about the vulnerability earlier, we _____ the patch immediately."',
      options: ['would have deployed', 'will deploy', 'would deploy', 'deployed'],
      correct: 0,
      explanation: 'Câu điều kiện loại 3 đảo ngữ: Had + S + PP, S + would have + PP.'
    },
    {
      content: 'Chọn phrasal verb phù hợp: "We need to _____ a solution before the system goes offline."',
      options: ['come up with', 'come across', 'come into', 'come about'],
      correct: 0,
      explanation: '"Come up with" = nghĩ ra, đưa ra (giải pháp/ý tưởng).'
    },
    {
      content: 'Tìm lỗi sai: "The softwares need to be updated regularly to prevent security breaches."',
      options: ['softwares → software', 'need → needs', 'regularly → regular', 'to prevent → preventing'],
      correct: 0,
      explanation: '"Software" là danh từ không đếm được, không thêm "s".'
    },
    {
      content: 'Chọn từ đúng: "The company requires all employees to _____ a cybersecurity training course annually."',
      options: ['undergo', 'undermine', 'undertake', 'understand'],
      correct: 0,
      explanation: '"Undergo training" = trải qua/tham gia khóa đào tạo.'
    },
    {
      content: 'Chọn câu tường thuật đúng: She asked, "Can you fix the bug by tomorrow?"',
      options: [
        'She asked if I could fix the bug by the next day.',
        'She asked if I can fix the bug by tomorrow.',
        'She asked that I could fix the bug by tomorrow.',
        'She asked whether can I fix the bug by the next day.'
      ],
      correct: 0,
      explanation: 'Reported question (yes/no): asked if/whether + S + V (lùi thì, đổi trạng từ thời gian).'
    },
    {
      content: 'Chọn word formation đúng: "The _____ of the new encryption protocol ensures better data protection."',
      options: ['adoption', 'adopt', 'adopted', 'adoptive'],
      correct: 0,
      explanation: 'Cần danh từ sau mạo từ "The" → "adoption" (sự áp dụng).'
    },
    {
      content: 'Đọc đoạn văn: "Microservices architecture breaks an application into small, independent services that communicate via APIs. Each service can be developed, deployed, and scaled independently." — Đặc điểm chính của microservices là gì?',
      options: [
        'Independent services communicating via APIs',
        'A single large application',
        'Services that cannot be scaled',
        'Dependent components requiring simultaneous deployment'
      ],
      correct: 0,
      explanation: 'Đoạn văn nêu: "small, independent services that communicate via APIs".'
    },
    {
      content: 'Chọn đáp án đúng: "The more complex the algorithm, the _____ time it requires to execute."',
      options: ['more', 'most', 'much', 'many'],
      correct: 0,
      explanation: 'Cấu trúc so sánh kép: The + comparative, the + comparative.'
    },
    {
      content: 'Chọn từ vựng IT: "_____ testing involves testing the software without knowledge of its internal code structure."',
      options: ['Black-box', 'White-box', 'Unit', 'Regression'],
      correct: 0,
      explanation: 'Black-box testing kiểm thử mà không cần biết cấu trúc mã nguồn bên trong.'
    },
    {
      content: 'Điền giới từ: "The developers are accountable _____ the quality of their code."',
      options: ['for', 'to', 'with', 'on'],
      correct: 0,
      explanation: '"Accountable for" = chịu trách nhiệm về (cụm giới từ cố định).'
    },
    {
      content: 'Chọn đáp án đúng: "_____ having limited resources, the startup successfully launched its product."',
      options: ['Despite', 'Although', 'Because', 'Since'],
      correct: 0,
      explanation: '"Despite + V-ing/noun" = mặc dù.'
    },
    {
      content: 'Chọn thì đúng: "While the frontend team _____ the UI, the backend team was building the API."',
      options: ['was designing', 'designed', 'has designed', 'designs'],
      correct: 0,
      explanation: 'Past continuous + while + past continuous: hai hành động xảy ra đồng thời trong quá khứ.'
    },
    {
      content: 'Chọn câu đúng về relative clause:',
      options: [
        'The programmer whose code passed all tests received a bonus.',
        'The programmer who\'s code passed all tests received a bonus.',
        'The programmer whom code passed all tests received a bonus.',
        'The programmer which code passed all tests received a bonus.'
      ],
      correct: 0,
      explanation: '"Whose" dùng làm đại từ quan hệ sở hữu cho người.'
    },
    {
      content: 'Chọn từ đúng: "The technical lead _____ the architecture design to all team members during the meeting."',
      options: ['presented', 'presenced', 'preserved', 'prevented'],
      correct: 0,
      explanation: '"Presented" = trình bày (phù hợp ngữ cảnh cuộc họp).'
    },
    {
      content: 'Chọn cụm từ đúng: "The project was completed _____ schedule and _____ budget."',
      options: ['ahead of / under', 'ahead of / over', 'behind / under', 'on / above'],
      correct: 0,
      explanation: '"Ahead of schedule" = trước thời hạn; "under budget" = dưới ngân sách dự kiến.'
    },
    {
      content: 'Tìm lỗi sai: "The team discussed about the new deployment strategy during the standup meeting."',
      options: ['discussed about → discussed', 'new → newly', 'during → while', 'standup → stand-up'],
      correct: 0,
      explanation: '"Discuss" là ngoại động từ, không cần giới từ "about" sau nó.'
    },
    {
      content: 'Chọn đáp án đúng: "It is essential that every developer _____ the coding standards."',
      options: ['follow', 'follows', 'followed', 'following'],
      correct: 0,
      explanation: 'Subjunctive mood sau "It is essential that": S + V-nguyên mẫu.'
    },
    {
      content: 'Chọn phrasal verb phù hợp: "The legacy system was _____ and replaced with a modern solution."',
      options: ['phased out', 'carried out', 'brought up', 'set up'],
      correct: 0,
      explanation: '"Phase out" = loại bỏ dần, ngừng sử dụng.'
    },
    {
      content: 'Chọn từ đúng: "Blockchain technology provides a _____ and transparent record of transactions."',
      options: ['decentralized', 'centralized', 'decimated', 'decorated'],
      correct: 0,
      explanation: '"Decentralized" (phi tập trung) là đặc điểm cốt lõi của blockchain.'
    },
    {
      content: 'Chọn đáp án đúng: "The code review _____ by the time the senior developer arrives."',
      options: ['will have been completed', 'will complete', 'is completing', 'has completed'],
      correct: 0,
      explanation: 'Future perfect passive (will have been + PP) với "by the time" diễn tả hành động sẽ hoàn thành trước một thời điểm tương lai.'
    },
    {
      content: 'Điền từ vào chỗ trống: "The _____ between the client and server is encrypted using TLS protocol."',
      options: ['communication', 'communicate', 'communicative', 'communicating'],
      correct: 0,
      explanation: 'Cần danh từ làm chủ ngữ → "communication".'
    },
    {
      content: 'Chọn đáp án đúng: "If the tests _____ passed, the code will be merged into the main branch."',
      options: ['have', 'had', 'will have', 'would have'],
      correct: 0,
      explanation: 'Câu điều kiện loại 1 (If + present perfect, will + V): điều kiện có thể xảy ra.'
    },
    {
      content: 'Đọc đoạn văn: "Continuous Integration (CI) is a practice where developers frequently merge code changes into a shared repository. Automated builds and tests run after each merge to detect errors early." — CI giúp phát hiện lỗi như thế nào?',
      options: [
        'Through automated builds and tests after each merge',
        'By manual code inspection only',
        'By deploying directly to production',
        'By reducing the number of merges'
      ],
      correct: 0,
      explanation: 'Đoạn văn nêu: "Automated builds and tests run after each merge to detect errors early".'
    },
    {
      content: 'Chọn từ nối phù hợp: "The application performs well on desktop; _____, it needs optimization for mobile devices."',
      options: ['however', 'therefore', 'moreover', 'likewise'],
      correct: 0,
      explanation: '"However" = tuy nhiên (chỉ sự tương phản).'
    },
    {
      content: 'Chọn dạng đúng: "The client requested the feature _____ before the end of the sprint."',
      options: ['to be delivered', 'delivering', 'deliver', 'delivered'],
      correct: 0,
      explanation: '"Request something to be done" (bị động) vì feature được giao bởi team.'
    },
    {
      content: 'Chọn từ vựng đúng: "A _____ is a reusable solution to a commonly occurring problem in software design."',
      options: ['design pattern', 'data structure', 'algorithm', 'framework'],
      correct: 0,
      explanation: '"Design pattern" (mẫu thiết kế) là giải pháp tái sử dụng cho các vấn đề thiết kế phổ biến.'
    },
    {
      content: 'Chọn đáp án đúng: "_____ the server is properly configured, the application will not run correctly."',
      options: ['Unless', 'If', 'When', 'While'],
      correct: 0,
      explanation: '"Unless" = nếu không, trừ khi (= if...not).'
    },
    {
      content: 'Chọn cấu trúc đúng: "The manager recommended _____ a code review before each deployment."',
      options: ['conducting', 'to conduct', 'conduct', 'conducted'],
      correct: 0,
      explanation: '"Recommend + V-ing" hoặc "recommend that + S + V-nguyên mẫu".'
    },
    {
      content: 'Điền giới từ: "The system is capable _____ processing thousands of requests per second."',
      options: ['of', 'for', 'in', 'to'],
      correct: 0,
      explanation: '"Capable of + V-ing" = có khả năng (cụm giới từ cố định).'
    },
    {
      content: 'Chọn đáp án đúng: "The bug _____ for weeks before it was finally discovered during testing."',
      options: ['had existed', 'has existed', 'existed', 'was existing'],
      correct: 0,
      explanation: 'Past perfect diễn tả hành động xảy ra trước một hành động khác trong quá khứ.'
    },
    {
      content: 'Tìm lỗi sai: "He suggested me to use a different programming language for this project."',
      options: ['suggested me to use → suggested that I use', 'different → differ', 'programming → program', 'for → in'],
      correct: 0,
      explanation: '"Suggest" không dùng pattern "suggest + O + to V". Đúng: "suggest that + S + V-nguyên mẫu".'
    },
    {
      content: 'Chọn từ đúng: "The IT team performed a thorough _____ of the system to identify vulnerabilities."',
      options: ['assessment', 'assess', 'assessing', 'assessed'],
      correct: 0,
      explanation: 'Cần danh từ sau tính từ "thorough" → "assessment" (đánh giá).'
    },
    {
      content: 'Đọc đoạn văn: "Docker containers package software with all its dependencies, ensuring consistent behavior across different environments. Unlike virtual machines, containers share the host OS kernel, making them lightweight." — Containers khác VMs ở điểm nào?',
      options: [
        'Containers share the host OS kernel and are lightweight',
        'Containers are heavier than virtual machines',
        'Containers require separate operating systems',
        'Containers cannot package dependencies'
      ],
      correct: 0,
      explanation: 'Đoạn văn nêu: "containers share the host OS kernel, making them lightweight".'
    },
    {
      content: 'Chọn phrasal verb đúng: "The senior developer will _____ the new intern during the first week."',
      options: ['look after', 'look into', 'look over', 'look up'],
      correct: 0,
      explanation: '"Look after" = chăm sóc, hướng dẫn, quan tâm.'
    },
    {
      content: 'Chọn đáp án đúng: "The data _____ be accessed only by authorized personnel."',
      options: ['should', 'should to', 'should be', 'should being'],
      correct: 0,
      explanation: '"Should be accessed" (bị động) nhưng vì đã có "accessed" → "should" là đủ cho dạng chủ động nếu ta hiểu "data should be accessed". Đáp án A vì câu đầy đủ: "data should be accessed" → cần modal + be + PP.'
    },
    {
      content: 'Chọn từ đúng: "The startup aims to _____ its user base by 200% within the next quarter."',
      options: ['expand', 'expend', 'extend', 'expose'],
      correct: 0,
      explanation: '"Expand" = mở rộng (quy mô, số lượng).'
    },
    {
      content: 'Chọn cấu trúc đúng: "It was not until the third sprint _____ the team identified the performance bottleneck."',
      options: ['that', 'when', 'which', 'where'],
      correct: 0,
      explanation: 'Cấu trúc nhấn mạnh "It was not until...that..." (mãi cho đến khi...thì...).'
    }
  ] as MCQ[],
  essays: [
    {
      content: 'Viết một đoạn văn bằng tiếng Anh (150-250 từ) về xu hướng phát triển ứng dụng di động (mobile app development) hiện nay và dự đoán trong 5 năm tới.',
      explanation: 'Đề cập: cross-platform frameworks, 5G impact, AR/VR integration, AI-powered features, progressive web apps, wearable tech.',
      points: 4
    },
    {
      content: 'Viết một đoạn văn bằng tiếng Anh (150-250 từ) giải thích khái niệm DevOps và tại sao nó quan trọng trong phát triển phần mềm hiện đại.',
      explanation: 'Bao gồm: CI/CD pipeline, collaboration between dev and ops, automation, faster delivery, monitoring, infrastructure as code.',
      points: 4
    },
    {
      content: 'Viết một email chuyên nghiệp bằng tiếng Anh (150-200 từ) để đề xuất áp dụng một công nghệ mới vào dự án hiện tại. Giải thích lý do và lợi ích.',
      explanation: 'Email format: subject line, greeting, context, proposal with justification, expected benefits, call to action, closing.',
      points: 3
    },
    {
      content: 'Viết một bài luận ngắn bằng tiếng Anh (200-250 từ) về chủ đề "Ethical Issues in Artificial Intelligence Development".',
      explanation: 'Thảo luận: bias in algorithms, privacy concerns, job displacement, autonomous weapons, transparency, accountability, regulation needs.',
      points: 5
    },
    {
      content: 'Viết một đoạn văn bằng tiếng Anh (150-250 từ) mô tả quy trình phát triển phần mềm theo mô hình Scrum, bao gồm các vai trò và sự kiện chính.',
      explanation: 'Roles: Product Owner, Scrum Master, Development Team. Events: Sprint Planning, Daily Standup, Sprint Review, Retrospective.',
      points: 4
    },
    {
      content: 'Viết một đoạn văn bằng tiếng Anh (150-250 từ) về tầm quan trọng của việc viết tài liệu kỹ thuật (technical documentation) trong các dự án phần mềm.',
      explanation: 'Đề cập: knowledge sharing, onboarding new members, maintenance, API documentation, code comments, README files, user manuals.',
      points: 3
    },
    {
      content: 'Viết một bài luận ngắn bằng tiếng Anh (200-250 từ) thảo luận về Big Data: định nghĩa, ứng dụng thực tế, và thách thức trong việc xử lý dữ liệu lớn.',
      explanation: 'Cover: 3Vs (Volume, Velocity, Variety), applications (healthcare, marketing, finance), challenges (storage, processing, privacy, quality).',
      points: 5
    },
    {
      content: 'Viết một đoạn văn bằng tiếng Anh (150-200 từ) mô tả sự khác biệt giữa SQL và NoSQL databases, và khi nào nên sử dụng mỗi loại.',
      explanation: 'So sánh: structure (relational vs document/key-value), scalability, ACID compliance, use cases, query language, flexibility.',
      points: 3
    },
    {
      content: 'Viết một đoạn văn bằng tiếng Anh (150-250 từ) về cách xây dựng và duy trì một portfolio trực tuyến hiệu quả cho lập trình viên.',
      explanation: 'Include: project showcase, GitHub profile, personal website, blog posts, open-source contributions, skills demonstration, networking.',
      points: 3
    },
    {
      content: 'Viết một bài luận ngắn bằng tiếng Anh (200-250 từ) về chủ đề "The Future of Web Development: Trends and Technologies to Watch".',
      explanation: 'Discuss: WebAssembly, serverless architecture, JAMstack, AI integration, Web3, progressive enhancement, accessibility-first design.',
      points: 5
    }
  ] as Essay[]
};
