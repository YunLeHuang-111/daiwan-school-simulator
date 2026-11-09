import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.Executors;

/** JDK 17+，不需 Maven 或第三方套件。從專案根目錄執行。 */
public class Main {
    static final Path WEB = Path.of("web").toAbsolutePath().normalize();
    static final String[] SUBJECTS = {"國文", "英文", "數學", "自然", "社會"};
    record Question(String id, String subject, String kind, String text, List<String> options, int answer, String explanation) {
        Map<String, Object> publicData() {
            return Map.of("id", id, "subject", subject, "kind", kind, "text", text, "options", options);
        }
    }
    static final List<Question> QUESTIONS = new ArrayList<>();
    static {
        // 欄位：科目｜題型｜題幹｜四個選項（~分隔）｜正解索引（0起）｜解析
        String bank = """
國文|語意判讀|「他總是三思而後行。」這句話最接近哪個意思？|做事前仔細考慮~只做三次就停止~做事永遠比別人慢~想到什麼立刻做|0|三思而後行指行動前反覆思考，重點是審慎。
國文|生活閱讀|通知寫著「報名截止日為週五，逾期恕不受理」，哪個做法最符合通知？|週六再寄出即可~週五截止前完成報名~活動當天現場補報~不用報名直接參加|1|截止前完成報名，才能符合受理條件。
國文|修辭應用|「月亮像一艘小船」使用了什麼修辭？|排比~反問~譬喻~引用|2|用小船比擬月亮的形狀，是譬喻。
國文|資訊摘要|文章說「自備水壺能減少一次性杯具，但仍應定期清洗」，最完整的摘要是？|水壺都不衛生~一次性杯具一定有毒~只要買水壺就夠了~自備水壺兼顧減廢與清潔|3|摘要應同時保留減少廢棄物與注意清潔兩個重點。
國文|語文常識|哪一句成語最適合形容「從失敗中學習，繼續努力」？|再接再厲~守株待兔~自相矛盾~畫蛇添足|0|再接再厲表示繼續努力，適合鼓勵受挫後再挑戰。
國文|媒體閱讀|標題說「所有學生都討厭閱讀」，但只訪問了三位同學。主要問題是？|字數太少~以少數樣本概括所有人~沒有照片~沒有寫學校名稱|1|三位同學不足以代表所有學生，這是過度概括。
英文|生活英文|You see a sign: “Please keep your voice down.” What should you do?|Speak louder~Run faster~Speak quietly~Turn on music|2|Keep your voice down 的意思是降低音量。
英文|實用閱讀|A shop opens from 10 a.m. to 6 p.m. When can you visit?|8 a.m.~9 p.m.~7 p.m.~2 p.m.|3|下午兩點位於上午十點至下午六點的營業時間內。
英文|日常表達|朋友說 “Thank you for your help.”，最合適的回應是？|You're welcome.~I'm twelve.~It's raining.~See the doctor.|0|You're welcome 是回應感謝的常用說法。
英文|情境理解|“I missed the bus, so I walked to school.” Why did the speaker walk?|The school was closed.~The speaker missed the bus.~The bus was free.~The speaker lost a book.|1|So 表示結果；走路上學的原因是錯過公車。
英文|字義判讀|A reusable bag is a bag you can ____.|eat for dinner~use only once~use again~never wash|2|Reusable 表示可以重複使用的。
英文|生活英文|天氣預報說 “There is a high chance of rain.”，出門最適合帶什麼？|A swimsuit~A guitar~Sunglasses only~An umbrella|3|有很高的降雨機率，帶雨傘最符合情境。
數學|消費常識|一件原價 800 元的外套打八折，售價是多少？|640 元~720 元~600 元~160 元|0|八折是原價的 80%，800 × 0.8 = 640。
數學|比例推理|食譜兩人份需要 150 克麵粉，六人份需要多少？|300 克~450 克~600 克~900 克|1|六人是兩人的三倍，150 × 3 = 450。
數學|機率判讀|擲一顆公平六面骰，出現偶數的機率是多少？|1/6~1/3~1/2~2/3|2|偶數有 2、4、6，共三個，機率為 3/6。
數學|資料判讀|四次測驗分數為 60、70、80、90，平均是多少？|70~80~85~75|3|總分 300，除以四次，平均為 75。
數學|時間規劃|電影 14:35 開始，長 110 分鐘，何時結束？|16:25~15:45~16:05~17:15|0|110 分鐘是 1 小時 50 分，14:35 加上後為 16:25。
數學|邏輯推理|數列 2、6、12、20、30 的下一項是？|40~42~44~60|1|相鄰差依序為 4、6、8、10，下一差為 12，所以是 42。
自然|日常科學|冰水杯外側出現水珠，主要原因是？|水穿透杯子~杯子自己產水~空氣中的水蒸氣遇冷凝結~冰塊蒸發成液體|2|杯外水珠來自空氣中的水蒸氣，在冷表面凝結。
自然|環境常識|哪一種行為最能直接減少一次性塑膠杯使用？|每次拿兩個杯子~改用更厚的塑膠杯~用完就丟進河裡~自備可重複使用的杯子|3|重複使用杯子可降低一次性杯具需求。
自然|實驗思考|比較日照對植物生長的影響，哪一項最應維持相同？|植物種類與澆水量~只有盆栽顏色~每天拍照角度~實驗者衣服|0|控制植物種類與水量，才能較合理地比較日照的影響。
自然|能量應用|太陽能板主要將哪種能量轉成電能？|聲能~光能~食物的化學能~地熱能|1|太陽能光電板主要將光能轉成電能。
自然|生活觀察|搭車突然煞車時，身體傾向往前，是因為？|地球停止轉動~座椅產生磁力~身體具有慣性~空氣把人吸走|2|身體有維持原來運動狀態的傾向，稱為慣性。
自然|科學推理|要確認某飲料「讓植物長更快」，比較可靠的方法是？|只看廣告~只試一盆且不記錄~問誰最喜歡喝~設對照組並重複測量|3|設對照組、控制條件與重複測量，有助於建立可信的證據。
社會|公民常識|班級討論畢旅行程，哪種方式較符合民主參與？|讓大家表達意見，再依共同規則決定~只聽最有錢的人~禁止提出不同意見~抽到誰就永遠聽誰|0|民主參與重視表達、討論與共同規則，也應尊重少數意見。
社會|地理應用|地圖比例尺 1:100,000，圖上 2 公分約是實際多遠？|200 公尺~2 公里~20 公里~200 公里|1|圖上 1 公分代表實際 1 公里，2 公分即 2 公里。
社會|歷史思考|想了解一百年前當地的生活，哪項最接近當時的一手史料？|今天改編的古裝劇~未註明出處的貼文~當年的居民日記~朋友憑空想像的故事|2|當時居民留下的日記，是直接接近那個時代的一手材料。
社會|經濟常識|同樣的預算只能買一本書或一張電影票，選書所放棄的最佳替代選擇稱為？|利息~營業額~匯率~機會成本|3|機會成本指為做某項選擇，放棄的最佳替代選擇之價值。
社會|臺灣地理|臺灣中央山脈的主要走向大致為？|南北向~東西向~環狀~完全水平的平原|0|中央山脈大致呈南北走向，是臺灣主要山脈之一。
社會|權利與責任|同學在群組持續嘲笑某人，較合適的做法是？|跟著嘲笑~停止轉傳並向可信任師長求助~公開對方所有個資~假裝是對方發言|1|停止擴散並尋求支持，比跟著攻擊更有助於處理霸凌問題。
常識|資訊安全|收到自稱銀行簡訊，要求點陌生連結輸入密碼，應先怎麼做？|立刻輸入~轉傳全班~透過銀行官方管道查證~把驗證碼傳給對方|2|避免使用可疑連結，另從已知官方管道查證。
常識|生活判斷|兩則網路消息互相矛盾，哪種做法最可靠？|相信分享最多的~相信字最大的一篇~只看留言~查原始來源、日期與其他可靠資料|3|來源、時間與交叉查證比流量或排版更有助於判斷。
常識|運動常識|要準備長跑，哪種練習方式比較合理？|循序增加訓練量並安排恢復~第一天跑到極限且不休息~完全不喝水~只買鞋不用練習|0|循序訓練與恢復，比突然過量更有助於建立體能。
常識|音樂常識|一般樂譜上的「休止符」表示什麼？|一定要加大音量~在指定時值內不發聲~改變樂器~從頭再演一次|1|休止符代表一定時值的停頓，也是節奏的一部分。
常識|藝術觀察|畫面中近處物體通常畫得較大、遠處較小，主要是在表現？|畫紙價格~音樂節奏~空間與遠近感~氣溫|2|利用近大遠小可表現空間深度與遠近感。
常識|合作溝通|小組進度落後，哪個做法較能推動工作？|互相責怪~刪除所有檔案~假裝已完成~釐清剩餘工作並重新分工|3|清楚列出待辦、責任與時間，能讓團隊重新協作。
常識|資料安全|哪個做法能降低重要作業遺失的風險？|定期備份到不同位置~只存一份且不命名~把密碼公開~永遠不儲存|0|在不同位置保留備份，可降低單一裝置故障造成的損失。
常識|時間管理|明天要交報告，今天最合適的第一步是？|先把桌面美化三小時~列出必要內容與剩餘時間~等待靈感到半夜~先做下個月的海報|1|先確定必要成果與可用時間，才能安排優先順序。
""";
        int i = 0;
        for (String line : bank.strip().split("\\R")) {
            String[] p = line.split("\\|", -1);
            QUESTIONS.add(new Question("q" + i++, p[0], p[1], p[2], List.of(p[3].split("~")), Integer.parseInt(p[4]), p[5]));
        }
    }

    public static void main(String[] args) throws Exception {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 8080;
        if (!Files.isRegularFile(WEB.resolve("index.html"))) throw new IllegalStateException("請在專案根目錄執行 java --source 17 src/Main.java");
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.createContext("/api/", Main::api);
        server.createContext("/", Main::staticFile);
        server.setExecutor(Executors.newFixedThreadPool(8));
        server.start();
        System.out.println("呆丸升學模擬已啟動：http://localhost:" + port);
        System.out.println("在瀏覽器開啟上述網址。按 Ctrl+C 停止。");
    }

    static void api(HttpExchange ex) throws IOException {
        try {
            String path = ex.getRequestURI().getPath();
            if (path.equals("/api/exam") && ex.getRequestMethod().equals("GET")) {
                List<Question> selected = new ArrayList<>();
                for (String subject : List.of("國文", "英文", "數學", "自然", "社會", "常識")) {
                    List<Question> pool = new ArrayList<>(QUESTIONS.stream().filter(q -> q.subject.equals(subject)).toList());
                    Collections.shuffle(pool);
                    selected.addAll(pool.subList(0, 3));
                }
                Collections.shuffle(selected);
                json(ex, 200, Map.of("questions", selected.stream().map(Question::publicData).toList()));
            } else if (path.equals("/api/grade") && ex.getRequestMethod().equals("POST")) {
                grade(ex, form(ex));
            } else if (path.equals("/api/admission") && ex.getRequestMethod().equals("POST")) {
                admission(ex, form(ex));
            } else json(ex, 404, Map.of("error", "找不到這個 API 或請求方法不正確。"));
        } catch (IllegalArgumentException e) {
            json(ex, 400, Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            json(ex, 500, Map.of("error", "伺服器處理失敗，請重試。"));
        } finally { ex.close(); }
    }

    static void grade(HttpExchange ex, Map<String, String> f) throws IOException {
        String[] ids = f.getOrDefault("ids", "").split(",");
        String[] answers = f.getOrDefault("answers", "").split(",");
        if (ids.length != 18 || answers.length != 18 || new HashSet<>(List.of(ids)).size() != 18) throw new IllegalArgumentException("請完成十八道不重複的題目。");
        Map<String, Integer> correct = new LinkedHashMap<>();
        Map<String, Integer> counts = new HashMap<>();
        List<Object> review = new ArrayList<>();
        for (int i = 0; i < ids.length; i++) {
            final String id = ids[i];
            Question q = QUESTIONS.stream().filter(x -> x.id.equals(id)).findFirst().orElseThrow(() -> new IllegalArgumentException("題目不存在。"));
            int answer = integer(answers[i], 0, 3);
            boolean hit = answer == q.answer;
            correct.merge(q.subject, hit ? 1 : 0, Integer::sum);
            counts.merge(q.subject, 1, Integer::sum);
            review.add(Map.of("id", id, "correct", hit, "answer", q.answer, "explanation", q.explanation));
        }
        for (String subject : List.of("國文", "英文", "數學", "自然", "社會", "常識")) if (counts.getOrDefault(subject, 0) != 3) throw new IllegalArgumentException("每個類別需要三題。");
        String essay = f.getOrDefault("essay", "").strip();
        if (essay.codePointCount(0, essay.length()) < 40 || essay.length() > 600) throw new IllegalArgumentException("寫作請輸入 40～300 字（最多 600 個 UTF-16 字元）。");
        int length = essay.codePointCount(0, essay.length());
        if (length > 300) throw new IllegalArgumentException("寫作最多 300 字。");
        // 可解釋的簡化規則，並非語意評分：字數、標點、因果與例證標記。
        int writing = Math.min(6, 1 + (length >= 60 ? 1 : 0) + (length >= 100 ? 1 : 0)
                + (essay.matches("(?s).*[，。！？；].*") ? 1 : 0)
                + (essay.matches("(?s).*(因為|所以|因此|但是|然而).*" ) ? 1 : 0)
                + (essay.matches("(?s).*(例如|比方|舉例|曾經).*" ) ? 1 : 0));
        List<Object> scores = new ArrayList<>();
        double total = (writing - 1) / 5.0;
        String[] labels = {"C", "B", "B+", "B++", "A", "A+", "A++"};
        int general = correct.getOrDefault("常識", 0);
        for (String subject : SUBJECTS) {
            // 學科占85%、常識占15%；短問答代表抽樣測驗，不等同正式會考。
            double raw = (correct.getOrDefault(subject, 0) / 3.0 * .85 + general / 3.0 * .15) * 100;
            int points = Math.max(1, Math.min(7, (int)Math.round(1 + raw * .06)));
            total += points;
            scores.add(Map.of("subject", subject, "points", points, "level", labels[points - 1], "raw", Math.round(raw)));
        }
        json(ex, 200, Map.of("scores", scores, "writing", writing, "total", Math.round(total * 10) / 10.0,
            "general", general, "correct", correct.values().stream().mapToInt(Integer::intValue).sum(), "review", review));
    }

    static void admission(HttpExchange ex, Map<String, String> f) throws IOException {
        String route = f.getOrDefault("route", "");
        if (!List.of("star", "apply", "distribution").contains(route)) throw new IllegalArgumentException("未知升學管道。");
        double exam = number(f.get("exam"), 0, 100);
        double portfolio = number(f.get("portfolio"), 0, 100);
        double confidence = number(f.get("confidence"), 0, 100);
        double talent = number(f.get("talent"), 0, 100);
        double threshold = number(f.get("threshold"), 0, 100);
        double rank = number(f.get("rank"), 1, 100);
        double maxRank = number(f.get("maxRank"), 1, 100);
        // 全部是本作的公開模擬規則；分發只看已受狀態影響的考試成績。
        double score = switch (route) {
            case "star" -> exam * .65 + (100 - rank) * .35;
            case "apply" -> exam * .55 + portfolio * .2 + confidence * .1 + talent * .15;
            default -> exam;
        };
        boolean qualified = !route.equals("star") || rank <= maxRank;
        boolean screened = !route.equals("apply") || exam >= Math.max(20, threshold - 15);
        json(ex, 200, Map.of("accepted", qualified && screened && score >= threshold, "score", Math.round(score * 10) / 10.0,
            "reason", !qualified ? "在校排名未達推薦門檻" : !screened ? "未通過第一階段學測檢定" : score >= threshold ? "達到本次模擬錄取標準" : "未達本次模擬錄取標準"));
    }

    static Map<String, String> form(HttpExchange ex) throws IOException {
        String contentType = ex.getRequestHeaders().getFirst("Content-Type");
        if (contentType == null || !contentType.startsWith("application/x-www-form-urlencoded")) throw new IllegalArgumentException("請使用表單編碼。");
        byte[] body = ex.getRequestBody().readNBytes(32769);
        if (body.length > 32768) throw new IllegalArgumentException("請求內容過長。");
        Map<String, String> values = new HashMap<>();
        for (String pair : new String(body, StandardCharsets.UTF_8).split("&")) {
            String[] parts = pair.split("=", 2);
            values.put(URLDecoder.decode(parts[0], StandardCharsets.UTF_8), URLDecoder.decode(parts.length == 2 ? parts[1] : "", StandardCharsets.UTF_8));
        }
        return values;
    }
    static int integer(String value, int min, int max) {
        double n = number(value, min, max);
        if (n != Math.floor(n)) throw new IllegalArgumentException("選項必須是整數。");
        return (int)n;
    }
    static double number(String value, double min, double max) {
        try {
            double n = Double.parseDouble(value);
            if (!Double.isFinite(n) || n < min || n > max) throw new NumberFormatException();
            return n;
        } catch (Exception e) { throw new IllegalArgumentException("數值超出允許範圍。"); }
    }
    static void staticFile(HttpExchange ex) throws IOException {
        try {
            if (!ex.getRequestMethod().equals("GET")) { ex.sendResponseHeaders(405, -1); return; }
            String request = ex.getRequestURI().getPath();
            Path path = WEB.resolve(request.equals("/") ? "index.html" : request.substring(1)).normalize();
            if (!path.startsWith(WEB) || !Files.isRegularFile(path)) { ex.sendResponseHeaders(404, -1); return; }
            String type = path.toString().endsWith(".css") ? "text/css" : path.toString().endsWith(".js") ? "text/javascript" : "text/html";
            byte[] bytes = Files.readAllBytes(path);
            ex.getResponseHeaders().set("Content-Type", type + "; charset=utf-8");
            ex.getResponseHeaders().set("X-Content-Type-Options", "nosniff");
            ex.getResponseHeaders().set("Cache-Control", "no-store");
            ex.sendResponseHeaders(200, bytes.length);
            ex.getResponseBody().write(bytes);
        } finally { ex.close(); }
    }
    static void json(HttpExchange ex, int status, Object data) throws IOException {
        byte[] bytes = encode(data).getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        ex.getResponseHeaders().set("Cache-Control", "no-store");
        ex.sendResponseHeaders(status, bytes.length);
        ex.getResponseBody().write(bytes);
    }
    static String encode(Object o) {
        if (o == null) return "null";
        if (o instanceof String s) {
            StringBuilder b = new StringBuilder("\"");
            for (char c : s.toCharArray()) switch (c) {
                case '"' -> b.append("\\\""); case '\\' -> b.append("\\\\");
                case '\n' -> b.append("\\n"); case '\r' -> b.append("\\r"); case '\t' -> b.append("\\t");
                default -> { if (c < 32) b.append(String.format("\\u%04x", (int)c)); else b.append(c); }
            }
            return b.append('"').toString();
        }
        if (o instanceof Map<?, ?> m) return "{" + String.join(",", m.entrySet().stream().map(e -> encode(e.getKey().toString()) + ":" + encode(e.getValue())).toList()) + "}";
        if (o instanceof Collection<?> c) return "[" + String.join(",", c.stream().map(Main::encode).toList()) + "]";
        if (o instanceof Number || o instanceof Boolean) return o.toString();
        throw new IllegalArgumentException("不支援的 JSON 型別。");
    }
}
