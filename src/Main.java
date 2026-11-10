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
                case "/api/answer" -> json(ex,200,reviewAnswer(f.getOrDefault("mode",""),labels(f,f.getOrDefault("mode","")),f.get("id"),f.getOrDefault("label",""),f.get("answer"),f.get("ms"),"1".equals(f.get("timed"))).review);
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
            case "流行文化" -> List.of("校園趣聞","影視","動漫","體育","時事","音樂");
            case "生活推理" -> List.of("校園趣聞","國文","英文","數學","自然","歷史","地理","公民","藝術","常識");
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
            &&!(q.difficulty>2&&(q.subject.equals("英文")||q.subject.equals("數學")&&!q.id.startsWith("advanced-match-")&&!q.id.startsWith("math-concept-")&&!q.id.startsWith("match-bank-math-")))
            &&!(q.subject.equals("英文")&&List.of("Literary bookshelf","Authors and works").contains(q.theme))
            &&!(q.subject.equals("數學")&&List.of("數學史與解謎","數學史","典籍考古").contains(q.theme));
    }
    static String songKey(Question q) {
        if (!q.subject.equals("音樂")) return "";
        if(q.theme.equals("歌詞猜歌名"))return "song:"+q.options.get(Integer.parseInt(q.key));
        int start=q.text.indexOf('《'), end=q.text.indexOf('》',start+1);
        return start>=0&&end>start+1?"song:"+q.text.substring(start+1,end):"";
    }
    static String questionPrompt(Question q){
        return normalized(q.text).replaceAll("[\\p{P}\\p{S}]","");
    }
    static List<String> questionFingerprints(Question q){
        List<String> parts=new ArrayList<>();
        if(q.type.equals("match")){
            String[] keys=q.key.split(",");
            for(int i=0;i<keys.length;i++)parts.add(normalized(q.left.get(i))+"="+normalized(q.options.get(Integer.parseInt(keys[i]))));
            Collections.sort(parts);
            return List.of("pairs:"+String.join("|",parts));
        }
        if(q.type.equals("choice")){
            String answer=normalized(q.options.get(Integer.parseInt(q.key)));
            if(answer.matches("(?s).*\\p{L}{2}.*")){
                List<String> distractors=q.options.stream().map(Main::normalized).filter(option->!option.equals(answer)).sorted().toList();
                for(int i=0;i<distractors.size();i++){
                    for(int j=i+1;j<distractors.size();j++)parts.add("options:"+answer+"|"+distractors.get(i)+"|"+distractors.get(j));
                }
                return parts;
            }
        }
        return List.of();
    }
    static String questionCategory(Question q){
        if(q.subject.equals("校園趣聞"))return q.theme;
        if(q.subject.equals("體育")&&q.text.matches("(?s).*(棒球|職棒|投手|打者|壘).*"))return "棒球";
        if(q.theme.contains("麻將"))return "麻將";
        return q.subject+"："+q.theme;
    }
    static String termCategory(Question q){
        return switch(q.subject){
            case "校園趣聞" -> q.theme.equals("銀幕世界")?"影視":q.theme;
            case "地理" -> "臺灣旅行";
            case "常識" -> "麻將";
            case "影視" -> List.of("台劇","韓劇","泰劇","甄嬛傳").contains(q.theme)?q.theme:"影視";
            case "時事" -> q.theme.contains("中職")||q.text.contains("台灣大賽")?"棒球":q.theme.endsWith("新聞")&&!q.theme.equals("足球新聞")?"時事":"其他運動";
            case "音樂" -> q.theme.startsWith("K-pop")?"韓流":"歌曲";
            case "體育" -> questionCategory(q).equals("棒球")?"棒球":"其他運動";
            default -> q.subject;
        };
    }
    static boolean termQuestion(Question q){
        return List.of("校園趣聞","影視","動漫","體育","音樂","時事").contains(q.subject)
            ||q.theme.equals("臺灣走走")||q.theme.contains("麻將");
    }
    static void rememberQuestion(Question q,Set<String> used,Set<String> current,Set<String> facts,Map<String,Integer> categories){
        used.add(q.id);
        current.add(questionPrompt(q));
        facts.addAll(questionFingerprints(q));
        String song=songKey(q);
        if(!song.isEmpty())used.add(song);
        categories.merge(questionCategory(q),1,Integer::sum);
    }
    static Question pick(String label,String type,int level,Set<String> used,Set<String> seen,Set<String> current,Set<String> facts,Map<String,Integer> categories,Random random,String preferredTheme,boolean term,Map<String,Integer> termCounts,long paperSeed) {
        boolean logicFill=type.equals("fill")&&label.startsWith("數學");
        List<Question> candidates=QUESTIONS.stream().filter(q->(!logicFill||q.id.startsWith("math-logic-"))&&sources(label).contains(q.subject)&&q.type.equals(type)&&active(q)&&(!term||(
                (paperSeed%6==0||!q.theme.contains("麻將"))&&
                (paperSeed%4!=1||!q.theme.contains("柯南")&&!q.text.contains("柯南"))&&
                (paperSeed%4!=2||!termCategory(q).equals("棒球"))))
            &&!used.contains(q.id)&&!current.contains(questionPrompt(q))&&questionFingerprints(q).stream().noneMatch(facts::contains)&&!used.contains(songKey(q))).toList();
        if(candidates.isEmpty())throw new IllegalArgumentException("本科題庫不足，無法再抽出未作答的題目。");
        if(type.equals("match")&&label.startsWith("數學")){
            List<Question> tier=candidates.stream().filter(q->level==3?q.difficulty==3:q.id.startsWith("match-bank-math-b-")).toList();
            if(!tier.isEmpty())candidates=tier;
        }
        if(type.equals("match")){
            Map<String,Integer> recency=new HashMap<>();
            int index=0;
            for(String id:seen)recency.put(id,index++);
            List<Question> fresh=candidates.stream().filter(q->!recency.containsKey(q.id)).toList();
            if(!fresh.isEmpty())candidates=fresh;
            else{
                int oldest=candidates.stream().mapToInt(q->recency.get(q.id)).min().orElseThrow();
                candidates=candidates.stream().filter(q->recency.get(q.id)==oldest).toList();
            }
        }
        String focus=label.startsWith("數學")&&type.equals("choice")?"math-concept-":
            label.equals("國文")&&type.equals("match")&&paperSeed%4!=0?"chinese-modern-":"";
        if(!focus.isEmpty()){
            List<Question> preferred=candidates.stream().filter(q->q.id.startsWith(focus)||focus.equals("chinese-modern-")&&q.id.startsWith("match-bank-chinese-")).toList();
            if(!preferred.isEmpty())candidates=preferred;
        }
        if(term){
            Map<String,Integer> local=new HashMap<>();
            for(Question q:QUESTIONS){
                if(used.contains(q.id)&&q.type.equals("choice")&&termQuestion(q))local.merge(termCategory(q),1,Integer::sum);
            }
            List<Question> leisure=candidates.stream().filter(Main::termQuestion).toList();
            if(!leisure.isEmpty())candidates=leisure;
            int least=candidates.stream().mapToInt(q->local.getOrDefault(termCategory(q),0)).min().orElseThrow();
            candidates=candidates.stream().filter(q->local.getOrDefault(termCategory(q),0)==least).toList();
            int recent=candidates.stream().mapToInt(q->termCounts.getOrDefault(termCategory(q),0)).min().orElseThrow();
            candidates=candidates.stream().filter(q->termCounts.getOrDefault(termCategory(q),0)==recent).toList();
        }else if(preferredTheme.isEmpty()&&!type.equals("match")){
            int least=candidates.stream().mapToInt(q->categories.getOrDefault(questionCategory(q),0)).min().orElseThrow();
            candidates=candidates.stream().filter(q->categories.getOrDefault(questionCategory(q),0)==least).toList();
        }
        if(!type.equals("match")){
            List<Question> fresh=candidates.stream().filter(q->!seen.contains(q.id)).toList();
            if(!fresh.isEmpty())candidates=fresh;
        }
        List<Question> themed=candidates.stream().filter(q->q.theme.equals(preferredTheme)).toList();
        if(!themed.isEmpty())candidates=themed;
        int distance=candidates.stream().mapToInt(q->Math.abs(q.difficulty-(term&&q.theme.equals("柯南案卷")?2:level))).min().orElseThrow();
        List<Question> nearest=candidates.stream().filter(q->Math.abs(q.difficulty-(term&&q.theme.equals("柯南案卷")?2:level))==distance).toList();
        Question q=nearest.get(random.nextInt(nearest.size()));
        rememberQuestion(q,used,current,facts,categories);
        return q;
    }
    static void paper(HttpExchange ex,Map<String,String> f)throws IOException {
        String mode=f.getOrDefault("mode","");List<String> subjects=labels(f,mode);
        if(mode.equals("split")&&!List.of("star","apply").contains(f.getOrDefault("previousRoute","")))throw new IllegalArgumentException("先完成繁星或個申放榜，再參加分科。");
        String[] parts=f.getOrDefault("attrs","40,40,40,40,40").split(",");
        if(parts.length!=5)throw new IllegalArgumentException("需要五項能力值。");
        double[] attrs=Arrays.stream(parts).mapToDouble(x->number(x,0,100)).toArray();
        Set<String> used=new HashSet<>(List.of(f.getOrDefault("used","").split(","))),current=new HashSet<>();
        Set<String> seen=new LinkedHashSet<>(List.of(f.getOrDefault("seen","").split(",")));
        used.remove("");
        Set<String> facts=new HashSet<>();
        Map<String,Integer> categories=new HashMap<>();
        for(Question q:QUESTIONS)if(used.contains(q.id))rememberQuestion(q,used,current,facts,categories);
        Map<String,Integer> termCounts=new HashMap<>();
        String[] termHistory=f.getOrDefault("termHistory","").split(",");
        for(int i=Math.max(0,termHistory.length-72);i<termHistory.length;i++){
            String id=termHistory[i];
            Question q=QUESTIONS.stream().filter(row->row.id.equals(id)).findFirst().orElse(null);
            if(q!=null&&q.type.equals("choice")&&termQuestion(q))termCounts.merge(termCategory(q),1,Integer::sum);
        }
        List<Object> result=new ArrayList<>();
        long paperSeed=seed(f);
        Random r=new Random(paperSeed^mode.hashCode()^f.getOrDefault("round","0").hashCode()^subjects.toString().hashCode());
        int per=mode.equals("term")?1:3;
        for(String label:subjects){
            for(int j=0;j<per;j++){
                String type=mode.equals("term")?"choice":j==0?"choice":j==1?"match":label.equals("英文")?"choice":"fill";
                double ability=attrs[abilityIndex(label)];
                int level=mode.equals("term")?(ability<45&&integer(f.get("round"),0,5)<2?2:3):j==0?2:3;
                if(ability>=75||List.of("數學A","數學甲").contains(label))level=3;
                if(label.equals("英文"))level=2;
                if(label.startsWith("數學"))level=List.of("數學A","數學甲").contains(label)?3:2;
                String theme=label.equals("英文")?(j==1?(r.nextBoolean()?"Screen matching":"Grammar matching"):j==0?"Movie clues":"Grammar practice"):label.startsWith("數學")?(type.equals("choice")&&r.nextBoolean()?"數學家點名":""):"";
                Question q=pick(label,type,level,used,seen,current,facts,categories,r,theme,mode.equals("term"),termCounts,paperSeed);result.add(q.publicData(label));
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
    record AnswerResult(Question question,double score,Integer points,Map<String,Object> review){}
    static AnswerResult reviewAnswer(String mode,List<String> subjects,String id,String label,String answer,String time,boolean timed){
        Question q=QUESTIONS.stream().filter(x->x.id.equals(id)).findFirst().orElseThrow(()->new IllegalArgumentException("題目不存在。"));
        if(!subjects.contains(label)||!sources(label).contains(q.subject))throw new IllegalArgumentException("試題不屬於所選科目。");
        if(label.equals("英文")&&q.type.equals("fill"))throw new IllegalArgumentException("英文不使用填答題。");
        boolean choice=timed&&!mode.equals("term")&&q.type.equals("choice"),math=label.startsWith("數學");
        int limit=math?60000:30000,ms=choice?integer(time,0,limit):0;
        double score=choice&&ms>=limit?0:fraction(q,answer==null?"":answer);
        Map<String,Object> row=new LinkedHashMap<>(Map.of("id",id,"fraction",score,"correct",score==1,"answer",q.key,"explanation",q.explanation));
        Integer points=null;
        if(choice){
            int[] edges=math?new int[]{8000,15000,20000,30000}:new int[]{5000,8000,10000,15000};
            points=score==1?5-(int)Arrays.stream(edges).filter(edge->ms>edge).count():0;
            row.put("points",points);
        }
        return new AnswerResult(q,score,points,row);
    }
    static void grade(HttpExchange ex,Map<String,String> f)throws IOException {
        String mode=f.getOrDefault("mode","");List<String> subjects=labels(f,mode);
        String[] ids=f.getOrDefault("ids","").split(",");int count=mode.equals("term")?2:subjects.size()*3;
        if(ids.length!=count||new HashSet<>(List.of(ids)).size()!=count)throw new IllegalArgumentException("試卷題數不符或題號重複。");
        boolean timed=!mode.equals("term")&&"1".equals(f.get("timed"));
        Map<String,Double> earned=new LinkedHashMap<>(),possible=new LinkedHashMap<>();
        Map<String,Integer> counts=new HashMap<>(),points=new HashMap<>(),choices=new HashMap<>();
        List<Object> review=new ArrayList<>();int correct=0;double sum=0,weight=0;
        for(int i=0;i<count;i++){
            String label=f.getOrDefault("label"+i,"");
            AnswerResult answer=reviewAnswer(mode,subjects,ids[i],label,f.get("a"+i),f.get("ms"+i),timed);
            double score=answer.score,w=answer.question.difficulty;
            if(score==1)correct++;
            counts.merge(label,1,Integer::sum);
            sum+=score*w;weight+=w;
            if(answer.points!=null){
                points.merge(label,answer.points,Integer::sum);
                choices.merge(label,1,Integer::sum);
            }else{
                earned.merge(label,score*w,Double::sum);
                possible.merge(label,w,Double::sum);
            }
            review.add(answer.review);
        }
        int per=mode.equals("term")?1:3;
        if(subjects.stream().anyMatch(label->counts.getOrDefault(label,0)!=per))throw new IllegalArgumentException("各科題數不符。");
        if(mode.equals("term")){json(ex,200,Map.of("correct",correct,"exam",Math.round(sum/weight*100),"review",review));return;}
        Map<String,Integer> scores=new LinkedHashMap<>();int max=mode.equals("gsat")?15:60;
        for(String label:subjects){
            double total=possible.getOrDefault(label,0.0);
            double value=points.getOrDefault(label,0)+(total>0?earned.get(label)/total*(15-5*choices.getOrDefault(label,0)):0);
            scores.put(label,(int)Math.round(value*(max/15)));
        }
        if(mode.equals("gsat")&&f.containsKey("aptitude")){
            double[] aptitude=vector(f.get("aptitude")),attrs=vector(f.getOrDefault("attrs",""));
            Map<String,Integer> rawScores=new LinkedHashMap<>(scores);
            for(String label:subjects){
                int i=abilityIndex(label),raw=rawScores.get(label);
                double readiness=aptitude[i]*.65+attrs[i]*.35;
                if(readiness<55)scores.put(label,Math.max(0,raw-1));
                else if(readiness>=76&&raw>=4&&raw<14)scores.put(label,raw+1);
            }
            json(ex,200,Map.of("scores",scores,"rawScores",rawScores,"correct",correct,"review",review));
        }else json(ex,200,Map.of("scores",scores,"correct",correct,"review",review));
    }
    record Program(String id,String university,int group,double threshold,int maxRank,List<String> gsat,List<String> split,double[] weights,double examFloor,double talentFloor,String selectivity,Double applyFloor){}
    static final Map<String,Program> PROGRAMS=new HashMap<>();
    static{
        try{for(String line:Files.readAllLines(Path.of("data/programs.tsv"),StandardCharsets.UTF_8)){
            if(line.isBlank()||line.startsWith("#"))continue;String[] p=line.split("\\|",-1);
            PROGRAMS.put(p[0],new Program(p[0],p[1],Integer.parseInt(p[2]),Double.parseDouble(p[3]),Integer.parseInt(p[4]),List.of(p[5].split(",")),List.of(p[6].split(",")),Arrays.stream(p[7].split(",")).mapToDouble(Double::parseDouble).toArray(),Double.parseDouble(p[8]),Double.parseDouble(p[9]),p[10],p.length>11?Double.parseDouble(p[11]):null));
        }}catch(IOException e){throw new ExceptionInInitializerError("找不到data/programs.tsv。");}
    }
    static double[] vector(String value){String[] p=value.split(",");if(p.length!=5)throw new IllegalArgumentException("需要五項能力。");return Arrays.stream(p).mapToDouble(x->number(x,0,100)).toArray();}
    static double unit(double value){return Math.max(0,Math.min(1,value));}
    static int starRankLimit(Program p){
        if(List.of("ntu","nthu","nycu","ncku","nccu").contains(p.university))return 20;
        if(List.of("ncu","nchu","nsysu","ccu").contains(p.university))return 30;
        return p.maxRank;
    }
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
        boolean art=List.of("ntua","tnua","tnnua").contains(p.university);
        boolean apply=route.equals("apply");
        double examFloor=apply?(p.applyFloor!=null?p.applyFloor:art?55:Math.min(p.examFloor,94)):art?Math.min(p.examFloor,55):p.examFloor;
        if(apply&&"screen".equals(f.get("phase"))){
            boolean passed=exam>=examFloor;
            json(ex,200,Map.of("accepted",passed,"score",Math.round(exam*10)/10.0,"floor",examFloor,
                "chance",passed?100:0,"reason",passed?"通過一階":"未達一階學測門檻"));
            return;
        }
        double interview=apply?number(f.getOrDefault("interview","80"),0,100):0;
        double score=switch(route){
            case "apply" -> exam*.4+talent*.3+interview*.3;
            case "star" -> exam*.25+number(f.getOrDefault("schoolScore",String.valueOf(100-rank)),0,100)*.75;
            default -> art?exam*.25+talent*.75:exam*.7+talent*.3;
        };
        double talentFloor=art?Math.max(p.talentFloor,58):apply?0:p.talentFloor;
        boolean qualified=!route.equals("star")||rank<=starRankLimit(p);
        boolean screened=route.equals("star")?subjects.stream().allMatch(s->f.containsKey("s."+s)):exam>=examFloor&&talent>=talentFloor;
        boolean safety=apply&&"1".equals(f.get("safety"))&&screened&&exam>=100
            &&List.of("public","privateTech","private").contains(p.selectivity);
        double topSupport=apply&&p.selectivity.equals("top")
            ?unit((exam-85)/8)*unit((talent-48)/12)*unit((interview-74)/10):0;
        double threshold=p.threshold-9*topSupport;
        double cap=(switch(p.selectivity){case "medical"->18;case "pharmacy"->25;case "top"->35;case "midTech"->46;case "midOther"->57;case "public"->70;case "privateTech"->83;default->98;})+10*topSupport;
        double chance=safety?100:qualified&&screened?Math.max(.5,Math.min(cap,100/(1+Math.exp((threshold-score)/5)))):0;
        double draw=new Random(seed(f)*6364136223846793005L^p.id.hashCode()^route.hashCode()).nextDouble()*100;
        boolean accepted=draw<chance;
        json(ex,200,Map.of("accepted",accepted,"score",Math.round(score*10)/10.0,"chance",Math.round(chance*10)/10.0,
            "reason",safety?"滿級分備用錄取":!qualified?"在校排名未達門檻":!screened?route.equals("star")?"缺少採計考科":exam<examFloor?"考試門檻未達標":"科系資質未達標":accepted?"錄取":"本輪未錄取"));
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
