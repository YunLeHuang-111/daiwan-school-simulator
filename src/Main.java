import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.text.Normalizer;
import java.util.*;
import java.util.concurrent.Executors;

/** 呆丸升學模擬：JDK17+，從專案根目錄啟動，不需外部套件。 */
public class Main {
    static final Path WEB = Path.of("web").toAbsolutePath().normalize();
    static final List<String> GSAT = List.of("國文","英文","數學A","數學B","自然","社會");
    static final List<String> SPLIT = List.of("數學甲","數學乙","物理","化學","生物","歷史","地理","公民與社會");
    record Question(String id, String subject, int difficulty, String theme, String type, String text,
                    List<String> left, List<String> options, String key, String explanation) {
        Map<String,Object> publicData(String label) {
            return Map.of("id",id,"subject",subject,"examSubject",label,"difficulty",difficulty,"theme",theme,
                          "type",type,"text",text,"left",left,"options",options);
        }
    }
    static final List<Question> QUESTIONS = new ArrayList<>();
    static {
        try {
            for (String line : Files.readAllLines(Path.of("data/questions.tsv"), StandardCharsets.UTF_8)) {
                if (line.isBlank() || line.startsWith("#")) continue;
                String[] p = line.split("\\|",-1);
                if (p.length != 10) throw new IllegalArgumentException("題庫欄位錯誤：" + p[0]);
                Question q = new Question(p[0],p[1],Integer.parseInt(p[2]),p[3],p[4],p[5],
                    p[6].equals("-") ? List.of() : List.of(p[6].split("~")),
                    p[7].equals("-") ? List.of() : List.of(p[7].split("~")),p[8],p[9]);
                if (q.difficulty < 1 || q.difficulty > 3 || !List.of("choice","match","fill").contains(q.type)) throw new IllegalArgumentException("題庫類型錯誤："+q.id);
                if (q.type.equals("choice")) integer(q.key,0,q.options.size()-1);
                if (q.type.equals("match")) {
                    if(q.left.size()!=q.options.size() || q.key.split(",").length!=q.left.size()) throw new IllegalArgumentException("配對題格式錯誤："+q.id);
                    for(String k:q.key.split(",")) integer(k,0,q.options.size()-1);
                }
                if(QUESTIONS.stream().anyMatch(x->x.id.equals(q.id))) throw new IllegalArgumentException("重複題號："+q.id);
                QUESTIONS.add(q);
            }
        } catch(IOException e) { throw new ExceptionInInitializerError("找不到 data/questions.tsv，請從專案根目錄執行。"); }
    }
    public static void main(String[] args) throws Exception {
        int port=args.length>0?Integer.parseInt(args[0]):8080;
        if(!Files.isRegularFile(WEB.resolve("index.html")))throw new IllegalStateException("請從專案根目錄執行 java --source 17 src/Main.java");
        HttpServer server=HttpServer.create(new InetSocketAddress("127.0.0.1",port),0);
        server.createContext("/api/",Main::api);server.createContext("/",Main::staticFile);
        server.setExecutor(Executors.newFixedThreadPool(8));server.start();
        System.out.println("呆丸升學模擬・教室版：http://localhost:"+port);
        System.out.println(QUESTIONS.size()+"道題目已載入。按 Ctrl+C 停止。");
    }
    static void api(HttpExchange ex)throws IOException {
        try {
            if(!ex.getRequestMethod().equals("POST")){json(ex,405,Map.of("error","請使用POST請求。"));return;}
            Map<String,String> f=form(ex);
            switch(ex.getRequestURI().getPath()) {
                case "/api/enroll" -> enroll(ex,f);
                case "/api/paper" -> paper(ex,f);
                case "/api/grade" -> grade(ex,f);
                case "/api/admission" -> admission(ex,f);
                default -> json(ex,404,Map.of("error","找不到這個API。"));
            }
        } catch(IllegalArgumentException e){json(ex,400,Map.of("error",e.getMessage()));}
          catch(Exception e){e.printStackTrace();json(ex,500,Map.of("error","處理失敗，請重試。"));}
          finally{ex.close();}
    }
    record School(String id,String name,String type,String area,List<Integer> base,String feature,String gender,int tier,int weight) {
        Map<String,Object> data(){return Map.of("id",id,"name",name,"type",type,"area",area,"base",base,"feature",feature,"gender",gender,"tier",tier);}
    }
    static final List<School> SCHOOLS=new ArrayList<>();
    static {
        try{
            for(String line:Files.readAllLines(Path.of("data/schools.tsv"),StandardCharsets.UTF_8)){
                if(line.isBlank()||line.startsWith("#"))continue;
                String[] p=line.split("\\|",-1);
                SCHOOLS.add(new School(p[0],p[1],p[2],p[3],Arrays.stream(p[4].split(",")).map(Integer::parseInt).toList(),p[5],p[6],Integer.parseInt(p[7]),Integer.parseInt(p[8])));
            }
        }catch(IOException e){throw new ExceptionInInitializerError("找不到data/schools.tsv。");}
    }
    static long seed(Map<String,String> f){double n=number(f.getOrDefault("seed","1"),0,4294967295.0);if(n!=Math.floor(n))throw new IllegalArgumentException("種子必須是整數。");return (long)n;}
    static void enroll(HttpExchange ex,Map<String,String> f)throws IOException{
        String gender=f.getOrDefault("gender","");String type=f.getOrDefault("schoolType","");
        if(!List.of("male","female").contains(gender)||!List.of("公立","私立").contains(type))throw new IllegalArgumentException("請選擇性別與公私立偏好。");
        Random r=new Random(seed(f));List<School> eligible=SCHOOLS.stream().filter(x->x.type.equals(type)&&(x.gender.equals("all")||x.gender.equals(gender))).toList();
        int draw=r.nextInt(eligible.stream().mapToInt(School::weight).sum());School school=eligible.get(0);
        for(School candidate:eligible){draw-=candidate.weight;if(draw<0){school=candidate;break;}}
        List<Integer> attrs=new ArrayList<>(),aptitude=new ArrayList<>();
        for(int base:school.base){attrs.add(Math.max(0,Math.min(100,base+r.nextInt(7)-3)));aptitude.add(Math.max(20,Math.min(85,base+8+(school.tier-3)*2+r.nextInt(11)-5)));}
        json(ex,200,Map.of("school",school.data(),"attrs",attrs,"aptitude",aptitude));
    }
    static List<String> labels(Map<String,String> f,String mode) {
        if(mode.equals("term")){integer(f.get("round"),0,5);return List.of("流行文化","生活推理");}
        List<String> allowed=mode.equals("gsat")?GSAT:mode.equals("split")?SPLIT:List.of();
        List<String> selected=List.of(f.getOrDefault("subjects","").split(","));
        if(selected.isEmpty() || selected.size()>allowed.size() || new HashSet<>(selected).size()!=selected.size() || !allowed.containsAll(selected))throw new IllegalArgumentException("請選擇有效且不重複的應考科目。");
        return selected;
    }
    static List<String> sources(String label) {
        return switch(label){
            case "流行文化" -> List.of("影視","動漫","體育","時事","音樂");
            case "生活推理" -> List.of("國文","英文","數學","自然","歷史","地理","公民","藝術","常識");
            case "數學A","數學B","數學甲","數學乙" -> List.of("數學");
            case "自然" -> List.of("自然","物理","化學","生物");
            case "社會" -> List.of("歷史","地理","公民");
            case "公民與社會" -> List.of("公民");
            default -> List.of(label);
        };
    }
    static int abilityIndex(String label) {
        if(List.of("國文","英文").contains(label))return 1;
        if(List.of("歷史","地理","公民","公民與社會","社會","流行文化").contains(label))return 2;
        if(label.equals("藝術"))return 3;if(label.equals("音樂"))return 4;return 0;
    }
    // Retired questions remain available only to grade already-saved papers.
    static boolean active(Question q){
        return !(q.subject.equals("音樂")&&List.of("歌詞選字","歌手點名","emoji猜歌","歌名謎語").contains(q.theme))
            &&!(List.of("英文","數學").contains(q.subject)&&q.difficulty>2)
            &&!(q.subject.equals("英文")&&List.of("Literary bookshelf","Authors and works").contains(q.theme))
            &&!(q.subject.equals("數學")&&List.of("數學史與解謎","數學史","典籍考古").contains(q.theme));
    }
    static String songKey(Question q) {
        if (!q.subject.equals("音樂")) return "";
        if(q.theme.equals("歌詞猜歌名"))return "song:"+q.options.get(Integer.parseInt(q.key));
        int start=q.text.indexOf('《'), end=q.text.indexOf('》',start+1);
        return start>=0&&end>start+1?"song:"+q.text.substring(start+1,end):"";
    }
    static Question pick(String label,String type,int level,Set<String> used,Set<String> seen,Set<String> current,Random random,String preferredTheme) {
        List<Question> candidates=QUESTIONS.stream().filter(q->sources(label).contains(q.subject)&&q.type.equals(type)&&active(q)
            &&!used.contains(q.id)&&!current.contains(normalized(q.text))&&!used.contains(songKey(q))).toList();
        if(candidates.isEmpty())throw new IllegalArgumentException("本科題庫不足，無法再抽出未作答的題目。");
        List<Question> fresh=candidates.stream().filter(q->!seen.contains(q.id)).toList();
        if(!fresh.isEmpty())candidates=fresh;
        List<Question> themed=candidates.stream().filter(q->q.theme.equals(preferredTheme)).toList();
        if(!themed.isEmpty())candidates=themed;
        int distance=candidates.stream().mapToInt(q->Math.abs(q.difficulty-level)).min().orElseThrow();
        List<Question> nearest=candidates.stream().filter(q->Math.abs(q.difficulty-level)==distance).toList();
        Question q=nearest.get(random.nextInt(nearest.size()));
        current.add(normalized(q.text));
        String song=songKey(q);
        if(!song.isEmpty())used.add(song);
        return q;
    }
    static void paper(HttpExchange ex,Map<String,String> f)throws IOException {
        String mode=f.getOrDefault("mode","");List<String> subjects=labels(f,mode);
        if(mode.equals("split")&&!List.of("star","apply").contains(f.getOrDefault("previousRoute","")))throw new IllegalArgumentException("先完成繁星或個申放榜，再參加分科。");
        String[] parts=f.getOrDefault("attrs","40,40,40,40,40").split(",");
        if(parts.length!=5)throw new IllegalArgumentException("需要五項能力值。");
        double[] attrs=Arrays.stream(parts).mapToDouble(x->number(x,0,100)).toArray();
        Set<String> used=new HashSet<>(List.of(f.getOrDefault("used","").split(","))),current=new HashSet<>();
        Set<String> seen=new HashSet<>(List.of(f.getOrDefault("seen","").split(",")));
        used.remove("");
        for(Question q:QUESTIONS)if(used.contains(q.id)){
            current.add(normalized(q.text));
            String song=songKey(q);
            if(!song.isEmpty())used.add(song);
        }
        List<Object> result=new ArrayList<>();
        Random r=new Random(seed(f)^mode.hashCode()^f.getOrDefault("round","0").hashCode()^subjects.toString().hashCode());
        int per=mode.equals("term")?1:3;
        for(String label:subjects){
            for(int j=0;j<per;j++){
                String type=mode.equals("term")?"choice":j==0?"choice":j==1?"match":label.equals("英文")?"choice":"fill";
                double ability=attrs[abilityIndex(label)];
                int level=mode.equals("term")?(ability<45&&integer(f.get("round"),0,5)<2?2:3):j==0?2:3;
                if(ability>=75||List.of("數學A","數學甲").contains(label))level=3;
                if(label.equals("英文"))level=2;
                if(label.startsWith("數學"))level=List.of("數學A","數學甲").contains(label)||ability>=75?2:1;
                String theme=label.equals("英文")?(j==1?(r.nextBoolean()?"Screen matching":"Grammar matching"):j==0?"Movie clues":"Grammar practice"):label.startsWith("數學")?(type.equals("choice")&&r.nextBoolean()?"數學家點名":""):"";
                Question q=pick(label,type,level,used,seen,current,r,theme);result.add(q.publicData(label));
            }
        }
        json(ex,200,Map.of("mode",mode,"questions",result));
    }
    static String normalized(String s){return Normalizer.normalize(s,Normalizer.Form.NFKC).strip().toLowerCase(Locale.ROOT).replaceAll("\\s+","");}
    static double fraction(Question q,String answer){
        if(q.type.equals("choice"))return integer(answer,0,q.options.size()-1)==Integer.parseInt(q.key)?1:0;
        if(q.type.equals("fill")){
            if(answer.isBlank() || answer.length()>80)throw new IllegalArgumentException("請完成短填答（最多80字元）。");
            return Arrays.stream(q.key.split("/")).anyMatch(k->normalized(k).equals(normalized(answer)))?1:0;
        }
        String[] parts=answer.split(",",-1),keys=q.key.split(",");
        if(parts.length!=q.left.size())throw new IllegalArgumentException("請完成所有配對。");
        Set<Integer> unique=new HashSet<>();int hits=0;
        for(int i=0;i<parts.length;i++){int n=integer(parts[i],0,q.options.size()-1);if(!unique.add(n))throw new IllegalArgumentException("配對選項不可重複。");if(n==Integer.parseInt(keys[i]))hits++;}
        return hits/(double)parts.length;
    }
    static void grade(HttpExchange ex,Map<String,String> f)throws IOException {
        String mode=f.getOrDefault("mode","");List<String> subjects=labels(f,mode);
        String[] ids=f.getOrDefault("ids","").split(",");int count=mode.equals("term")?2:subjects.size()*3;
        if(ids.length!=count||new HashSet<>(List.of(ids)).size()!=count)throw new IllegalArgumentException("試卷題數不符或題號重複。");
        Map<String,Double> earned=new LinkedHashMap<>(),possible=new LinkedHashMap<>();Map<String,Integer> counts=new HashMap<>();
        List<Object> review=new ArrayList<>();int correct=0;double sum=0,weight=0;
        for(int i=0;i<count;i++){
            final String id=ids[i];Question q=QUESTIONS.stream().filter(x->x.id.equals(id)).findFirst().orElseThrow(()->new IllegalArgumentException("題目不存在。"));
            String label=f.getOrDefault("label"+i,"");
            if(label.equals("英文")&&q.type.equals("fill"))throw new IllegalArgumentException("英文不使用填答題。");
            if(!subjects.contains(label)||!sources(label).contains(q.subject))throw new IllegalArgumentException("試題不屬於所選科目。");
            double score=fraction(q,f.getOrDefault("a"+i,""));if(score==1)correct++;
            double w=q.difficulty;earned.merge(label,score*w,Double::sum);possible.merge(label,w,Double::sum);counts.merge(label,1,Integer::sum);
            sum+=score*w;weight+=w;review.add(Map.of("id",id,"fraction",score,"correct",score==1,"answer",q.key,"explanation",q.explanation));
        }
        int per=mode.equals("term")?1:3;
        if(subjects.stream().anyMatch(label->counts.getOrDefault(label,0)!=per))throw new IllegalArgumentException("各科題數不符。");
        if(mode.equals("term")){json(ex,200,Map.of("correct",correct,"exam",Math.round(sum/weight*100),"review",review));return;}
        Map<String,Integer> scores=new LinkedHashMap<>();int max=mode.equals("gsat")?15:60;
        for(String label:subjects)scores.put(label,(int)Math.round(earned.get(label)/possible.get(label)*max));
        json(ex,200,Map.of("scores",scores,"correct",correct,"review",review));
    }
    record Program(String id,String university,int group,double threshold,int maxRank,List<String> gsat,List<String> split,double[] weights,double examFloor,double talentFloor,String selectivity){}
    static final Map<String,Program> PROGRAMS=new HashMap<>();
    static{
        try{for(String line:Files.readAllLines(Path.of("data/programs.tsv"),StandardCharsets.UTF_8)){
            if(line.isBlank()||line.startsWith("#"))continue;String[] p=line.split("\\|",-1);
            PROGRAMS.put(p[0],new Program(p[0],p[1],Integer.parseInt(p[2]),Double.parseDouble(p[3]),Integer.parseInt(p[4]),List.of(p[5].split(",")),List.of(p[6].split(",")),Arrays.stream(p[7].split(",")).mapToDouble(Double::parseDouble).toArray(),Double.parseDouble(p[8]),Double.parseDouble(p[9]),p[10]));
        }}catch(IOException e){throw new ExceptionInInitializerError("找不到data/programs.tsv。");}
    }
    static double[] vector(String value){String[] p=value.split(",");if(p.length!=5)throw new IllegalArgumentException("需要五項能力。");return Arrays.stream(p).mapToDouble(x->number(x,0,100)).toArray();}
    static void admission(HttpExchange ex,Map<String,String> f)throws IOException {
        String route=f.getOrDefault("route","");if(!List.of("star","apply","distribution").contains(route))throw new IllegalArgumentException("未知升學管道。");
        String[] preferences=f.getOrDefault("preferences","").split(",");int limit=route.equals("distribution")?10:3;
        if(preferences.length<1||preferences.length>limit||new HashSet<>(List.of(preferences)).size()!=preferences.length)throw new IllegalArgumentException("志願數量不符。");
        List<Program> choices=new ArrayList<>();for(String id:preferences){Program p=PROGRAMS.get(id);if(p==null)throw new IllegalArgumentException("校系不存在。");choices.add(p);}
        if(route.equals("star")&&(choices.stream().map(Program::university).distinct().count()!=1||choices.stream().map(Program::group).distinct().count()!=1))throw new IllegalArgumentException("繁星僅能選一校、一類組，至多三系。");
        Program p=PROGRAMS.get(f.getOrDefault("program",""));if(p==null||!List.of(preferences).contains(p.id))throw new IllegalArgumentException("校系不在志願內。");
        double[] attrs=vector(f.getOrDefault("attrs","")),apt=vector(f.getOrDefault("aptitude",""));
        double portfolio=number(f.get("portfolio"),0,100),rank=number(f.get("rank"),1,100);boolean split=route.equals("distribution");
        List<String> subjects=split?p.split:p.gsat;double sum=0;
        for(int i=0;i<subjects.size();i++)sum+=number(f.get("s."+subjects.get(i)),0,split?60:15)*(i==0?2:1);
        double exam=sum/(subjects.size()+1)/(split?60:15)*100,talent=0;
        for(int i=0;i<5;i++)talent+=(attrs[i]*.65+apt[i]*.35)*p.weights[i];
        double score=switch(route){case "star" -> exam*.5+(100-rank)*.25+talent*.25;case "apply" -> exam*.5+talent*.35+portfolio*.15;default -> exam*.7+talent*.3;};
        boolean qualified=!route.equals("star")||rank<=p.maxRank;
        boolean screened=exam>=p.examFloor&&talent>=p.talentFloor;
        double chance=qualified&&screened?Math.max(0.5,Math.min(switch(p.selectivity){case "medical"->18;case "pharmacy"->32;case "top"->40;case "elite"->55;default->98;},100/(1+Math.exp((p.threshold-score)/5)))):0;
        double draw=new Random(seed(f)*6364136223846793005L^p.id.hashCode()^route.hashCode()).nextDouble()*100;
        boolean accepted=draw<chance;
        json(ex,200,Map.of("accepted",accepted,"score",Math.round(score*10)/10.0,"chance",Math.round(chance*10)/10.0,
            "reason",!qualified?"在校排名未達門檻":!screened?exam<p.examFloor?"考試門檻未達標":"科系資質未達標":accepted?"錄取":"本輪未錄取"));
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
            String type = path.toString().endsWith(".css") ? "text/css" : path.toString().endsWith(".js") ? "text/javascript" : path.toString().endsWith(".json") ? "application/json" : path.toString().endsWith(".svg") ? "image/svg+xml" : path.toString().endsWith(".png") ? "image/png" : "text/html";
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
