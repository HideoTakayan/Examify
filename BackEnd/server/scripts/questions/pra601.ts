type MCQ = { content: string; options: string[]; correct: number; explanation?: string };
type Essay = { content: string; explanation?: string; points?: number };

export const praQ1 = {
  mcqs: [
    {
      content: 'Lệnh nào trong Linux dùng để xem danh sách các tiến trình đang chạy cùng với mức sử dụng CPU và RAM theo thời gian thực?',
      options: ['ps aux', 'top', 'ls -la', 'df -h'],
      correct: 1,
      explanation: 'Lệnh top hiển thị danh sách tiến trình đang chạy theo thời gian thực, bao gồm thông tin CPU, RAM.'
    },
    {
      content: 'Trong Ubuntu Server, file cấu hình mạng sử dụng Netplan nằm ở thư mục nào?',
      options: ['/etc/network/interfaces', '/etc/netplan/', '/etc/sysconfig/network-scripts/', '/etc/NetworkManager/'],
      correct: 1,
      explanation: 'Ubuntu 18.04+ sử dụng Netplan với file cấu hình nằm trong /etc/netplan/.'
    },
    {
      content: 'Cổng mặc định của dịch vụ SSH là bao nhiêu?',
      options: ['21', '22', '23', '25'],
      correct: 1,
      explanation: 'SSH (Secure Shell) sử dụng cổng 22 theo mặc định.'
    },
    {
      content: 'Lệnh nào dùng để cấp quyền thực thi cho một script trong Linux?',
      options: ['chmod +x script.sh', 'chown +x script.sh', 'chgrp +x script.sh', 'setfacl +x script.sh'],
      correct: 0,
      explanation: 'chmod +x thêm quyền thực thi (execute) cho file.'
    },
    {
      content: 'Trong DNS, bản ghi loại nào dùng để ánh xạ tên miền sang địa chỉ IPv4?',
      options: ['AAAA', 'CNAME', 'A', 'MX'],
      correct: 2,
      explanation: 'Bản ghi A (Address) ánh xạ tên miền sang địa chỉ IPv4.'
    },
    {
      content: 'DHCP server cấp phát thông tin nào cho client? (Chọn đáp án đầy đủ nhất)',
      options: ['Chỉ địa chỉ IP', 'Địa chỉ IP và subnet mask', 'Địa chỉ IP, subnet mask, gateway và DNS', 'Chỉ DNS server'],
      correct: 2,
      explanation: 'DHCP cấp phát đầy đủ: IP, subnet mask, default gateway, DNS server và các tùy chọn khác.'
    },
    {
      content: 'File cấu hình chính của Apache trên CentOS nằm ở đâu?',
      options: ['/etc/apache2/apache2.conf', '/etc/httpd/conf/httpd.conf', '/etc/nginx/nginx.conf', '/usr/local/apache/conf/httpd.conf'],
      correct: 1,
      explanation: 'Trên CentOS/RHEL, Apache sử dụng file cấu hình /etc/httpd/conf/httpd.conf.'
    },
    {
      content: 'Directive nào trong Nginx dùng để cấu hình reverse proxy?',
      options: ['proxy_pass', 'ProxyPass', 'reverse_proxy', 'upstream_pass'],
      correct: 0,
      explanation: 'proxy_pass là directive của Nginx để chuyển tiếp request đến backend server.'
    },
    {
      content: 'Lệnh Docker nào dùng để xây dựng image từ Dockerfile?',
      options: ['docker run', 'docker build', 'docker create', 'docker compose'],
      correct: 1,
      explanation: 'docker build đọc Dockerfile và tạo image từ các instruction trong đó.'
    },
    {
      content: 'Trong Docker, lệnh nào liệt kê tất cả container bao gồm cả container đã dừng?',
      options: ['docker ps', 'docker ps -a', 'docker list --all', 'docker container ls --running'],
      correct: 1,
      explanation: 'docker ps -a hiển thị tất cả container, kể cả những container đã dừng (exited).'
    },
    {
      content: 'Trong iptables, chain nào xử lý các gói tin đi vào hệ thống?',
      options: ['OUTPUT', 'FORWARD', 'INPUT', 'PREROUTING'],
      correct: 2,
      explanation: 'Chain INPUT xử lý các gói tin có đích đến là chính máy chủ đó.'
    },
    {
      content: 'Giao thức VPN nào được đánh giá có tốc độ nhanh nhất hiện nay?',
      options: ['PPTP', 'L2TP/IPSec', 'OpenVPN', 'WireGuard'],
      correct: 3,
      explanation: 'WireGuard được thiết kế với mã nguồn gọn nhẹ, hiệu suất cao hơn các giao thức VPN truyền thống.'
    },
    {
      content: 'Load balancer thuật toán Round Robin hoạt động như thế nào?',
      options: ['Chọn server có ít kết nối nhất', 'Phân phối lần lượt đều cho từng server', 'Chọn server ngẫu nhiên', 'Chọn server có thời gian phản hồi nhanh nhất'],
      correct: 1,
      explanation: 'Round Robin phân phối request lần lượt đều cho các server theo thứ tự vòng tròn.'
    },
    {
      content: 'SSL/TLS certificate loại nào xác thực cả tên miền và thông tin tổ chức?',
      options: ['DV (Domain Validation)', 'OV (Organization Validation)', 'Self-signed', 'Wildcard'],
      correct: 1,
      explanation: 'OV Certificate xác thực cả domain và thông tin tổ chức sở hữu domain đó.'
    },
    {
      content: 'Lệnh nào tạo database mới trong MySQL?',
      options: ['NEW DATABASE dbname;', 'CREATE DATABASE dbname;', 'MAKE DATABASE dbname;', 'ADD DATABASE dbname;'],
      correct: 1,
      explanation: 'CREATE DATABASE là cú pháp SQL chuẩn để tạo database mới trong MySQL.'
    },
    {
      content: 'Công cụ giám sát mạng nào sử dụng giao thức SNMP để thu thập dữ liệu?',
      options: ['Wireshark', 'Nagios', 'Zabbix', 'Cả Nagios và Zabbix'],
      correct: 3,
      explanation: 'Cả Nagios và Zabbix đều hỗ trợ SNMP để thu thập thông tin giám sát từ thiết bị mạng.'
    },
    {
      content: 'Trong VMware ESXi, loại ổ đĩa ảo nào phân bổ toàn bộ dung lượng ngay khi tạo?',
      options: ['Thin Provisioned', 'Thick Provisioned Eager Zeroed', 'Dynamic Disk', 'Differencing Disk'],
      correct: 1,
      explanation: 'Thick Provisioned Eager Zeroed phân bổ và ghi zero toàn bộ dung lượng ngay khi tạo, cho hiệu suất I/O tốt nhất.'
    },
    {
      content: 'Active Directory sử dụng giao thức xác thực nào làm mặc định?',
      options: ['NTLM', 'Kerberos', 'RADIUS', 'LDAP'],
      correct: 1,
      explanation: 'Kerberos là giao thức xác thực mặc định trong Active Directory từ Windows 2000.'
    },
    {
      content: 'Chiến lược backup nào kết hợp full backup với incremental backup?',
      options: ['Mirror backup', 'Grandfather-Father-Son (GFS)', 'Snapshot backup', 'Continuous Data Protection'],
      correct: 1,
      explanation: 'GFS kết hợp daily incremental (Son), weekly full (Father), và monthly full (Grandfather).'
    },
    {
      content: 'Lệnh systemctl nào dùng để khởi động dịch vụ nginx và đặt tự động chạy khi boot?',
      options: ['systemctl start nginx && systemctl enable nginx', 'systemctl run nginx --boot', 'service nginx start --permanent', 'systemctl activate nginx'],
      correct: 0,
      explanation: 'systemctl start khởi động dịch vụ ngay, systemctl enable đặt tự chạy khi boot.'
    },
    {
      content: 'Trong Docker Compose, từ khóa nào dùng để khai báo các dịch vụ?',
      options: ['containers', 'services', 'applications', 'instances'],
      correct: 1,
      explanation: 'Docker Compose sử dụng từ khóa services để khai báo các container/dịch vụ.'
    },
    {
      content: 'Lệnh nào kiểm tra kết nối mạng đến một host trên port cụ thể?',
      options: ['ping host:port', 'telnet host port', 'traceroute host port', 'nslookup host port'],
      correct: 1,
      explanation: 'telnet cho phép kiểm tra kết nối TCP đến host trên port cụ thể.'
    },
    {
      content: 'Trong CI/CD, stage nào thường được thực hiện đầu tiên trong pipeline?',
      options: ['Deploy', 'Test', 'Build', 'Release'],
      correct: 2,
      explanation: 'Build thường là stage đầu tiên để biên dịch mã nguồn trước khi test và deploy.'
    },
    {
      content: 'File /etc/fstab trong Linux dùng để làm gì?',
      options: ['Cấu hình firewall', 'Cấu hình mount point tự động khi boot', 'Cấu hình DNS', 'Cấu hình user'],
      correct: 1,
      explanation: '/etc/fstab chứa thông tin về các filesystem và mount point được mount tự động khi khởi động.'
    },
    {
      content: 'Nginx xử lý kết nối đồng thời theo mô hình nào?',
      options: ['Process-per-connection', 'Thread-per-connection', 'Event-driven (asynchronous)', 'Fork-on-demand'],
      correct: 2,
      explanation: 'Nginx sử dụng mô hình event-driven, xử lý nhiều kết nối trong một process worker.'
    },
    {
      content: 'Lệnh nào trong Linux hiển thị dung lượng ổ đĩa đã sử dụng?',
      options: ['du -sh', 'df -h', 'ls -lh', 'free -h'],
      correct: 1,
      explanation: 'df -h (disk free) hiển thị thông tin dung lượng sử dụng của các filesystem dưới dạng human-readable.'
    },
    {
      content: 'Trong Windows Server, role nào cung cấp dịch vụ DHCP?',
      options: ['Active Directory Domain Services', 'DHCP Server', 'DNS Server', 'File and Storage Services'],
      correct: 1,
      explanation: 'DHCP Server role cần được cài đặt để cung cấp dịch vụ cấp phát IP tự động.'
    },
    {
      content: 'Lệnh Docker nào dùng để xem log của một container đang chạy?',
      options: ['docker inspect', 'docker logs', 'docker info', 'docker stats'],
      correct: 1,
      explanation: 'docker logs hiển thị output (stdout/stderr) của container.'
    },
    {
      content: 'Trong PostgreSQL, lệnh nào dùng để tạo user mới với quyền tạo database?',
      options: ['CREATE USER username;', 'CREATE ROLE username WITH LOGIN CREATEDB;', 'ADD USER username GRANT ALL;', 'INSERT INTO pg_users VALUES(username);'],
      correct: 1,
      explanation: 'CREATE ROLE với các thuộc tính LOGIN và CREATEDB tạo user có quyền đăng nhập và tạo database.'
    },
    {
      content: 'Cơ chế NAT (Network Address Translation) hoạt động ở tầng nào của mô hình OSI?',
      options: ['Tầng 2 (Data Link)', 'Tầng 3 (Network)', 'Tầng 4 (Transport)', 'Tầng 7 (Application)'],
      correct: 1,
      explanation: 'NAT hoạt động ở tầng Network, thay đổi địa chỉ IP trong header của gói tin.'
    },
    {
      content: 'Lệnh nào trong iptables cho phép lưu lượng HTTP (port 80) đi vào?',
      options: [
        'iptables -A INPUT -p tcp --dport 80 -j ACCEPT',
        'iptables -A OUTPUT -p tcp --dport 80 -j ACCEPT',
        'iptables -A FORWARD -p tcp --dport 80 -j ACCEPT',
        'iptables -A INPUT -p udp --dport 80 -j ACCEPT'
      ],
      correct: 0,
      explanation: 'Rule trên chain INPUT, protocol TCP, destination port 80, action ACCEPT cho phép traffic HTTP đi vào.'
    },
    {
      content: 'Hyper-V Generation 2 VM hỗ trợ boot từ đâu?',
      options: ['Chỉ BIOS', 'UEFI', 'Chỉ từ CD/DVD', 'Chỉ PXE'],
      correct: 1,
      explanation: 'Hyper-V Generation 2 sử dụng UEFI firmware thay vì BIOS truyền thống.'
    },
    {
      content: 'Trong Nginx, directive worker_processes auto có ý nghĩa gì?',
      options: [
        'Tự động khởi động lại worker khi crash',
        'Số worker process bằng số CPU cores',
        'Tự động scale worker theo tải',
        'Không giới hạn số worker'
      ],
      correct: 1,
      explanation: 'auto đặt số worker processes bằng số CPU cores có sẵn trên hệ thống.'
    },
    {
      content: 'Lệnh certbot nào dùng để lấy SSL certificate từ Let\'s Encrypt cho Nginx?',
      options: [
        'certbot --nginx',
        'certbot --apache',
        'certbot generate --ssl',
        'certbot request --domain'
      ],
      correct: 0,
      explanation: 'certbot --nginx tự động lấy certificate và cấu hình SSL cho Nginx.'
    },
    {
      content: 'Trong Docker, volume mount và bind mount khác nhau ở điểm nào?',
      options: [
        'Volume mount nhanh hơn bind mount',
        'Volume được Docker quản lý, bind mount trỏ trực tiếp đến path trên host',
        'Bind mount chỉ dùng cho Linux',
        'Không có sự khác biệt'
      ],
      correct: 1,
      explanation: 'Volume được Docker quản lý trong /var/lib/docker/volumes/, còn bind mount map trực tiếp thư mục host vào container.'
    },
    {
      content: 'Group Policy trong Active Directory được áp dụng theo thứ tự nào?',
      options: [
        'Site → Domain → OU',
        'OU → Domain → Site',
        'Domain → Site → OU',
        'Local → Site → Domain → OU'
      ],
      correct: 3,
      explanation: 'GPO được áp dụng theo thứ tự LSDOU: Local → Site → Domain → OU, policy sau ghi đè policy trước.'
    },
    {
      content: 'Lệnh rsync nào sao chép thư mục /data đến server backup qua SSH?',
      options: [
        'rsync -avz /data user@backup:/backup/',
        'rsync /data backup:/backup/',
        'scp -r /data backup:/backup/',
        'rsync --remote /data user@backup'
      ],
      correct: 0,
      explanation: 'rsync -avz sao chép đệ quy (-a), verbose (-v), nén (-z) qua SSH đến remote server.'
    },
    {
      content: 'Trong CI/CD với GitLab, file cấu hình pipeline có tên mặc định là gì?',
      options: ['Jenkinsfile', '.gitlab-ci.yml', 'pipeline.yaml', '.github/workflows/main.yml'],
      correct: 1,
      explanation: 'GitLab CI/CD sử dụng file .gitlab-ci.yml ở root repository để định nghĩa pipeline.'
    },
    {
      content: 'Lệnh nào kiểm tra trạng thái RAID trên Linux sử dụng mdadm?',
      options: [
        'mdadm --detail /dev/md0',
        'raid --status',
        'cat /proc/raid',
        'fdisk -l --raid'
      ],
      correct: 0,
      explanation: 'mdadm --detail hiển thị thông tin chi tiết về mảng RAID bao gồm trạng thái các disk.'
    },
    {
      content: 'Trong pfSense, rule firewall được xử lý theo nguyên tắc nào?',
      options: [
        'Last match wins',
        'First match wins',
        'Most specific match wins',
        'Random order'
      ],
      correct: 1,
      explanation: 'pfSense xử lý rule từ trên xuống dưới, rule đầu tiên khớp sẽ được áp dụng (first match wins).'
    }
  ] as MCQ[],
  essays: [
    {
      content: 'Trình bày quy trình cài đặt và cấu hình một web server Apache trên Ubuntu Server 22.04. Bao gồm: cài đặt, tạo Virtual Host, cấu hình SSL với Let\'s Encrypt, và tối ưu hiệu suất cơ bản.',
      explanation: 'Cần đề cập: apt install apache2, tạo file .conf trong sites-available, a2ensite, cài certbot, cấu hình mod_deflate, KeepAlive, MPM.',
      points: 5
    },
    {
      content: 'So sánh ưu nhược điểm giữa Apache và Nginx. Trong trường hợp nào nên chọn Nginx thay vì Apache và ngược lại? Cho ví dụ thực tế.',
      explanation: 'Apache: .htaccess, module phong phú, process-based. Nginx: event-driven, reverse proxy tốt, static content nhanh. Chọn Apache cho shared hosting, Nginx cho high traffic.',
      points: 4
    },
    {
      content: 'Thiết kế một hệ thống CI/CD pipeline hoàn chỉnh cho ứng dụng web Node.js sử dụng GitLab CI. Mô tả các stage, job và cách triển khai tự động lên server production.',
      explanation: 'Stages: build, test, deploy_staging, deploy_production. Sử dụng Docker, unit test, integration test, deploy qua SSH hoặc Docker registry.',
      points: 5
    },
    {
      content: 'Giải thích cách cấu hình DHCP server trên Windows Server 2019. Bao gồm: tạo scope, reservation, DHCP relay agent và các biện pháp bảo mật.',
      explanation: 'Cài role DHCP, tạo scope với range IP, exclusion, reservation theo MAC, cấu hình relay agent cho multi-subnet, DHCP snooping.',
      points: 4
    },
    {
      content: 'Trình bày cách triển khai hệ thống Docker Swarm với 3 node (1 manager, 2 worker). Giải thích cách deploy service, scaling và xử lý khi một node bị lỗi.',
      explanation: 'docker swarm init, join-token, docker service create --replicas, docker service scale, tự động reschedule container khi node fail.',
      points: 5
    },
    {
      content: 'Mô tả quy trình cấu hình VPN site-to-site sử dụng OpenVPN giữa hai văn phòng. Bao gồm: tạo CA, cấp certificate, cấu hình server/client và routing.',
      explanation: 'Tạo CA với easy-rsa, generate server/client cert, cấu hình tun/tap, push route, iptables NAT/FORWARD, verify connectivity.',
      points: 5
    },
    {
      content: 'Thiết kế chiến lược backup cho hệ thống database MySQL production. Bao gồm: phương pháp backup, lịch trình, retention policy, quy trình restore và kiểm tra tính toàn vẹn.',
      explanation: 'mysqldump logical backup, xtrabackup physical backup, GFS schedule, point-in-time recovery với binlog, test restore định kỳ, checksum verification.',
      points: 4
    },
    {
      content: 'Trình bày cách cấu hình hệ thống giám sát mạng sử dụng Zabbix. Bao gồm: cài đặt server, agent, tạo template, trigger cảnh báo và dashboard.',
      explanation: 'Cài Zabbix server + DB + frontend, deploy agent trên host, tạo template với items/triggers, cấu hình action notification (email/Telegram), tạo dashboard tùy chỉnh.',
      points: 4
    },
    {
      content: 'Giải thích cách triển khai Load Balancer sử dụng HAProxy cho cụm web server. Bao gồm: thuật toán cân bằng tải, health check, sticky session và SSL termination.',
      explanation: 'Cài HAProxy, cấu hình frontend/backend, thuật toán roundrobin/leastconn, option httpchk, cookie-based sticky session, SSL termination với certificate.',
      points: 5
    },
    {
      content: 'Mô tả quy trình cài đặt và quản lý Active Directory Domain Services trên Windows Server. Bao gồm: promote DC, tạo OU structure, Group Policy cho bảo mật, và disaster recovery.',
      explanation: 'Install-WindowsFeature AD-DS, dcpromo, thiết kế OU theo phòng ban, GPO password policy/software restriction, backup System State, DSRM recovery.',
      points: 5
    }
  ] as Essay[]
};

export const praQ2 = {
  mcqs: [
    {
      content: 'Lệnh nào trong Linux hiển thị thông tin chi tiết về các interface mạng bao gồm địa chỉ IP, MAC?',
      options: ['ifconfig', 'ip addr show', 'netstat -i', 'route -n'],
      correct: 1,
      explanation: 'ip addr show (hoặc ip a) là lệnh hiện đại thay thế ifconfig, hiển thị đầy đủ thông tin network interface.'
    },
    {
      content: 'Trong CentOS 8+, công cụ quản lý firewall mặc định là gì?',
      options: ['iptables', 'ufw', 'firewalld', 'nftables'],
      correct: 2,
      explanation: 'CentOS 8+ sử dụng firewalld làm frontend quản lý firewall mặc định, backend là nftables.'
    },
    {
      content: 'Lệnh nào tạo một Docker network loại bridge có tên "app-network"?',
      options: [
        'docker network create --driver bridge app-network',
        'docker create network bridge app-network',
        'docker network add app-network --type bridge',
        'docker net create app-network'
      ],
      correct: 0,
      explanation: 'docker network create với --driver bridge tạo bridge network cho container giao tiếp.'
    },
    {
      content: 'Trong DNS, bản ghi PTR dùng để làm gì?',
      options: [
        'Ánh xạ tên miền sang IP',
        'Ánh xạ IP sang tên miền (reverse DNS)',
        'Chỉ định mail server',
        'Tạo alias cho tên miền'
      ],
      correct: 1,
      explanation: 'PTR record (Pointer) thực hiện reverse DNS lookup, ánh xạ địa chỉ IP ngược về tên miền.'
    },
    {
      content: 'Lệnh nào kiểm tra port nào đang được listen trên Linux?',
      options: ['netstat -an', 'ss -tlnp', 'lsof -i', 'Cả ss -tlnp và lsof -i đều đúng'],
      correct: 3,
      explanation: 'Cả ss -tlnp (socket statistics) và lsof -i đều hiển thị các port đang listen cùng process tương ứng.'
    },
    {
      content: 'Trong Dockerfile, instruction nào được thực thi khi container khởi động?',
      options: ['RUN', 'CMD', 'COPY', 'ADD'],
      correct: 1,
      explanation: 'CMD chỉ định lệnh mặc định chạy khi container start, khác với RUN chạy lúc build image.'
    },
    {
      content: 'Windows Server Core khác Windows Server Desktop Experience ở điểm nào?',
      options: [
        'Không hỗ trợ Active Directory',
        'Không có giao diện đồ họa (GUI)',
        'Không hỗ trợ Hyper-V',
        'Không thể join domain'
      ],
      correct: 1,
      explanation: 'Server Core là bản cài minimal không có GUI, quản trị qua PowerShell hoặc remote tools, tiết kiệm tài nguyên.'
    },
    {
      content: 'Lệnh PowerShell nào dùng để cài đặt Windows Feature?',
      options: [
        'Add-WindowsFeature',
        'Install-WindowsFeature',
        'Enable-WindowsOptionalFeature',
        'Cả Install-WindowsFeature và Add-WindowsFeature'
      ],
      correct: 3,
      explanation: 'Add-WindowsFeature là alias của Install-WindowsFeature, cả hai đều dùng để cài đặt role/feature.'
    },
    {
      content: 'Trong MySQL, lệnh nào cấp tất cả quyền cho user "appuser" trên database "appdb" từ mọi host?',
      options: [
        'GRANT ALL ON appdb.* TO appuser@localhost;',
        'GRANT ALL PRIVILEGES ON appdb.* TO \'appuser\'@\'%\';',
        'GRANT * ON appdb TO appuser;',
        'SET PRIVILEGES ALL FOR appuser ON appdb;'
      ],
      correct: 1,
      explanation: '\'%\' trong MySQL đại diện cho mọi host, GRANT ALL PRIVILEGES ON database.* cấp toàn quyền trên database.'
    },
    {
      content: 'Thuật toán Least Connections trong load balancing phù hợp với trường hợp nào?',
      options: [
        'Khi tất cả request có thời gian xử lý giống nhau',
        'Khi các request có thời gian xử lý khác nhau đáng kể',
        'Khi cần sticky session',
        'Khi chỉ có 2 server'
      ],
      correct: 1,
      explanation: 'Least Connections chọn server có ít kết nối nhất, phù hợp khi request có thời gian xử lý khác nhau.'
    },
    {
      content: 'Trong Linux, lệnh nào thay đổi hostname vĩnh viễn?',
      options: [
        'hostname newname',
        'hostnamectl set-hostname newname',
        'echo newname > /etc/hostname',
        'Cả B và C đều đúng'
      ],
      correct: 3,
      explanation: 'hostnamectl set-hostname và chỉnh /etc/hostname đều thay đổi hostname vĩnh viễn (persist qua reboot).'
    },
    {
      content: 'SSL/TLS handshake sử dụng loại mã hóa nào để trao đổi khóa?',
      options: [
        'Mã hóa đối xứng (symmetric)',
        'Mã hóa bất đối xứng (asymmetric)',
        'Hashing',
        'Không sử dụng mã hóa'
      ],
      correct: 1,
      explanation: 'TLS handshake dùng mã hóa bất đối xứng (RSA/ECDHE) để trao đổi session key, sau đó dùng đối xứng cho data.'
    },
    {
      content: 'Trong Docker Compose, keyword "depends_on" có tác dụng gì?',
      options: [
        'Đảm bảo service khác đã healthy trước khi start',
        'Chỉ xác định thứ tự khởi động container',
        'Tạo network link giữa các container',
        'Chia sẻ volume giữa các container'
      ],
      correct: 1,
      explanation: 'depends_on chỉ đảm bảo thứ tự start, KHÔNG đợi service ready. Cần healthcheck cho đảm bảo ready.'
    },
    {
      content: 'Nagios sử dụng khái niệm nào để phân loại trạng thái dịch vụ?',
      options: [
        'Up/Down',
        'OK/Warning/Critical/Unknown',
        'Green/Yellow/Red',
        'Active/Inactive/Error'
      ],
      correct: 1,
      explanation: 'Nagios phân loại service state thành 4 mức: OK (0), Warning (1), Critical (2), Unknown (3).'
    },
    {
      content: 'Trong VMware vSphere, vMotion cho phép làm gì?',
      options: [
        'Clone VM sang host khác',
        'Di chuyển VM đang chạy sang host khác không downtime',
        'Backup VM tự động',
        'Tăng RAM cho VM đang chạy'
      ],
      correct: 1,
      explanation: 'vMotion cho phép live migration - di chuyển VM đang chạy giữa các ESXi host mà không cần shutdown.'
    },
    {
      content: 'Lệnh nào trong Linux xem nội dung file log theo thời gian thực?',
      options: ['cat /var/log/syslog', 'tail -f /var/log/syslog', 'head /var/log/syslog', 'less /var/log/syslog'],
      correct: 1,
      explanation: 'tail -f theo dõi file liên tục, hiển thị nội dung mới được ghi vào file theo thời gian thực.'
    },
    {
      content: 'Trong Nginx, block "upstream" dùng để làm gì?',
      options: [
        'Cấu hình SSL',
        'Định nghĩa nhóm backend server cho load balancing',
        'Cấu hình access log',
        'Giới hạn bandwidth'
      ],
      correct: 1,
      explanation: 'upstream block định nghĩa một nhóm server backend, kết hợp với proxy_pass để load balancing.'
    },
    {
      content: 'Cron expression "0 2 * * 0" có nghĩa là gì?',
      options: [
        'Chạy lúc 2h sáng mỗi ngày',
        'Chạy lúc 2h sáng Chủ nhật hàng tuần',
        'Chạy mỗi 2 giờ',
        'Chạy vào ngày 2 hàng tháng'
      ],
      correct: 1,
      explanation: 'Format: phút(0) giờ(2) ngày(*) tháng(*) thứ(0=CN). Tức 2:00 AM mỗi Chủ nhật.'
    },
    {
      content: 'Trong PostgreSQL, lệnh nào sao lưu toàn bộ database "mydb" ra file SQL?',
      options: [
        'pg_dump mydb > backup.sql',
        'mysqldump mydb > backup.sql',
        'psql --backup mydb',
        'pg_backup mydb --output backup.sql'
      ],
      correct: 0,
      explanation: 'pg_dump là công cụ backup logical của PostgreSQL, xuất database thành file SQL.'
    },
    {
      content: 'LVM (Logical Volume Manager) trong Linux cho phép làm gì?',
      options: [
        'Chỉ tạo RAID',
        'Quản lý và mở rộng partition linh hoạt khi hệ thống đang chạy',
        'Mã hóa ổ đĩa',
        'Nén dữ liệu tự động'
      ],
      correct: 1,
      explanation: 'LVM cho phép resize, extend, snapshot logical volume mà không cần unmount hay reboot.'
    },
    {
      content: 'Giao thức SNMP version 3 cải thiện điều gì so với v1/v2c?',
      options: [
        'Tốc độ truyền dữ liệu',
        'Bảo mật (authentication và encryption)',
        'Số lượng OID hỗ trợ',
        'Khả năng tương thích ngược'
      ],
      correct: 1,
      explanation: 'SNMPv3 bổ sung authentication (MD5/SHA) và encryption (DES/AES), khắc phục yếu điểm bảo mật của v1/v2c.'
    },
    {
      content: 'Trong Kubernetes, Pod là gì?',
      options: [
        'Một cluster node',
        'Đơn vị deploy nhỏ nhất, chứa một hoặc nhiều container',
        'Một virtual network',
        'Một storage volume'
      ],
      correct: 1,
      explanation: 'Pod là đơn vị nhỏ nhất trong Kubernetes, có thể chứa một hoặc nhiều container chia sẻ network/storage.'
    },
    {
      content: 'Lệnh nào tạo SSH key pair loại ED25519?',
      options: [
        'ssh-keygen -t rsa -b 4096',
        'ssh-keygen -t ed25519',
        'ssh-keygen -t dsa',
        'ssh-keygen --type ecdsa'
      ],
      correct: 1,
      explanation: 'ssh-keygen -t ed25519 tạo key pair sử dụng thuật toán Ed25519, ngắn gọn và an toàn hơn RSA.'
    },
    {
      content: 'Trong Apache, module nào cho phép rewrite URL?',
      options: ['mod_proxy', 'mod_rewrite', 'mod_ssl', 'mod_headers'],
      correct: 1,
      explanation: 'mod_rewrite cho phép viết rule rewrite/redirect URL sử dụng regular expression.'
    },
    {
      content: 'RAID 10 kết hợp những mức RAID nào?',
      options: ['RAID 0 + RAID 1', 'RAID 1 + RAID 0', 'RAID 1 + RAID 5', 'RAID 0 + RAID 5'],
      correct: 1,
      explanation: 'RAID 10 (1+0) mirror trước (RAID 1), rồi stripe (RAID 0), cho hiệu suất và dự phòng tốt.'
    },
    {
      content: 'Lệnh Docker nào xóa tất cả image không được sử dụng?',
      options: [
        'docker image rm --all',
        'docker image prune -a',
        'docker rmi *',
        'docker clean images'
      ],
      correct: 1,
      explanation: 'docker image prune -a xóa tất cả image không được container nào sử dụng.'
    },
    {
      content: 'Trong Windows Server, GPO (Group Policy Object) được lưu trữ ở đâu?',
      options: [
        'Registry của mỗi máy client',
        'SYSVOL folder trên Domain Controller',
        'File share trên member server',
        'Azure AD cloud'
      ],
      correct: 1,
      explanation: 'GPO được lưu trong SYSVOL (\\\\domain\\SYSVOL) trên DC và replicate giữa các DC.'
    },
    {
      content: 'Công cụ nào dùng để quản lý SSL certificate trên Linux thông qua ACME protocol?',
      options: ['openssl', 'certbot', 'keytool', 'ca-certificates'],
      correct: 1,
      explanation: 'Certbot sử dụng ACME protocol để tự động lấy và renew certificate từ Let\'s Encrypt.'
    },
    {
      content: 'Trong Jenkins, Jenkinsfile dùng ngôn ngữ nào để viết pipeline?',
      options: ['YAML', 'JSON', 'Groovy', 'Python'],
      correct: 2,
      explanation: 'Jenkinsfile sử dụng Groovy DSL (Domain Specific Language) để định nghĩa pipeline.'
    },
    {
      content: 'Lệnh nào trong Linux thêm user "deploy" vào group "docker"?',
      options: [
        'usermod -aG docker deploy',
        'groupadd deploy docker',
        'adduser docker deploy',
        'useradd -g docker deploy'
      ],
      correct: 0,
      explanation: 'usermod -aG (append Group) thêm user vào group phụ mà không xóa membership group khác.'
    },
    {
      content: 'Trong networking, VLAN dùng để làm gì?',
      options: [
        'Tăng băng thông mạng',
        'Chia mạng vật lý thành các mạng logic riêng biệt',
        'Mã hóa dữ liệu trên mạng',
        'Kết nối các mạng WAN'
      ],
      correct: 1,
      explanation: 'VLAN (Virtual LAN) phân chia broadcast domain trên cùng hạ tầng vật lý thành các mạng logic.'
    },
    {
      content: 'Lệnh nào kiểm tra certificate SSL của một website từ command line?',
      options: [
        'curl --cert example.com',
        'openssl s_client -connect example.com:443',
        'wget --check-ssl example.com',
        'nmap --ssl example.com'
      ],
      correct: 1,
      explanation: 'openssl s_client kết nối đến server và hiển thị thông tin certificate, chain, handshake.'
    },
    {
      content: 'Trong Zabbix, "item" là gì?',
      options: [
        'Một host được giám sát',
        'Một metric/dữ liệu cụ thể được thu thập từ host',
        'Một cảnh báo',
        'Một dashboard widget'
      ],
      correct: 1,
      explanation: 'Item trong Zabbix là một metric đơn lẻ được thu thập (CPU usage, memory free, disk I/O...).'
    },
    {
      content: 'Trong Docker, multi-stage build có lợi ích gì?',
      options: [
        'Chạy nhiều container cùng lúc',
        'Giảm kích thước image cuối cùng bằng cách tách build và runtime',
        'Build song song trên nhiều máy',
        'Hỗ trợ nhiều kiến trúc CPU'
      ],
      correct: 1,
      explanation: 'Multi-stage build cho phép dùng stage riêng để build (có compiler, tools), rồi copy artifact sang stage nhỏ gọn hơn cho runtime.'
    },
    {
      content: 'Lệnh firewall-cmd nào mở port 443 vĩnh viễn trên CentOS?',
      options: [
        'firewall-cmd --add-port=443/tcp',
        'firewall-cmd --permanent --add-port=443/tcp && firewall-cmd --reload',
        'iptables -A INPUT -p tcp --dport 443 -j ACCEPT',
        'ufw allow 443'
      ],
      correct: 1,
      explanation: '--permanent lưu rule vĩnh viễn, --reload áp dụng thay đổi ngay lập tức.'
    },
    {
      content: 'Trong Active Directory, OU (Organizational Unit) dùng để làm gì?',
      options: [
        'Xác thực user',
        'Tổ chức objects và áp dụng Group Policy',
        'Lưu trữ file',
        'Quản lý DNS'
      ],
      correct: 1,
      explanation: 'OU là container dùng để tổ chức users, computers, groups và áp dụng GPO theo cấu trúc tổ chức.'
    },
    {
      content: 'Trong Hyper-V, checkpoint (snapshot) dùng để làm gì?',
      options: [
        'Backup VM ra file',
        'Lưu trạng thái VM tại thời điểm nhất định để có thể rollback',
        'Clone VM sang host khác',
        'Tăng dung lượng đĩa ảo'
      ],
      correct: 1,
      explanation: 'Checkpoint lưu trạng thái hoàn chỉnh của VM (disk, memory, config) để có thể revert về thời điểm đó.'
    },
    {
      content: 'Giao thức nào được sử dụng để đồng bộ thời gian giữa các server?',
      options: ['SNMP', 'NTP', 'SMTP', 'STP'],
      correct: 1,
      explanation: 'NTP (Network Time Protocol) đồng bộ đồng hồ hệ thống giữa các máy tính qua mạng.'
    },
    {
      content: 'Trong Linux, lệnh nào hiển thị bảng routing?',
      options: ['ip route show', 'route print', 'netstat -r', 'Cả A và C đều đúng'],
      correct: 3,
      explanation: 'ip route show và netstat -r đều hiển thị routing table trên Linux.'
    },
    {
      content: 'Nginx directive "try_files" dùng để làm gì?',
      options: [
        'Kiểm tra file tồn tại theo thứ tự, trả về file đầu tiên tìm thấy hoặc fallback',
        'Thử kết nối đến nhiều backend server',
        'Kiểm tra quyền truy cập file',
        'Nén file trước khi gửi'
      ],
      correct: 0,
      explanation: 'try_files kiểm tra sự tồn tại của file/directory theo thứ tự, dùng cho SPA routing hoặc static fallback.'
    }
  ] as MCQ[],
  essays: [
    {
      content: 'Trình bày quy trình thiết kế và triển khai hệ thống mạng cho doanh nghiệp vừa (50-100 nhân viên). Bao gồm: phân chia VLAN, cấu hình DHCP, DNS nội bộ, firewall và VPN cho nhân viên làm việc từ xa.',
      explanation: 'Thiết kế topology, VLAN theo phòng ban (management/staff/guest/server), DHCP scope cho mỗi VLAN, DNS zone nội bộ, firewall rules inter-VLAN, OpenVPN/WireGuard cho remote access.',
      points: 5
    },
    {
      content: 'So sánh Docker container và virtual machine (VM). Phân tích ưu nhược điểm của mỗi công nghệ và đề xuất trường hợp sử dụng phù hợp trong môi trường production.',
      explanation: 'VM: full OS isolation, hardware-level, security tốt hơn. Container: lightweight, fast startup, resource efficient. VM cho multi-tenant, legacy app. Container cho microservices, CI/CD.',
      points: 4
    },
    {
      content: 'Thiết kế hệ thống high availability cho web application sử dụng Nginx load balancer, nhiều web server và database replication. Mô tả kiến trúc, failover mechanism và monitoring.',
      explanation: 'Nginx upstream với health check, keepalived cho LB failover, MySQL master-slave replication, application session sharing (Redis), monitoring với Zabbix/Prometheus.',
      points: 5
    },
    {
      content: 'Giải thích chi tiết cách cấu hình và quản lý iptables trên Linux. Bao gồm: các chain, table, rule ordering, NAT configuration và persistent rules.',
      explanation: 'Tables: filter/nat/mangle. Chains: INPUT/OUTPUT/FORWARD/PREROUTING/POSTROUTING. Rule matching top-down, SNAT/DNAT/MASQUERADE, iptables-save/restore, iptables-persistent.',
      points: 4
    },
    {
      content: 'Trình bày quy trình triển khai Kubernetes cluster on-premise với kubeadm. Bao gồm: chuẩn bị node, cài đặt, cấu hình networking (CNI), deploy ứng dụng và monitoring.',
      explanation: 'Disable swap, install containerd/kubeadm/kubelet, kubeadm init, join worker, install Calico/Flannel CNI, kubectl apply deployment/service, Prometheus + Grafana monitoring.',
      points: 5
    },
    {
      content: 'Mô tả cách cấu hình DNS server sử dụng BIND9 trên Ubuntu. Bao gồm: zone file, forward/reverse zone, zone transfer giữa primary và secondary DNS.',
      explanation: 'Install bind9, cấu hình named.conf.local, tạo forward zone file (SOA, NS, A, CNAME, MX records), reverse zone (PTR), allow-transfer cho secondary, TSIG key authentication.',
      points: 4
    },
    {
      content: 'Thiết kế và triển khai chiến lược bảo mật cho hệ thống server Linux. Bao gồm: hardening OS, SSH security, firewall, IDS/IPS, log management và patch management.',
      explanation: 'Disable unused services, SSH key-only + fail2ban, iptables/nftables minimal rules, install OSSEC/Suricata, centralized logging (rsyslog + ELK), unattended-upgrades, audit với Lynis.',
      points: 5
    },
    {
      content: 'Giải thích cách triển khai GitOps workflow sử dụng ArgoCD cho Kubernetes. Bao gồm: cài đặt ArgoCD, cấu hình repository, application manifest và sync strategy.',
      explanation: 'Install ArgoCD trên K8s, connect Git repo chứa manifests, tạo Application CRD, automated sync policy, health checks, rollback strategy, RBAC configuration.',
      points: 5
    },
    {
      content: 'Trình bày cách cấu hình MySQL/MariaDB replication (Master-Slave và Master-Master). Phân tích ưu nhược điểm và xử lý conflict trong Master-Master.',
      explanation: 'binlog enable, server-id unique, CHANGE MASTER TO, START SLAVE, GTID-based replication. M-M: auto-increment offset, conflict resolution, split-brain prevention với Galera.',
      points: 4
    },
    {
      content: 'Mô tả cách xây dựng hệ thống monitoring toàn diện sử dụng Prometheus và Grafana cho infrastructure và ứng dụng. Bao gồm: cài đặt, exporters, alerting rules và dashboard.',
      explanation: 'Install Prometheus server, node_exporter (system), mysqld_exporter (DB), blackbox_exporter (endpoint), cấu hình scrape_configs, alertmanager rules, Grafana datasource + dashboard templates.',
      points: 5
    }
  ] as Essay[]
};
