-- ============================================================================
-- V2 — Sample seed data: 42 advanced TOEIC words across 8 workplace topics.
-- SAMPLE DATA ONLY — replace or extend with real curated content before
-- production use. Original example sentences written for this project.
-- ============================================================================

INSERT INTO vocabulary (word, ipa, part_of_speech, meaning_vi, definition_en, example_en, example_vi, topic, level) VALUES
-- ---------------- Office (6) ----------------
('deadline', '/ˈdedlaɪn/', 'noun', 'hạn chót', 'The latest time by which something must be finished.', 'The deadline for the quarterly report is Friday at noon.', 'Hạn chót nộp báo cáo quý là trưa thứ Sáu.', 'Office', 'intermediate'),
('schedule', '/ˈskedʒuːl/', 'noun', 'lịch trình', 'A plan that lists events or tasks and the times they will happen.', 'Please check the meeting schedule before booking the conference room.', 'Vui lòng xem lịch họp trước khi đặt phòng hội nghị.', 'Office', 'intermediate'),
('agenda', '/əˈdʒendə/', 'noun', 'chương trình nghị sự', 'A list of items to be discussed at a meeting.', 'The agenda for Monday''s meeting was sent by email yesterday.', 'Chương trình nghị sự của cuộc họp thứ Hai đã được gửi qua email hôm qua.', 'Office', 'advanced'),
('memo', '/ˈmeməʊ/', 'noun', 'bản ghi nhớ', 'A short written message used inside a company to share information.', 'The manager sent a memo about the new office hours.', 'Quản lý đã gửi một bản ghi nhớ về giờ làm việc mới.', 'Office', 'intermediate'),
('colleague', '/ˈkɒliːɡ/', 'noun', 'đồng nghiệp', 'A person you work with in the same company.', 'My colleague helped me prepare the presentation slides.', 'Đồng nghiệp của tôi đã giúp tôi chuẩn bị slide thuyết trình.', 'Office', 'intermediate'),
('overtime', '/ˈəʊvətaɪm/', 'noun', 'giờ làm thêm', 'Time worked beyond normal working hours.', 'Staff are paid extra for working overtime this month.', 'Nhân viên được trả thêm khi làm thêm giờ trong tháng này.', 'Office', 'intermediate'),

-- ---------------- HR (6) ----------------
('recruit', '/rɪˈkruːt/', 'verb', 'tuyển dụng', 'To find and hire new employees for a company.', 'The company plans to recruit ten engineers next quarter.', 'Công ty dự định tuyển mười kỹ sư trong quý tới.', 'HR', 'intermediate'),
('candidate', '/ˈkændɪdət/', 'noun', 'ứng viên', 'A person who applies for a job or position.', 'We interviewed five candidates for the marketing role.', 'Chúng tôi đã phỏng vấn năm ứng viên cho vị trí marketing.', 'HR', 'intermediate'),
('interview', '/ˈɪntəvjuː/', 'noun', 'buổi phỏng vấn', 'A formal meeting where a candidate is asked questions about their skills.', 'Her job interview lasted almost one hour.', 'Buổi phỏng vấn của cô ấy kéo dài gần một giờ.', 'HR', 'beginner'),
('benefit', '/ˈbenɪfɪt/', 'noun', 'phúc lợi', 'An advantage or extra service provided by an employer, such as health insurance.', 'The job offers excellent benefits, including paid vacation.', 'Công việc này có phúc lợi tuyệt vời, bao gồm kỳ nghỉ có lương.', 'HR', 'intermediate'),
('payroll', '/ˈpeɪrəʊl/', 'noun', 'bảng lương', 'The list of employees who are paid and the system of paying them.', 'The payroll department processes salaries on the 25th.', 'Phòng tiền lương xử lý lương vào ngày 25.', 'HR', 'advanced'),
('resign', '/rɪˈzaɪn/', 'verb', 'từ chức', 'To formally leave a job or position.', 'He decided to resign after ten years with the company.', 'Anh ấy quyết định từ chức sau mười năm gắn bó với công ty.', 'HR', 'intermediate'),

-- ---------------- Finance (6) ----------------
('invoice', '/ˈɪnvɔɪs/', 'noun', 'hóa đơn', 'A document listing goods or services provided and the amount to pay.', 'Please send the invoice to the accounting team by Thursday.', 'Vui lòng gửi hóa đơn cho phòng kế toán trước thứ Năm.', 'Finance', 'intermediate'),
('budget', '/ˈbʌdʒɪt/', 'noun', 'ngân sách', 'A plan for how much money will be spent over a period.', 'The marketing budget was increased by twenty percent.', 'Ngân sách marketing đã tăng hai mươi phần trăm.', 'Finance', 'beginner'),
('revenue', '/ˈrevənjuː/', 'noun', 'doanh thu', 'The total money a company receives from selling its products.', 'Revenue grew sharply after the new product launch.', 'Doanh thu tăng mạnh sau khi ra mắt sản phẩm mới.', 'Finance', 'intermediate'),
('expense', '/ɪkˈspens/', 'noun', 'chi phí', 'Money spent to run a business or buy something.', 'Travel expenses must be reported within two weeks.', 'Chi phí đi lại phải được báo cáo trong vòng hai tuần.', 'Finance', 'intermediate'),
('audit', '/ˈɔːdɪt/', 'noun', 'kiểm toán', 'An official examination of a company''s financial records.', 'The annual audit found no serious problems.', 'Cuộc kiểm toán hàng năm không phát hiện vấn đề nghiêm trọng.', 'Finance', 'advanced'),
('dividend', '/ˈdɪvɪdend/', 'noun', 'cổ tức', 'A share of company profits paid to shareholders.', 'Shareholders received a dividend of two dollars per share.', 'Cổ đông nhận cổ tức hai đô la mỗi cổ phiếu.', 'Finance', 'advanced'),

-- ---------------- Marketing (5) ----------------
('advertise', '/ˈædvətaɪz/', 'verb', 'quảng cáo', 'To promote a product or service to attract customers.', 'They advertise their new phones on social media.', 'Họ quảng cáo điện thoại mới trên mạng xã hội.', 'Marketing', 'beginner'),
('brand', '/brænd/', 'noun', 'thương hiệu', 'The name and image that identify a company''s products.', 'The brand is well known for high quality.', 'Thương hiệu này nổi tiếng với chất lượng cao.', 'Marketing', 'intermediate'),
('campaign', '/kæmˈpeɪn/', 'noun', 'chiến dịch', 'A series of planned activities to promote something.', 'The new advertising campaign starts next Monday.', 'Chiến dịch quảng cáo mới bắt đầu vào thứ Hai tới.', 'Marketing', 'intermediate'),
('slogan', '/ˈsləʊɡən/', 'noun', 'khẩu hiệu', 'A short memorable phrase used in advertising.', 'The company''s slogan appears on every package.', 'Khẩu hiệu của công ty xuất hiện trên mọi bao bì.', 'Marketing', 'intermediate'),
('promote', '/prəˈməʊt/', 'verb', 'xúc tiến, quảng bá', 'To support or encourage the sale of a product.', 'The store is promoting its spring collection this week.', 'Cửa hàng đang quảng bá bộ sưu tập mùa xuân trong tuần này.', 'Marketing', 'intermediate'),

-- ---------------- Sales (5) ----------------
('discount', '/ˈdɪskaʊnt/', 'noun', 'giảm giá', 'A reduction in the usual price of something.', 'Customers get a ten percent discount on weekends.', 'Khách hàng được giảm giá mười phần trăm vào cuối tuần.', 'Sales', 'beginner'),
('warranty', '/ˈwɒrənti/', 'noun', 'bảo hành', 'A written promise to repair or replace a product if it breaks.', 'The laptop comes with a two-year warranty.', 'Chiếc laptop đi kèm bảo hành hai năm.', 'Sales', 'intermediate'),
('refund', '/ˈriːfʌnd/', 'noun', 'hoàn tiền', 'Money returned to a customer who is not satisfied.', 'You can request a full refund within thirty days.', 'Bạn có thể yêu cầu hoàn tiền đầy đủ trong vòng ba mươi ngày.', 'Sales', 'intermediate'),
('negotiate', '/nɪˈɡəʊʃieɪt/', 'verb', 'đàm phán', 'To discuss something to reach an agreement on price or terms.', 'They negotiated a lower price for the bulk order.', 'Họ đã đàm phán giá thấp hơn cho đơn hàng số lượng lớn.', 'Sales', 'advanced'),
('quota', '/ˈkwəʊtə/', 'noun', 'chỉ tiêu', 'A fixed amount of sales a person is expected to reach.', 'Each salesperson has a monthly quota of fifty units.', 'Mỗi nhân viên bán hàng có chỉ tiêu năm mươi đơn vị mỗi tháng.', 'Sales', 'advanced'),

-- ---------------- Travel (5) ----------------
('itinerary', '/aɪˈtɪnərəri/', 'noun', 'lịch trình chuyến đi', 'A detailed plan of a journey, including places and times.', 'The travel agent emailed us the full itinerary.', 'Đại lý du lịch đã gửi email toàn bộ lịch trình cho chúng tôi.', 'Travel', 'advanced'),
('reservation', '/ˌrezəˈveɪʃn/', 'noun', 'đặt chỗ', 'An arrangement to keep a seat, room, or table for someone.', 'I made a hotel reservation for three nights.', 'Tôi đã đặt phòng khách sạn ba đêm.', 'Travel', 'beginner'),
('delay', '/dɪˈleɪ/', 'noun', 'sự trì hoãn', 'A situation where something happens later than planned.', 'The flight delay lasted almost three hours.', 'Chuyến bay bị hoãn gần ba tiếng.', 'Travel', 'intermediate'),
('departure', '/dɪˈpɑːtʃər/', 'noun', 'sự khởi hành', 'The act of leaving a place, especially on a journey.', 'Please arrive two hours before departure.', 'Vui lòng đến trước giờ khởi hành hai tiếng.', 'Travel', 'intermediate'),
('accommodation', '/əˌkɒməˈdeɪʃn/', 'noun', 'chỗ ở', 'A place to stay when traveling, such as a hotel.', 'The conference fee includes accommodation and meals.', 'Phí hội nghị bao gồm chỗ ở và bữa ăn.', 'Travel', 'advanced'),

-- ---------------- IT (5) ----------------
('upgrade', '/ʌpˈɡreɪd/', 'verb', 'nâng cấp', 'To improve software or equipment to a newer version.', 'We need to upgrade the office computers this year.', 'Chúng ta cần nâng cấp máy tính văn phòng trong năm nay.', 'IT', 'intermediate'),
('backup', '/ˈbækʌp/', 'noun', 'bản sao lưu', 'A copy of data kept in case the original is lost.', 'Always keep a backup of important files.', 'Hãy luôn giữ bản sao lưu của các tệp quan trọng.', 'IT', 'intermediate'),
('glitch', '/ɡlɪtʃ/', 'noun', 'trục trặc nhỏ', 'A small technical problem that causes temporary difficulty.', 'A minor glitch delayed the system update.', 'Một trục trặc nhỏ đã làm chậm bản cập nhật hệ thống.', 'IT', 'advanced'),
('compatible', '/kəmˈpætəbl/', 'adjective', 'tương thích', 'Able to work together with another device or software.', 'This printer is compatible with all major operating systems.', 'Máy in này tương thích với mọi hệ điều hành phổ biến.', 'IT', 'intermediate'),
('install', '/ɪnˈstɔːl/', 'verb', 'cài đặt', 'To set up software or equipment so it is ready to use.', 'The technician installed the new software in ten minutes.', 'Kỹ thuật viên đã cài đặt phần mềm mới trong mười phút.', 'IT', 'beginner'),

-- ---------------- Customer Service (4) ----------------
('complaint', '/kəmˈpleɪnt/', 'noun', 'lời phàn nàn', 'A statement that something is wrong or unsatisfactory.', 'The store received a complaint about slow delivery.', 'Cửa hàng nhận được một lời phàn nàn về giao hàng chậm.', 'Customer Service', 'intermediate'),
('inquiry', '/ɪnˈkwaɪəri/', 'noun', 'yêu cầu tìm hiểu', 'A request for information about something.', 'Thank you for your inquiry about our services.', 'Cảm ơn quý khách đã tìm hiểu về dịch vụ của chúng tôi.', 'Customer Service', 'intermediate'),
('courteous', '/ˈkɜːtiəs/', 'adjective', 'lịch sự', 'Polite and showing good manners.', 'The staff were courteous and helpful.', 'Nhân viên rất lịch sự và nhiệt tình.', 'Customer Service', 'advanced'),
('resolve', '/rɪˈzɒlv/', 'verb', 'giải quyết', 'To find a solution to a problem or dispute.', 'We will resolve your issue within two business days.', 'Chúng tôi sẽ giải quyết vấn đề của quý khách trong hai ngày làm việc.', 'Customer Service', 'intermediate');
